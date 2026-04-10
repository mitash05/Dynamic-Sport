import { useState, useMemo } from 'react';
import { Tag, Edit2, Info, History, ShoppingCart, Package, GitCompare, X, Check, Ruler, ChevronRight } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';
import { useStore, Product } from '../store';
import { useScrollLock } from '../hooks/useScrollLock';
import { format, parseISO } from 'date-fns';
import { Screen } from '../App';

interface ProductDetailProps {
  product: Product;
  onNavigate?: (screen: Screen, data?: any) => void;
}

export default function ProductDetail({ product, onNavigate }: ProductDetailProps) {
  const allProducts = useStore(state => state.products);
  const transactions = useStore(state => state.transactions);
  const recordSale = useStore(state => state.recordSale);
  const restockProduct = useStore(state => state.restockProduct);
  const updateProduct = useStore(state => state.updateProduct);

  const [showCompare, setShowCompare] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [actionQuantity, setActionQuantity] = useState<number>(1);
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [chartRange, setChartRange] = useState<'7d' | '30d' | '90d' | 'all'>('7d');
  const [showAllHistory, setShowAllHistory] = useState(false);

  useScrollLock(showCompare || showSaleModal || showRestockModal);

  const salesStats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthSales = transactions.filter(tx => {
      if (tx.productId !== product.id || tx.type !== 'sale') return false;
      const txDate = new Date(tx.date);
      return txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;
    });

    const unitsSoldThisMonth = monthSales.reduce((sum, tx) => sum + tx.quantity, 0);
    const totalRevenue = monthSales.reduce((sum, tx) => sum + (tx.quantity * tx.price), 0);
    const averageSellingPrice = unitsSoldThisMonth > 0 ? totalRevenue / unitsSoldThisMonth : 0;

    return { unitsSoldThisMonth, totalRevenue, averageSellingPrice };
  }, [transactions, product.id]);

  const toggleCompare = (id: string) => {
    if (compareIds.includes(id)) {
      setCompareIds(compareIds.filter(i => i !== id));
    } else if (compareIds.length < 3) {
      setCompareIds([...compareIds, id]);
    }
  };

  const compareProducts = [product, ...compareIds.map(id => allProducts.find(p => p.id === id)).filter(Boolean) as Product[]];

  const stockHistory = useMemo(() => {
    const filtered = transactions.filter(tx => tx.productId === product.id);
    const toShow = showAllHistory ? filtered : filtered.slice(0, 10);
    return toShow.map(tx => ({
        id: tx.id,
        date: format(parseISO(tx.date), 'MMM dd, yyyy HH:mm'),
        change: tx.type === 'sale' ? -tx.quantity : tx.quantity,
        reason: tx.reason || (tx.type === 'sale' ? 'Sale' : 'Restock'),
        type: tx.type === 'sale' ? 'out' : 'in',
        size: tx.size
      }));
  }, [transactions, product.id, showAllHistory]);

  const chartData = useMemo(() => {
    const productTxs = transactions.filter(tx => tx.productId === product.id).reverse();
    let currentStock = product.inventory;
    
    const data = [];
    const now = new Date();
    
    // Create a map of date (YYYY-MM-DD) to net change
    const changesByDate: Record<string, number> = {};
    productTxs.forEach(tx => {
      const d = tx.date.split('T')[0];
      const change = tx.type === 'sale' ? -tx.quantity : tx.quantity;
      changesByDate[d] = (changesByDate[d] || 0) + change;
    });

    let daysToShow = 7;
    if (chartRange === '30d') daysToShow = 30;
    else if (chartRange === '90d') daysToShow = 90;
    else if (chartRange === 'all') {
      if (productTxs.length > 0) {
        const oldestDate = new Date(productTxs[0].date);
        const diffTime = Math.abs(now.getTime() - oldestDate.getTime());
        daysToShow = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        daysToShow = Math.max(daysToShow, 7);
      } else {
        daysToShow = 7;
      }
    }

    // Work backwards from today
    let runningStock = currentStock;
    for (let i = 0; i < daysToShow; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      data.unshift({
        date: format(d, daysToShow > 30 ? 'MMM dd' : 'MMM dd'),
        stock: runningStock
      });
      
      // Subtract the change that happened on this day to get the stock at the start of the day
      if (changesByDate[dateStr]) {
        runningStock -= changesByDate[dateStr];
      }
    }
    
    return data;
  }, [transactions, product.inventory, product.id, chartRange]);

  const handleRecordSale = () => {
    if (product.inventory > 0) {
      if ((product.variants && product.variants.length > 0) || (product.sizes && Object.keys(product.sizes).length > 0)) {
        setShowSaleModal(true);
      } else {
        recordSale(product.id, 1, product.retail);
        toast.success(`Recorded sale of 1x ${product.name}`);
      }
    }
  };

  const submitSale = () => {
    if (product.variants && product.variants.length > 0 && selectedVariantId) {
      const variant = product.variants.find(v => v.id === selectedVariantId);
      if (variant && variant.inventory >= actionQuantity) {
        recordSale(product.id, actionQuantity, product.retail, variant.size, variant.id);
        toast.success(`Recorded sale of ${actionQuantity}x ${product.name} (${variant.color} / ${variant.size})`);
        setShowSaleModal(false);
        setSelectedVariantId('');
        setActionQuantity(1);
      }
    } else if (product.sizes && selectedSize && product.sizes[selectedSize] >= actionQuantity) {
      recordSale(product.id, actionQuantity, product.retail, selectedSize);
      toast.success(`Recorded sale of ${actionQuantity}x ${product.name} (Size ${selectedSize})`);
      setShowSaleModal(false);
      setSelectedSize('');
      setActionQuantity(1);
    } else if (!product.sizes && (!product.variants || product.variants.length === 0)) {
      recordSale(product.id, actionQuantity, product.retail);
      toast.success(`Recorded sale of ${actionQuantity}x ${product.name}`);
      setShowSaleModal(false);
      setActionQuantity(1);
    }
  };

  const handleRestock = () => {
    if ((product.variants && product.variants.length > 0) || (product.sizes && Object.keys(product.sizes).length > 0)) {
      setShowRestockModal(true);
    } else {
      restockProduct(product.id, 20, product.retail * 0.4);
      toast.success(`Restocked 20x ${product.name}`);
    }
  };

  const submitRestock = () => {
    if (product.variants && product.variants.length > 0 && selectedVariantId) {
      const variant = product.variants.find(v => v.id === selectedVariantId);
      if (variant) {
        restockProduct(product.id, actionQuantity, product.retail * 0.4, variant.size, variant.id);
        toast.success(`Restocked ${actionQuantity}x ${product.name} (${variant.color} / ${variant.size})`);
        setShowRestockModal(false);
        setSelectedVariantId('');
        setActionQuantity(1);
      }
    } else if (product.sizes && selectedSize) {
      restockProduct(product.id, actionQuantity, product.retail * 0.4, selectedSize);
      toast.success(`Restocked ${actionQuantity}x ${product.name} (Size ${selectedSize})`);
      setShowRestockModal(false);
      setSelectedSize('');
      setActionQuantity(1);
    } else if (!product.sizes && (!product.variants || product.variants.length === 0)) {
      restockProduct(product.id, actionQuantity, product.retail * 0.4);
      toast.success(`Restocked ${actionQuantity}x ${product.name}`);
      setShowRestockModal(false);
      setActionQuantity(1);
    }
  };

  const profitMargin = product.purchasePrice ? ((product.retail - product.purchasePrice) / product.retail * 100).toFixed(1) : null;

  // For the heatmap
  const variantMatrix = useMemo(() => {
    if (!product.variants || product.variants.length === 0) return null;
    const matrix: Record<string, Record<string, number>> = {};
    const sizes = new Set<string>();
    product.variants.forEach(v => {
      if (!matrix[v.color]) matrix[v.color] = {};
      matrix[v.color][v.size] = v.inventory;
      sizes.add(v.size);
    });
    return { matrix, sizes: Array.from(sizes).sort() };
  }, [product.variants]);

  // Determine which image to show
  const displayImage = useMemo(() => {
    if (selectedVariantId && product.variants) {
      const variant = product.variants.find(v => v.id === selectedVariantId);
      if (variant && variant.image) return variant.image;
    }
    return product.img;
  }, [selectedVariantId, product.variants, product.img]);

  return (
    <div className="space-y-12">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-500">
        <span 
          onClick={() => onNavigate?.('inventory')}
          className="hover:text-white cursor-pointer transition-colors"
        >
          Inventory
        </span>
        <ChevronRight size={14} />
        <span className="text-primary">{product.cat}</span>
        <ChevronRight size={14} />
        <span className="text-white/30">{product.name}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        <div className="relative group rounded-3xl overflow-hidden bg-surface-low aspect-square border border-white/5 sticky top-32">
          <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 z-10" />
          <img 
            src={displayImage} 
            alt={product.name} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
          <div className="absolute top-6 left-6 z-20">
            <span className="bg-background/80 backdrop-blur-md text-white font-label font-bold text-xs tracking-widest uppercase px-4 py-2 rounded-full border border-white/10">
              {product.cat}
            </span>
          </div>
        </div>

        <div className="space-y-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="font-label text-xs font-bold text-primary uppercase tracking-[0.2em]">{product.sku}</span>
              {product.inventory < 20 && (
                <span className="bg-error/20 text-error font-label font-bold text-[10px] tracking-widest uppercase px-2 py-1 rounded">Low Stock</span>
              )}
            </div>
            
            {(product.tags && product.tags.length > 0) && (
              <div className="flex flex-wrap gap-2 mb-4">
                {product.tags.map(tag => (
                  <span key={tag} className="bg-primary/20 text-primary px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <h1 className="font-headline font-black text-6xl md:text-8xl tracking-tighter uppercase leading-none mb-6">
              {product.name}
            </h1>
            <p className="font-body text-zinc-400 text-lg leading-relaxed">
              {product.desc || 'Premium performance gear engineered for maximum velocity and precision. Built with advanced materials for elite athletes and streetwear connoisseurs alike.'}
            </p>
          </div>

          <div className="flex flex-wrap gap-8 py-8 border-y border-white/10">
            <div>
              <span className="block font-label text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Retail Price</span>
              <span className="font-headline font-black text-4xl text-primary">${product.retail.toFixed(2)}</span>
            </div>
            <div>
              <span className="block font-label text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Current Stock</span>
              <span className="font-headline font-black text-4xl text-white">{product.inventory}</span>
            </div>
            <div>
              <span className="block font-label text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Units Sold (This Month)</span>
              <span className="font-headline font-black text-4xl text-white">{salesStats.unitsSoldThisMonth}</span>
            </div>
            <div>
              <span className="block font-label text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Total Revenue (This Month)</span>
              <span className="font-headline font-black text-4xl text-emerald-400">${salesStats.totalRevenue.toFixed(2)}</span>
            </div>
            <div>
              <span className="block font-label text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Avg Selling Price</span>
              <span className="font-headline font-black text-4xl text-white">${salesStats.averageSellingPrice.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <button 
              onClick={handleRecordSale}
              disabled={product.inventory <= 0}
              className="flex-1 bg-primary text-background px-8 py-4 rounded-full font-headline font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-primary-dim transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ShoppingCart size={20} />
              {product.inventory <= 0 ? 'Out of Stock' : 'Record Sale'}
            </button>
            <button 
              onClick={handleRestock}
              className="bg-surface-highest text-white px-8 py-4 rounded-full font-headline font-bold uppercase tracking-wider text-sm flex items-center gap-2 hover:bg-surface-high transition-all border border-white/10"
            >
              <Package size={18} />
              Restock
            </button>
            <button onClick={() => setShowCompare(true)} className="bg-surface-highest text-white px-8 py-4 rounded-full font-headline font-bold uppercase tracking-wider text-sm flex items-center gap-2 hover:bg-surface-high transition-all border border-white/10">
              <GitCompare size={18} />
              Compare
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {variantMatrix ? (
          <div className="md:col-span-3 bg-surface-low p-8 rounded-2xl border border-white/5 mb-6 overflow-x-auto">
            <Ruler className="text-primary mb-4" size={24} />
            <h3 className="font-headline font-bold text-xl uppercase mb-6">Variant Inventory Heatmap</h3>
            <div className="min-w-max">
              <div className="flex">
                <div className="w-32 shrink-0"></div>
                {variantMatrix.sizes.map(size => (
                  <div key={size} className="w-16 text-center font-bold text-xs text-zinc-500 uppercase tracking-widest pb-4">{size}</div>
                ))}
              </div>
              {Object.entries(variantMatrix.matrix).map(([color, sizes]) => (
                <div key={color} className="flex items-center mb-2">
                  <div className="w-32 shrink-0 font-bold text-sm text-white truncate pr-4">{color}</div>
                  {variantMatrix.sizes.map(size => {
                    const qty = sizes[size] || 0;
                    let bgColor = 'bg-surface-highest border-white/5';
                    let textColor = 'text-zinc-500';
                    if (qty > 10) { bgColor = 'bg-emerald-500/20 border-emerald-500/30'; textColor = 'text-emerald-400'; }
                    else if (qty > 0) { bgColor = 'bg-yellow-500/20 border-yellow-500/30'; textColor = 'text-yellow-400'; }
                    else { bgColor = 'bg-error/10 border-error/20'; textColor = 'text-error/50'; }
                    
                    return (
                      <div key={size} className={`w-16 h-12 flex items-center justify-center border rounded-lg mx-1 ${bgColor} transition-colors`}>
                        <span className={`font-bold text-sm ${textColor}`}>{qty}</span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        ) : product.sizes && Object.keys(product.sizes).length > 0 ? (
          <div className="md:col-span-3 bg-surface-low p-8 rounded-2xl border border-white/5 mb-6">
            <Ruler className="text-primary mb-4" size={24} />
            <h3 className="font-headline font-bold text-xl uppercase mb-4">Size Availability</h3>
            <div className="flex flex-wrap gap-4">
              {Object.entries(product.sizes).map(([size, qty]) => (
                <div key={size} className={`flex flex-col items-center justify-center p-4 rounded-xl border ${qty > 0 ? 'bg-surface-highest border-white/10' : 'bg-surface border-error/20 opacity-50'} min-w-[80px]`}>
                  <span className="font-headline font-bold text-xl text-white">{size}</span>
                  <span className={`font-label text-xs font-bold uppercase tracking-widest mt-1 ${qty > 0 ? 'text-primary' : 'text-error'}`}>{qty} left</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="bg-surface-low p-8 rounded-2xl border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <Tag className="text-primary" size={24} />
            <button onClick={() => setIsEditingTags(!isEditingTags)} className="text-zinc-500 hover:text-white transition-colors">
              <Edit2 size={16} />
            </button>
          </div>
          <h3 className="font-headline font-bold text-xl uppercase mb-4">Categorization & Tags</h3>
          <p className="text-zinc-400 font-body text-sm mb-4">Primary category: <strong className="text-white">{product.cat}</strong>.</p>
          
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {(product.tags || []).map(tag => (
                <span key={tag} className="bg-primary/20 text-primary px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1">
                  {tag}
                  {isEditingTags && (
                    <button onClick={() => updateProduct(product.id, { tags: (product.tags || []).filter(t => t !== tag) })} className="hover:text-white transition-colors ml-1">
                      <X size={12} />
                    </button>
                  )}
                </span>
              ))}
              {(!product.tags || product.tags.length === 0) && !isEditingTags && (
                <span className="text-zinc-500 text-sm italic">No tags added</span>
              )}
            </div>
            
            {isEditingTags && (
              <input 
                type="text" 
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    const newTag = tagInput.trim().toLowerCase();
                    if (newTag && !(product.tags || []).includes(newTag)) {
                      updateProduct(product.id, { tags: [...(product.tags || []), newTag] });
                    }
                    setTagInput('');
                  }
                }}
                className="w-full bg-surface-highest border border-transparent focus:border-primary/50 rounded-lg px-3 py-2 text-white outline-none text-sm" 
                placeholder="Add tag (Press Enter)" 
              />
            )}
          </div>
        </div>
        <div className="bg-surface-low p-8 rounded-2xl border border-white/5">
          <Info className="text-primary mb-4" size={24} />
          <h3 className="font-headline font-bold text-xl uppercase mb-2">Specifications</h3>
          <ul className="text-zinc-400 font-body text-sm space-y-2">
            <li>Colorway: <strong className="text-white">{product.colorway || 'Standard'}</strong></li>
            <li>Release: <strong className="text-white">{product.releaseDate || 'TBD'}</strong></li>
            <li>Material: <strong className="text-white">{product.material || 'Synthetic / Mesh'}</strong></li>
            <li>Weight: <strong className="text-white">{product.weight || 'N/A'}</strong></li>
            <li>Warranty: <strong className="text-white">{product.warranty || 'Standard'}</strong></li>
          </ul>
        </div>
        <div className="bg-surface-low p-8 rounded-2xl border border-white/5">
          <Edit2 className="text-primary mb-4" size={24} />
          <h3 className="font-headline font-bold text-xl uppercase mb-2">Logistics & Details</h3>
          <ul className="text-zinc-400 font-body text-sm space-y-2">
            <li>Supplier: <strong className="text-white">{product.supplier || 'Unknown'}</strong></li>
            <li>Purchase Price: <strong className="text-white">{product.purchasePrice ? `$${product.purchasePrice.toFixed(2)}` : 'N/A'}</strong></li>
            <li>Profit Margin: <strong className="text-emerald-400">{profitMargin ? `${profitMargin}%` : 'N/A'}</strong></li>
            <li>Auto-reorder at: <strong className="text-white">{product.threshold} units</strong></li>
            {product.notes && <li className="pt-2 mt-2 border-t border-white/10 italic">"{product.notes}"</li>}
          </ul>
        </div>
      </div>

      <section className="bg-surface-high p-8 rounded-xl mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <h4 className="font-headline font-bold text-xl uppercase flex items-center gap-3">
            <History className="text-primary" size={24} />
            Stock Level Trends
          </h4>
          <div className="flex gap-2 bg-surface-highest p-1 rounded-lg border border-white/5">
            {(['7d', '30d', '90d', 'all'] as const).map(range => (
              <button
                key={range}
                onClick={() => setChartRange(range)}
                className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-widest transition-all ${chartRange === range ? 'bg-primary text-background shadow-lg' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
        
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
              <XAxis 
                dataKey="date" 
                stroke="#ffffff50" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
                dy={10}
              />
              <YAxis 
                stroke="#ffffff50" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
                dx={-10}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#141414', borderColor: '#ffffff20', borderRadius: '8px' }}
                itemStyle={{ color: '#ccff00', fontWeight: 'bold' }}
              />
              <Line 
                type="monotone" 
                dataKey="stock" 
                stroke="#ccff00" 
                strokeWidth={3}
                dot={{ r: 4, fill: '#141414', stroke: '#ccff00', strokeWidth: 2 }}
                activeDot={{ r: 6, fill: '#ccff00' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="bg-surface-high p-8 rounded-xl">
        <h4 className="font-headline font-bold text-xl uppercase mb-6 flex items-center gap-3">
          <Package className="text-primary" size={24} />
          Inventory Activity Log
        </h4>
        <div className="space-y-4">
          {stockHistory.map(record => (
            <div key={record.id} className="flex justify-between items-center border-b border-white/5 pb-4 last:border-0 last:pb-0">
              <div>
                <p className="font-bold text-white text-sm md:text-base">
                  {record.reason} {record.size && <span className="text-primary ml-2 bg-primary/10 px-2 py-0.5 rounded text-xs">Size {record.size}</span>}
                </p>
                <p className="text-[10px] md:text-xs text-zinc-500 font-label uppercase tracking-widest mt-1">{record.date}</p>
              </div>
              <div className={`font-headline font-bold text-xl md:text-2xl ${record.type === 'in' ? 'text-emerald-400' : 'text-white'}`}>
                {record.change > 0 ? '+' : ''}{record.change}
              </div>
            </div>
          ))}
        </div>
        
        {transactions.filter(tx => tx.productId === product.id).length > 10 && (
          <button 
            onClick={() => setShowAllHistory(!showAllHistory)}
            className="w-full mt-6 py-4 border border-white/10 rounded-xl text-sm font-bold uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-white/5 transition-all"
          >
            {showAllHistory ? 'Show Less' : 'View All History'}
          </button>
        )}
      </section>

      {showCompare && (
        <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-xl flex flex-col p-6 overflow-y-auto">
          <div className="max-w-7xl mx-auto w-full flex-grow flex flex-col">
            <div className="flex justify-between items-center mb-8">
              <h2 className="font-headline font-black text-4xl uppercase tracking-tighter">Compare Assets</h2>
              <button onClick={() => setShowCompare(false)} className="p-3 bg-surface-highest rounded-full hover:bg-surface-high text-white transition-all">
                <X size={24} />
              </button>
            </div>

            <div className="mb-8">
              <p className="font-label text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Select up to 3 additional products to compare</p>
              <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
                {allProducts.filter(p => p.id !== product.id).map(p => (
                  <button 
                    key={p.id}
                    onClick={() => toggleCompare(p.id)}
                    className={`flex-shrink-0 flex items-center gap-3 p-2 pr-4 rounded-full border transition-all ${compareIds.includes(p.id) ? 'bg-primary/10 border-primary text-primary' : 'bg-surface-high border-white/10 text-zinc-400 hover:border-white/30'}`}
                  >
                    <img src={p.img} alt={p.name} className="w-8 h-8 rounded-full object-cover" />
                    <span className="font-bold text-sm whitespace-nowrap">{p.name}</span>
                    {compareIds.includes(p.id) && <Check size={16} />}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-surface-low rounded-2xl border border-white/10 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr>
                    <th className="p-6 border-b border-white/5 font-label text-xs text-zinc-500 uppercase tracking-widest w-48">Specification</th>
                    {compareProducts.map(p => (
                      <th key={p.id} className="p-6 border-b border-l border-white/5 min-w-[250px]">
                        <img src={p.img} alt={p.name} className="w-full h-40 object-cover rounded-xl mb-4" />
                        <h4 className="font-headline font-bold text-xl uppercase">{p.name}</h4>
                        <p className="text-xs text-zinc-500 font-label">{p.cat}</p>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="font-body text-sm">
                  <tr>
                    <td className="p-6 border-b border-white/5 font-bold text-zinc-400">SKU</td>
                    {compareProducts.map(p => <td key={p.id} className="p-6 border-b border-l border-white/5">{p.sku}</td>)}
                  </tr>
                  <tr>
                    <td className="p-6 border-b border-white/5 font-bold text-zinc-400">Retail Price</td>
                    {compareProducts.map(p => <td key={p.id} className="p-6 border-b border-l border-white/5 font-headline font-bold text-primary text-lg">${p.retail.toFixed(2)}</td>)}
                  </tr>
                  <tr>
                    <td className="p-6 border-b border-white/5 font-bold text-zinc-400">Current Stock</td>
                    {compareProducts.map(p => <td key={p.id} className={`p-6 border-b border-l border-white/5 font-headline font-bold text-lg ${p.inventory <= p.threshold ? 'text-error' : 'text-white'}`}>{p.inventory} Units</td>)}
                  </tr>
                  <tr>
                    <td className="p-6 border-b border-white/5 font-bold text-zinc-400">Colorway</td>
                    {compareProducts.map(p => <td key={p.id} className="p-6 border-b border-l border-white/5">{p.colorway || 'Standard'}</td>)}
                  </tr>
                  <tr>
                    <td className="p-6 border-b border-white/5 font-bold text-zinc-400">Material</td>
                    {compareProducts.map(p => <td key={p.id} className="p-6 border-b border-l border-white/5">{p.material || 'Synthetic / Mesh'}</td>)}
                  </tr>
                  <tr>
                    <td className="p-6 border-b border-white/5 font-bold text-zinc-400">Weight</td>
                    {compareProducts.map(p => <td key={p.id} className="p-6 border-b border-l border-white/5">{p.weight || 'N/A'}</td>)}
                  </tr>
                  <tr>
                    <td className="p-6 border-b border-white/5 font-bold text-zinc-400">Warranty</td>
                    {compareProducts.map(p => <td key={p.id} className="p-6 border-b border-l border-white/5">{p.warranty || 'Standard'}</td>)}
                  </tr>
                  <tr>
                    <td className="p-6 border-white/5 font-bold text-zinc-400">Release Date</td>
                    {compareProducts.map(p => <td key={p.id} className="p-6 border-l border-white/5">{p.releaseDate || 'TBD'}</td>)}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Sale Modal */}
      {showSaleModal && (
        <div className="fixed inset-0 z-[100] bg-background/90 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-surface-low border border-white/10 p-8 rounded-3xl max-w-md w-full animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-headline font-bold text-2xl uppercase">Record Sale</h3>
              <button onClick={() => setShowSaleModal(false)} className="text-zinc-500 hover:text-white"><X size={24} /></button>
            </div>
            
            <div className="space-y-6">
              {product.variants && product.variants.length > 0 ? (
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Select Variant</label>
                  <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
                    {product.variants.map(v => (
                      <button
                        key={v.id}
                        disabled={v.inventory <= 0}
                        onClick={() => setSelectedVariantId(v.id)}
                        className={`flex justify-between items-center p-4 rounded-xl border transition-all ${selectedVariantId === v.id ? 'bg-primary text-background border-primary' : v.inventory > 0 ? 'bg-surface-highest text-white border-white/10 hover:border-white/30' : 'bg-surface text-zinc-600 border-white/5 opacity-50 cursor-not-allowed'}`}
                      >
                        <span className="font-bold">{v.color} / {v.size}</span>
                        <span className="text-xs opacity-70">{v.inventory} left</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : product.sizes && Object.keys(product.sizes).length > 0 ? (
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Select Size</label>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(product.sizes).map(([size, qty]) => (
                      <button
                        key={size}
                        disabled={qty <= 0}
                        onClick={() => setSelectedSize(size)}
                        className={`px-4 py-2 rounded-lg font-headline font-bold text-lg border transition-all ${selectedSize === size ? 'bg-primary text-background border-primary' : qty > 0 ? 'bg-surface-highest text-white border-white/10 hover:border-white/30' : 'bg-surface text-zinc-600 border-white/5 opacity-50 cursor-not-allowed'}`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Quantity</label>
                <input 
                  type="number" 
                  min="1" 
                  max={selectedVariantId && product.variants ? product.variants.find(v => v.id === selectedVariantId)?.inventory : selectedSize && product.sizes ? product.sizes[selectedSize] : product.inventory}
                  value={actionQuantity} 
                  onChange={e => setActionQuantity(Number(e.target.value))}
                  className="w-full bg-surface-highest border border-transparent focus:border-primary/50 rounded-xl px-4 py-3 text-white font-headline font-bold text-xl outline-none"
                />
              </div>

              <button 
                onClick={submitSale}
                disabled={
                  (product.variants && product.variants.length > 0 && (!selectedVariantId || actionQuantity < 1 || (product.variants.find(v => v.id === selectedVariantId)?.inventory || 0) < actionQuantity)) ||
                  (product.sizes && Object.keys(product.sizes).length > 0 && (!selectedSize || actionQuantity < 1 || (product.sizes[selectedSize] || 0) < actionQuantity)) ||
                  (!product.variants?.length && !product.sizes && actionQuantity < 1)
                }
                className="w-full bg-primary text-background py-4 rounded-xl font-headline font-black uppercase tracking-widest text-lg hover:bg-primary-dim transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm Sale
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restock Modal */}
      {showRestockModal && (
        <div className="fixed inset-0 z-[100] bg-background/90 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-surface-low border border-white/10 p-8 rounded-3xl max-w-md w-full animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-headline font-bold text-2xl uppercase">Restock Item</h3>
              <button onClick={() => setShowRestockModal(false)} className="text-zinc-500 hover:text-white"><X size={24} /></button>
            </div>
            
            <div className="space-y-6">
              {product.variants && product.variants.length > 0 ? (
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Select Variant</label>
                  <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
                    {product.variants.map(v => (
                      <button
                        key={v.id}
                        onClick={() => setSelectedVariantId(v.id)}
                        className={`flex justify-between items-center p-4 rounded-xl border transition-all ${selectedVariantId === v.id ? 'bg-primary text-background border-primary' : 'bg-surface-highest text-white border-white/10 hover:border-white/30'}`}
                      >
                        <span className="font-bold">{v.color} / {v.size}</span>
                        <span className="text-xs opacity-70">{v.inventory} left</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : product.sizes && Object.keys(product.sizes).length > 0 ? (
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Select Size</label>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(product.sizes).map(([size]) => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={`px-4 py-2 rounded-lg font-headline font-bold text-lg border transition-all ${selectedSize === size ? 'bg-primary text-background border-primary' : 'bg-surface-highest text-white border-white/10 hover:border-white/30'}`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Quantity to Add</label>
                <input 
                  type="number" 
                  min="1" 
                  value={actionQuantity} 
                  onChange={e => setActionQuantity(Number(e.target.value))}
                  className="w-full bg-surface-highest border border-transparent focus:border-primary/50 rounded-xl px-4 py-3 text-white font-headline font-bold text-xl outline-none"
                />
              </div>

              <button 
                onClick={submitRestock}
                disabled={
                  (product.variants && product.variants.length > 0 && (!selectedVariantId || actionQuantity < 1)) ||
                  (product.sizes && Object.keys(product.sizes).length > 0 && (!selectedSize || actionQuantity < 1)) ||
                  (!product.variants?.length && !product.sizes && actionQuantity < 1)
                }
                className="w-full bg-white text-background py-4 rounded-xl font-headline font-black uppercase tracking-widest text-lg hover:bg-zinc-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm Restock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

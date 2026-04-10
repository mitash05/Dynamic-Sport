import React, { useState, useMemo } from 'react';
import { Search, Edit2, Download, ChevronDown, AlertTriangle, Check, X, ChevronLeft, ChevronRight, ArrowRightLeft, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { Screen } from '../App';
import { useStore, Product } from '../store';
import { useScrollLock } from '../hooks/useScrollLock';

interface InventoryProps {
  onNavigate: (screen: Screen, data?: any) => void;
}

export default function Inventory({ onNavigate }: InventoryProps) {
  const products = useStore(state => state.products);
  const updateProduct = useStore(state => state.updateProduct);
  const recordAdjustment = useStore(state => state.recordAdjustment);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('name-asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ inventory: 0, retail: 0, threshold: 0 });
  const [adjustModal, setAdjustModal] = useState<{isOpen: boolean, product: Product | null}>({isOpen: false, product: null});
  const [adjustForm, setAdjustForm] = useState({ type: 'remove', qty: 1, reason: '', size: '' });
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);

  useScrollLock(adjustModal.isOpen || !!quickViewProduct);

  const processedItems = useMemo(() => {
    let filtered = products.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            item.sku.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || item.cat.toLowerCase() === selectedCategory.toLowerCase();
      return matchesSearch && matchesCategory;
    });

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name-asc': return a.name.localeCompare(b.name);
        case 'name-desc': return b.name.localeCompare(a.name);
        case 'price-asc': return a.retail - b.retail;
        case 'price-desc': return b.retail - a.retail;
        case 'stock-asc': return a.inventory - b.inventory;
        case 'stock-desc': return b.inventory - a.inventory;
        default: return 0;
      }
    });
  }, [products, searchQuery, selectedCategory, sortBy]);

  const totalPages = Math.ceil(processedItems.length / itemsPerPage);
  const paginatedItems = processedItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const lowStockItems = useMemo(() => {
    return products.filter(item => item.inventory <= item.threshold);
  }, [products]);

  const exportToCSV = () => {
    const headers = ['ID', 'Category', 'Name', 'SKU', 'Inventory', 'Retail Price', 'Alert Threshold'];
    const rows = processedItems.map(item => [
      item.id,
      item.cat,
      `"${item.name}"`,
      item.sku,
      item.inventory,
      item.retail,
      item.threshold
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'dynamic_sport_inventory.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleEditClick = (e: React.MouseEvent, item: Product) => {
    e.stopPropagation();
    setEditingId(item.id);
    setEditForm({ inventory: item.inventory, retail: item.retail, threshold: item.threshold });
  };

  const handleSaveEdit = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    updateProduct(id, editForm);
    setEditingId(null);
  };

  const handleCancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  return (
    <div className="space-y-12">
      <header>
        <h2 className="font-headline font-black text-5xl md:text-7xl tracking-tighter uppercase leading-none mb-4">
          Current <span className="text-primary">Stock</span>
        </h2>
        <p className="font-body text-zinc-400 max-w-md text-sm md:text-base opacity-80">
          Precision inventory management for high-velocity performance gear. Track, filter, and manage your elite assets.
        </p>
      </header>

      <section className="space-y-6">
        <div className="relative group">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search className="text-primary/50 group-focus-within:text-primary transition-colors" size={24} />
          </div>
          <input 
            type="text" 
            placeholder="SEARCH INVENTORY..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface-high border-none rounded-xl py-5 pl-12 pr-6 font-headline font-bold tracking-widest text-white focus:ring-2 focus:ring-primary/40 transition-all placeholder:text-white/30 uppercase outline-none"
          />
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between bg-surface-low p-4 rounded-xl border border-white/5">
          <div className="flex flex-wrap gap-4 items-center w-full md:w-auto">
            <div className="relative w-full md:w-auto">
              <select 
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full md:w-auto appearance-none bg-surface-highest text-white font-label font-bold text-xs tracking-widest uppercase rounded-full px-6 py-3 pr-10 border border-white/5 outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
              >
                <option value="All">All Categories</option>
                <option value="Sneakers">Sneakers</option>
                <option value="Apparel">Apparel</option>
                <option value="Accessories">Accessories</option>
              </select>
              <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            </div>

            <div className="relative w-full md:w-auto">
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full md:w-auto appearance-none bg-surface-highest text-white font-label font-bold text-xs tracking-widest uppercase rounded-full px-6 py-3 pr-10 border border-white/5 outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
              >
                <option value="name-asc">Sort: Name (A-Z)</option>
                <option value="name-desc">Sort: Name (Z-A)</option>
                <option value="price-asc">Sort: Price (Low-High)</option>
                <option value="price-desc">Sort: Price (High-Low)</option>
                <option value="stock-asc">Sort: Stock (Low-High)</option>
                <option value="stock-desc">Sort: Stock (High-Low)</option>
              </select>
              <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            </div>
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            <button 
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.csv';
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      const text = event.target?.result as string;
                      // Basic CSV parsing for demo
                      const rows = text.split('\n').slice(1);
                      const newProducts: Product[] = rows.filter(r => r.trim()).map(row => {
                        const [id, cat, name, sku, inventory, retail, threshold] = row.split(',');
                        return {
                          id: id || `imp-${Math.random()}`,
                          name: name?.replace(/"/g, '') || 'Imported Product',
                          cat: cat || 'Accessories',
                          sku: sku || `IMP-${Math.floor(Math.random() * 10000)}`,
                          inventory: parseInt(inventory) || 0,
                          retail: parseFloat(retail) || 0,
                          threshold: parseInt(threshold) || 5,
                          img: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80',
                          brand: 'Imported',
                          colorway: 'Standard',
                          purchasePrice: (parseFloat(retail) || 0) * 0.5,
                          supplier: 'Imported Supplier'
                        };
                      });
                      useStore.getState().bulkImport(newProducts);
                      toast.success(`Successfully imported ${newProducts.length} products.`);
                    };
                    reader.readAsText(file);
                  }
                };
                input.click();
              }}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-surface-highest text-white font-label font-bold text-xs tracking-widest uppercase transition-all hover:bg-white/10 border border-white/10"
            >
              Bulk Import
            </button>
            <button 
              onClick={exportToCSV}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-primary/10 text-primary font-label font-bold text-xs tracking-widest uppercase transition-all hover:bg-primary/20 border border-primary/20"
            >
              <Download size={16} />
              Export CSV
            </button>
          </div>
        </div>
      </section>

      {lowStockItems.length > 0 && (
        <section className="bg-error-container/20 border border-error/20 rounded-xl p-6">
          <h4 className="font-headline font-bold text-error uppercase tracking-tight mb-4 flex items-center gap-2">
            <AlertTriangle size={20} />
            Critical Low Stock Alerts
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {lowStockItems.map(item => (
              <div 
                key={`low-${item.id}`}
                onClick={() => onNavigate('detail', item)}
                className="bg-surface-high p-4 rounded-lg flex items-center gap-4 border border-error/10 cursor-pointer hover:bg-surface-highest transition-colors"
              >
                <div className="w-16 h-16 rounded bg-surface-lowest overflow-hidden shrink-0">
                  <img src={item.img} alt={item.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-grow">
                  <h5 className="font-bold text-white text-sm leading-tight truncate">{item.name}</h5>
                  <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wide mt-1">{item.sku}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-error font-headline font-bold text-xl">{item.inventory}</span>
                  <p className="text-[10px] text-error/70 font-bold uppercase">Left</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4 sm:gap-6">
        {paginatedItems.length > 0 ? (
          paginatedItems.map((item) => (
            <div 
              key={item.id} 
              onClick={() => onNavigate('detail', item)}
              className="group relative flex flex-col lg:flex-row items-start lg:items-center gap-4 sm:gap-6 p-4 sm:p-6 bg-surface-low hover:bg-surface transition-all duration-300 rounded-2xl cursor-pointer border border-transparent hover:border-white/5 shadow-sm hover:shadow-xl"
            >
              <div className="w-full lg:w-32 lg:h-32 aspect-square lg:aspect-auto bg-surface-highest rounded-xl overflow-hidden shrink-0">
                <img src={item.img} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
              </div>
              
              <div className="flex flex-col lg:flex-row flex-grow justify-between items-start lg:items-center w-full gap-4 sm:gap-6">
                <div className="space-y-1 w-full lg:w-auto">
                  <div className="flex items-center justify-between lg:block">
                    <span className="inline-block font-label font-bold text-[10px] tracking-[0.15em] text-primary uppercase">{item.cat}</span>
                    <span className="lg:hidden bg-surface-highest px-2 py-1 rounded text-[10px] font-mono text-zinc-500">{item.sku}</span>
                  </div>
                  <h3 className="font-headline font-bold text-xl sm:text-2xl lg:text-3xl tracking-tight uppercase leading-tight">{item.name}</h3>
                  <p className="hidden lg:block font-body text-zinc-500 text-sm">SKU: {item.sku}</p>
                  {(item.tags && item.tags.length > 0) && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {item.tags.map(tag => (
                        <span key={tag} className="bg-primary/10 text-primary px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                
                {editingId === item.id ? (
                  <div className="flex flex-wrap gap-3 sm:gap-4 items-center w-full lg:w-auto" onClick={e => e.stopPropagation()}>
                    <div className="flex flex-col flex-1 sm:flex-none">
                      <span className="font-label text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Inventory</span>
                      <input 
                        type="number" 
                        value={editForm.inventory} 
                        onChange={e => setEditForm({...editForm, inventory: Number(e.target.value)})} 
                        className="w-full sm:w-20 bg-surface-highest text-white px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-primary/50 font-headline font-bold text-sm" 
                      />
                    </div>
                    <div className="flex flex-col flex-1 sm:flex-none">
                      <span className="font-label text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Retail ($)</span>
                      <input 
                        type="number" 
                        value={editForm.retail} 
                        onChange={e => setEditForm({...editForm, retail: Number(e.target.value)})} 
                        className="w-full sm:w-24 bg-surface-highest text-primary px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-primary/50 font-headline font-bold text-sm" 
                      />
                    </div>
                    <div className="flex flex-col flex-1 sm:flex-none">
                      <span className="font-label text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Alert</span>
                      <input 
                        type="number" 
                        value={editForm.threshold} 
                        onChange={e => setEditForm({...editForm, threshold: Number(e.target.value)})} 
                        className="w-full sm:w-24 bg-surface-highest text-error px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-error/50 font-headline font-bold text-sm" 
                      />
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto justify-end sm:mt-0 sm:self-end">
                      <button onClick={(e) => handleSaveEdit(e, item.id)} className="p-2.5 rounded-full bg-primary text-background hover:bg-primary-dim transition-all">
                        <Check size={18} />
                      </button>
                      <button onClick={handleCancelEdit} className="p-2.5 rounded-full bg-surface-highest text-zinc-400 hover:text-white transition-all">
                        <X size={18} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row lg:flex-row items-start sm:items-center justify-between w-full lg:w-auto gap-4 sm:gap-8">
                    <div className="flex gap-6 sm:gap-8 w-full sm:w-auto">
                      <div className="flex flex-col">
                        <span className="font-label text-[10px] text-zinc-500 uppercase tracking-widest">Inventory</span>
                        <span className={`font-headline font-bold text-lg sm:text-xl ${item.inventory <= item.threshold ? 'text-error' : 'text-white'}`}>
                          {item.inventory} <span className="text-[10px] opacity-50">PCS</span>
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-label text-[10px] text-zinc-500 uppercase tracking-widest">Retail</span>
                        <span className="font-headline font-bold text-lg sm:text-xl text-primary">${item.retail.toFixed(2)}</span>
                      </div>
                      <div className="hidden sm:flex flex-col">
                        <span className="font-label text-[10px] text-zinc-500 uppercase tracking-widest">Alert</span>
                        <span className="font-headline font-bold text-lg sm:text-xl text-zinc-400">&lt; {item.threshold}</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 w-full sm:w-auto justify-end">
                      <button onClick={(e) => {
                        e.stopPropagation();
                        setQuickViewProduct(item);
                      }} className="p-2.5 sm:p-3 rounded-xl bg-surface-highest hover:bg-primary hover:text-surface-low transition-all text-zinc-400 group/btn" title="Quick View">
                        <Eye size={18} className="group-hover/btn:scale-110 transition-transform" />
                      </button>
                      <button onClick={(e) => handleEditClick(e, item)} className="p-2.5 sm:p-3 rounded-xl bg-surface-highest hover:bg-primary hover:text-surface-low transition-all text-zinc-400 group/btn" title="Edit Details">
                        <Edit2 size={18} className="group-hover/btn:scale-110 transition-transform" />
                      </button>
                      <button onClick={(e) => {
                        e.stopPropagation();
                        setAdjustModal({ isOpen: true, product: item });
                        setAdjustForm({ type: 'remove', qty: 1, reason: '', size: item.sizes && Object.keys(item.sizes).length > 0 ? Object.keys(item.sizes)[0] : '' });
                      }} className="p-2.5 sm:p-3 rounded-xl bg-surface-highest hover:bg-primary hover:text-surface-low transition-all text-zinc-400 group/btn" title="Stock Adjustment">
                        <ArrowRightLeft size={18} className="group-hover/btn:scale-110 transition-transform" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="py-12 text-center text-zinc-500 font-body">
            No items found matching your criteria.
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-surface-low p-4 rounded-xl border border-white/5 mt-8">
          <button 
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-2 rounded-full bg-surface-highest text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary hover:text-background transition-all"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="font-label text-xs font-bold text-zinc-400 uppercase tracking-widest">
            Page {currentPage} of {totalPages}
          </span>
          <button 
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-2 rounded-full bg-surface-highest text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary hover:text-background transition-all"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}

      {/* Adjustment Modal */}
      {adjustModal.isOpen && adjustModal.product && (
        <div className="fixed inset-0 z-[100] bg-background/90 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-surface-low border border-white/10 p-8 rounded-3xl max-w-md w-full animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-headline font-bold text-2xl uppercase">Stock Adjustment</h3>
              <button onClick={() => setAdjustModal({isOpen: false, product: null})} className="text-zinc-500 hover:text-white"><X size={24} /></button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Adjustment Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setAdjustForm({...adjustForm, type: 'add'})}
                    className={`py-3 rounded-xl font-headline font-bold uppercase tracking-wider border transition-all ${adjustForm.type === 'add' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' : 'bg-surface-highest text-zinc-400 border-transparent hover:border-white/10'}`}
                  >
                    Add Stock
                  </button>
                  <button
                    onClick={() => setAdjustForm({...adjustForm, type: 'remove'})}
                    className={`py-3 rounded-xl font-headline font-bold uppercase tracking-wider border transition-all ${adjustForm.type === 'remove' ? 'bg-error/20 text-error border-error/50' : 'bg-surface-highest text-zinc-400 border-transparent hover:border-white/10'}`}
                  >
                    Remove Stock
                  </button>
                </div>
              </div>

              {adjustModal.product.sizes && Object.keys(adjustModal.product.sizes).length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Select Size</label>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(adjustModal.product.sizes).map(([size, qty]) => (
                      <button
                        key={size}
                        onClick={() => setAdjustForm({...adjustForm, size})}
                        className={`px-4 py-2 rounded-lg font-headline font-bold text-lg border transition-all ${adjustForm.size === size ? 'bg-primary text-background border-primary' : 'bg-surface-highest text-white border-white/10 hover:border-white/30'}`}
                      >
                        {size} <span className="text-xs opacity-50 ml-1">({qty})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Quantity</label>
                <input 
                  type="number" 
                  min="1" 
                  value={adjustForm.qty} 
                  onChange={e => setAdjustForm({...adjustForm, qty: Number(e.target.value)})}
                  className="w-full bg-surface-highest border border-transparent focus:border-primary/50 rounded-xl px-4 py-3 text-white font-headline font-bold text-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Reason (Required)</label>
                <input 
                  type="text" 
                  value={adjustForm.reason} 
                  onChange={e => setAdjustForm({...adjustForm, reason: e.target.value})}
                  placeholder="e.g. Damaged, Found in back, Count error"
                  className="w-full bg-surface-highest border border-transparent focus:border-primary/50 rounded-xl px-4 py-3 text-white outline-none"
                />
              </div>

              <button 
                onClick={() => {
                  const delta = adjustForm.type === 'add' ? adjustForm.qty : -adjustForm.qty;
                  recordAdjustment(adjustModal.product!.id, delta, adjustForm.reason, adjustForm.size);
                  setAdjustModal({isOpen: false, product: null});
                  toast.success(`Inventory adjusted: ${delta > 0 ? '+' : ''}${delta} units`);
                }}
                disabled={!adjustForm.reason.trim() || adjustForm.qty < 1 || (adjustModal.product.sizes && Object.keys(adjustModal.product.sizes).length > 0 && !adjustForm.size)}
                className="w-full bg-primary text-background py-4 rounded-xl font-headline font-black uppercase tracking-widest text-lg hover:bg-primary-dim transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm Adjustment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick View Modal */}
      {quickViewProduct && (
        <div className="fixed inset-0 z-[100] bg-background/90 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6" onClick={() => setQuickViewProduct(null)}>
          <div className="bg-surface-low border border-white/10 rounded-3xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col md:flex-row" onClick={e => e.stopPropagation()}>
            <div className="w-full md:w-2/5 h-48 md:h-auto bg-surface-highest relative">
              <img src={quickViewProduct.img} alt={quickViewProduct.name} className="w-full h-full object-cover" />
              <div className="absolute top-4 left-4">
                <span className="bg-background/80 backdrop-blur-md text-white px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest">
                  {quickViewProduct.cat}
                </span>
              </div>
            </div>
            <div className="p-6 md:p-8 w-full md:w-3/5 flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-headline font-bold text-2xl md:text-3xl uppercase leading-tight mb-1">{quickViewProduct.name}</h3>
                  <p className="text-zinc-500 font-mono text-xs">{quickViewProduct.sku}</p>
                </div>
                <button onClick={() => setQuickViewProduct(null)} className="text-zinc-500 hover:text-white bg-surface-highest p-2 rounded-full"><X size={20} /></button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-surface-highest p-4 rounded-xl border border-white/5">
                  <span className="block font-label text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Inventory</span>
                  <span className={`font-headline font-bold text-2xl ${quickViewProduct.inventory <= quickViewProduct.threshold ? 'text-error' : 'text-white'}`}>
                    {quickViewProduct.inventory}
                  </span>
                </div>
                <div className="bg-surface-highest p-4 rounded-xl border border-white/5">
                  <span className="block font-label text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Retail Price</span>
                  <span className="font-headline font-bold text-2xl text-primary">
                    ${quickViewProduct.retail.toFixed(2)}
                  </span>
                </div>
              </div>

              {quickViewProduct.sizes && Object.keys(quickViewProduct.sizes).length > 0 && (
                <div className="mb-6">
                  <span className="block font-label text-[10px] text-zinc-500 uppercase tracking-widest mb-2">Size Breakdown</span>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(quickViewProduct.sizes).map(([size, qty]) => (
                      <div key={size} className="bg-surface-highest px-3 py-1.5 rounded-lg border border-white/5 flex items-center gap-2">
                        <span className="font-bold text-sm">{size}</span>
                        <span className="text-zinc-500 text-xs">({qty})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-auto pt-6 flex gap-3">
                <button 
                  onClick={() => {
                    setQuickViewProduct(null);
                    onNavigate('detail', quickViewProduct);
                  }}
                  className="flex-1 bg-primary text-background py-3 rounded-xl font-headline font-bold uppercase tracking-widest text-sm hover:bg-primary-dim transition-all"
                >
                  Full Details
                </button>
                <button 
                  onClick={() => {
                    const item = quickViewProduct;
                    setQuickViewProduct(null);
                    setAdjustModal({ isOpen: true, product: item });
                    setAdjustForm({ type: 'remove', qty: 1, reason: '', size: item.sizes && Object.keys(item.sizes).length > 0 ? Object.keys(item.sizes)[0] : '' });
                  }}
                  className="flex-1 bg-surface-highest text-white py-3 rounded-xl font-headline font-bold uppercase tracking-widest text-sm hover:bg-white/10 border border-white/10 transition-all"
                >
                  Adjust Stock
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

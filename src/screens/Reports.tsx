import { useState, useMemo } from 'react';
import { TrendingUp, Rocket, Package, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { useStore } from '../store';

export default function Reports() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const products = useStore(state => state.products);
  const transactions = useStore(state => state.transactions);

  const salesData = useMemo(() => {
    const sales = transactions.filter(tx => tx.type === 'sale');
    const totalRevenue = sales.reduce((sum, tx) => sum + (tx.price * tx.quantity), 0);
    
    // Calculate category mix
    const catRevenue: Record<string, number> = {};
    sales.forEach(tx => {
      const product = products.find(p => p.id === tx.productId);
      if (product) {
        catRevenue[product.cat] = (catRevenue[product.cat] || 0) + (tx.price * tx.quantity);
      }
    });

    const categoryMix = Object.entries(catRevenue)
      .map(([name, rev]) => ({
        name,
        pct: Math.round((rev / totalRevenue) * 100) || 0,
        color: name === 'Sneakers' ? 'bg-white' : name === 'Apparel' ? 'bg-zinc-400' : 'bg-zinc-600'
      }))
      .sort((a, b) => b.pct - a.pct);

    // Calculate top products
    const productSales: Record<string, { units: number, revenue: number }> = {};
    sales.forEach(tx => {
      if (!productSales[tx.productId]) productSales[tx.productId] = { units: 0, revenue: 0 };
      productSales[tx.productId].units += tx.quantity;
      productSales[tx.productId].revenue += (tx.price * tx.quantity);
    });

    const topProducts = Object.entries(productSales)
      .map(([id, stats]) => {
        const product = products.find(p => p.id === id);
        return {
          id,
          name: product?.name || 'Unknown',
          cat: product?.cat || 'Unknown',
          price: product?.retail || 0,
          units: stats.units,
          revenue: stats.revenue,
          img: product?.img || '',
          tags: product?.tags || [],
          bestseller: false
        };
      })
      .sort((a, b) => b.units - a.units)
      .slice(0, 4);

    if (topProducts.length > 0) topProducts[0].bestseller = true;

    // Calculate dead stock (products with 0 sales or no sales in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const deadStock = products.filter(p => {
      const productSalesTxs = sales.filter(tx => tx.productId === p.id);
      if (productSalesTxs.length === 0) return true;
      
      const lastSaleDate = new Date(Math.max(...productSalesTxs.map(tx => new Date(tx.date).getTime())));
      return lastSaleDate < thirtyDaysAgo;
    }).map(p => ({
      ...p,
      daysSinceLastSale: sales.filter(tx => tx.productId === p.id).length === 0 
        ? 'Never sold' 
        : `${Math.floor((new Date().getTime() - new Date(Math.max(...sales.filter(tx => tx.productId === p.id).map(tx => new Date(tx.date).getTime()))).getTime()) / (1000 * 3600 * 24))} days ago`
    })).slice(0, 4); // Show top 4 dead stock items

    return { totalRevenue, categoryMix, topProducts, deadStock };
  }, [transactions, products]);

  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'All') return salesData.topProducts;
    return salesData.topProducts.filter(p => p.cat.toLowerCase() === selectedCategory.toLowerCase());
  }, [selectedCategory, salesData.topProducts]);

  return (
    <div className="space-y-12">
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <span className="font-label text-primary uppercase tracking-[0.2em] text-xs font-bold mb-2 block">Performance Analytics</span>
          <h2 className="font-headline text-5xl font-black tracking-tighter uppercase italic">Sales Report</h2>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative">
            <select 
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="appearance-none bg-surface-highest text-white font-label font-bold text-xs tracking-widest uppercase rounded-full px-6 py-3 pr-10 border border-white/5 outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
            >
              <option value="All">All Categories</option>
              <option value="Sneakers">Sneakers</option>
              <option value="Apparel">Apparel</option>
              <option value="Accessories">Accessories</option>
            </select>
            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          </div>
          <div className="flex bg-surface-high p-1 rounded-full gap-1">
            <button className="px-6 py-2 rounded-full font-label text-xs font-bold text-zinc-500 hover:text-white transition-colors">TODAY</button>
            <button className="px-6 py-2 rounded-full font-label text-xs font-bold text-zinc-500 hover:text-white transition-colors">WEEK</button>
            <button className="px-6 py-2 rounded-full font-label text-xs font-bold bg-white text-background shadow-[0_0_20px_rgba(255,255,255,0.3)]">MONTH</button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 relative group overflow-hidden rounded-xl bg-surface-low p-8 border border-white/5">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div>
              <p className="font-label text-zinc-500 text-sm font-medium mb-1">Total Net Revenue</p>
              <div className="flex items-baseline gap-4">
                <span className="font-headline text-5xl md:text-7xl font-bold tracking-tighter text-white">${salesData.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <div className="flex items-center text-primary bg-primary/10 px-3 py-1 rounded-full text-sm font-bold">
                  <TrendingUp size={16} className="mr-1" />
                  +24.8%
                </div>
              </div>
            </div>
            
            <div className="mt-12 w-full h-40 flex items-end justify-between gap-2">
              {[40, 65, 50, 85, 95, 60, 45].map((h, i) => {
                const isMax = h === 95;
                const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
                return (
                  <div 
                    key={i} 
                    className={`w-full rounded-t-lg transition-all cursor-pointer relative group/bar ${isMax ? 'bg-white hover:bg-zinc-200 shadow-[0_0_30px_rgba(255,255,255,0.2)]' : 'bg-surface-highest hover:bg-primary/40'}`} 
                    style={{ height: `${h}%` }}
                  >
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white text-background text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity">
                      {days[i]}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="bg-surface-low rounded-xl p-8 border border-white/5 flex flex-col justify-between">
          <div>
            <h3 className="font-headline text-xl font-bold uppercase tracking-tight mb-6">Category Mix</h3>
            <div className="space-y-6">
              {salesData.categoryMix.map((cat, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between text-xs font-bold font-label uppercase">
                    <span>{cat.name}</span>
                    <span>{cat.pct}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-surface-highest rounded-full overflow-hidden">
                    <div className={`h-full ${cat.color} rounded-full`} style={{ width: `${cat.pct}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <button className="mt-8 flex items-center justify-center gap-2 w-full py-4 border border-white/10 rounded-full font-label text-xs font-bold uppercase hover:bg-white hover:text-background transition-all">
            Full Inventory Audit
          </button>
        </div>
      </section>

      <section>
        <div className="flex items-end justify-between mb-8">
          <h3 className="font-headline text-3xl font-bold uppercase tracking-tighter">Elite Performers</h3>
          <button className="text-primary font-label text-xs font-bold uppercase tracking-widest hover:underline transition-all">View All Sales</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredProducts.length > 0 ? filteredProducts.map((prod, i) => (
            <div key={i} className="group cursor-pointer">
              <div className="relative aspect-square mb-4 overflow-hidden rounded-xl bg-surface-lowest">
                <img 
                  src={prod.img} 
                  alt={prod.name} 
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500 scale-105 group-hover:scale-110" 
                />
                {prod.bestseller && (
                  <div className="absolute top-4 left-4 bg-white text-background px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter">
                    #1 BESTSELLER
                  </div>
                )}
              </div>
              <div className="flex justify-between items-start mt-4">
                <div>
                  <h4 className="font-headline text-lg font-bold leading-tight group-hover:text-primary transition-colors">{prod.name}</h4>
                  <p className="font-label text-zinc-500 text-xs font-medium">{prod.cat}</p>
                  {(prod.tags && prod.tags.length > 0) && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {prod.tags.slice(0, 2).map(tag => (
                        <span key={tag} className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-headline font-bold text-lg">${prod.price}</p>
                  <p className="text-primary font-label text-[10px] font-bold">{prod.units} UNITS</p>
                </div>
              </div>
            </div>
          )) : (
            <div className="col-span-full py-12 text-center text-zinc-500 font-body">
              No top performers found for this category.
            </div>
          )}
        </div>
      </section>

      <section>
        <div className="flex items-end justify-between mb-8">
          <h3 className="font-headline text-3xl font-bold uppercase tracking-tighter text-error">Dead Stock & Aging</h3>
          <button className="text-zinc-500 font-label text-xs font-bold uppercase tracking-widest hover:text-white transition-all">View All Aging</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {salesData.deadStock.length > 0 ? salesData.deadStock.map((prod, i) => (
            <div key={i} className="group cursor-pointer bg-surface-low rounded-xl p-4 border border-error/20 hover:border-error/50 transition-colors">
              <div className="relative aspect-square mb-4 overflow-hidden rounded-lg bg-surface-lowest">
                <img 
                  src={prod.img} 
                  alt={prod.name} 
                  className="w-full h-full object-cover grayscale opacity-50 group-hover:opacity-100 transition-all duration-500" 
                />
                <div className="absolute top-2 right-2 bg-error text-white px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-tighter">
                  {prod.inventory} IN STOCK
                </div>
              </div>
              <div className="flex flex-col mt-2">
                <h4 className="font-headline text-sm font-bold leading-tight truncate">{prod.name}</h4>
                <p className="font-label text-zinc-500 text-xs font-medium mt-1">Last Sale: <span className="text-error">{prod.daysSinceLastSale}</span></p>
                {(prod.tags && prod.tags.length > 0) && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {prod.tags.slice(0, 2).map(tag => (
                      <span key={tag} className="bg-error/10 text-error px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex justify-between items-center mt-3">
                  <p className="font-headline font-bold text-sm text-zinc-400 line-through">${prod.retail}</p>
                  <button 
                    onClick={() => toast.success(`Applied 20% discount to ${prod.name}`)}
                    className="bg-white text-background px-3 py-1 rounded-full text-[10px] font-bold uppercase hover:bg-zinc-200 transition-colors"
                  >
                    Discount 20%
                  </button>
                </div>
              </div>
            </div>
          )) : (
            <div className="col-span-full py-12 text-center text-zinc-500 font-body">
              No dead stock found. Great job!
            </div>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-surface-high rounded-xl p-8 flex items-center gap-8 border border-white/5">
          <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-white shrink-0">
            <Rocket size={32} />
          </div>
          <div>
            <h4 className="font-headline text-xl font-bold uppercase italic">Peak Traffic Alert</h4>
            <p className="text-zinc-400 text-sm mt-1">Your store experiences a 40% surge in sales every Friday between 6 PM and 9 PM.</p>
          </div>
        </div>
        <div className="bg-surface-high rounded-xl p-8 flex items-center gap-8 border border-white/5">
          <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
            <Package size={32} />
          </div>
          <div>
            <h4 className="font-headline text-xl font-bold uppercase italic">Stock Velocity</h4>
            <p className="text-zinc-400 text-sm mt-1">FLUX V-1 ULTRA is projected to sell out in 4 days. Restock is recommended immediately.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

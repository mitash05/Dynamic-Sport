import { TrendingUp, Banknote } from 'lucide-react';
import { Screen } from '../App';
import { useStore } from '../store';
import { formatDistanceToNow, parseISO } from 'date-fns';

interface DashboardProps {
  onNavigate: (screen: Screen) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const products = useStore(state => state.products);
  const transactions = useStore(state => state.transactions);

  const totalValue = products.reduce((sum, p) => sum + (p.inventory * p.retail), 0);
  const totalUnits = products.reduce((sum, p) => sum + p.inventory, 0);
  
  const lowStockItems = products.filter(p => p.inventory <= p.threshold).slice(0, 3);
  const criticalCount = products.filter(p => p.inventory <= p.threshold).length;

  const recentActivity = transactions.slice(0, 4).map(tx => {
    const product = products.find(p => p.id === tx.productId);
    return {
      type: tx.type === 'sale' ? 'Sale' : tx.type === 'restock' ? 'Stock Added' : 'Alert',
      time: formatDistanceToNow(parseISO(tx.date), { addSuffix: true }),
      title: product?.name || 'Unknown Product',
      desc: tx.reason || `${tx.quantity} units ${tx.type === 'sale' ? 'sold' : 'added'}.`,
      val: tx.type === 'sale' ? `+$${(tx.price * tx.quantity).toFixed(2)}` : '',
      color: tx.type === 'sale' ? 'bg-primary' : tx.type === 'restock' ? 'bg-surface-highest border border-primary/50' : 'bg-error'
    };
  });

  return (
    <div className="space-y-12">
      <section>
        <span className="font-label text-primary font-bold uppercase tracking-[0.2em] text-xs">Command Center</span>
        <h2 className="font-headline text-5xl md:text-7xl font-bold tracking-tighter mt-2 text-white">
          SYSTEM<br/><span className="text-white/20">OVERVIEW</span>
        </h2>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
        <div className="md:col-span-2 bg-surface-low p-8 rounded-xl flex flex-col justify-between group overflow-hidden relative border border-white/5">
          <div className="relative z-10">
            <p className="font-label text-zinc-500 font-bold uppercase tracking-widest text-xs mb-1">Total Inventory Value</p>
            <h3 className="font-headline text-6xl font-bold text-primary tracking-tighter">${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            <div className="flex items-center gap-2 mt-4 text-emerald-400 font-bold text-sm">
              <TrendingUp size={16} />
              <span>+12.4% FROM LAST MONTH</span>
            </div>
          </div>
          <div className="absolute right-0 bottom-0 opacity-10 group-hover:opacity-20 transition-opacity translate-y-1/4 translate-x-1/4">
            <Banknote size={200} />
          </div>
        </div>

        <div className="bg-surface-highest p-8 rounded-xl flex flex-col justify-between border border-white/5 relative overflow-hidden">
          <div className="relative z-10">
            <p className="font-label text-zinc-400 font-bold uppercase tracking-widest text-xs mb-1">Total Units</p>
            <h3 className="font-headline text-5xl font-bold text-white">{totalUnits.toLocaleString()}</h3>
            <p className="text-zinc-500 text-sm mt-2 font-medium">{products.length} SKUs across 4 regions</p>
          </div>
          <div className="mt-8 flex -space-x-3">
            <div className="w-8 h-8 rounded-full border-2 border-surface bg-zinc-800 flex items-center justify-center text-[10px] font-bold">SN</div>
            <div className="w-8 h-8 rounded-full border-2 border-surface bg-zinc-700 flex items-center justify-center text-[10px] font-bold">AP</div>
            <div className="w-8 h-8 rounded-full border-2 border-surface bg-zinc-600 flex items-center justify-center text-[10px] font-bold">AC</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
        <div className="lg:col-span-3">
          <div className="flex items-center justify-between mb-8">
            <h4 className="font-headline text-2xl font-bold tracking-tight">LOW STOCK ALERTS</h4>
            <span className="bg-error-container text-error px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider">Critical: {criticalCount} Items</span>
          </div>
          
          <div className="space-y-4">
            {lowStockItems.length > 0 ? lowStockItems.map((item, i) => (
              <div key={i} className="bg-surface-high p-4 rounded-xl flex items-center gap-4 hover:bg-surface-highest transition-colors cursor-pointer" onClick={() => onNavigate('inventory')}>
                <div className="w-20 h-20 rounded-lg bg-surface-low overflow-hidden flex-shrink-0 border border-white/5">
                  <img src={item.img} alt={item.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-grow">
                  <div className="flex justify-between items-start">
                    <div>
                      <h5 className="font-bold text-white text-lg leading-tight">{item.name}</h5>
                      <p className="text-zinc-500 text-xs font-bold uppercase tracking-wide">{item.cat}</p>
                      {(item.tags && item.tags.length > 0) && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.tags.map(tag => (
                            <span key={tag} className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <span className={`text-error font-headline font-bold text-xl`}>{item.inventory}</span>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase">Left</p>
                    </div>
                  </div>
                  <div className="w-full bg-zinc-900 h-1.5 rounded-full mt-3 overflow-hidden">
                    <div className={`bg-error h-full rounded-full`} style={{ width: `${Math.min(100, (item.inventory / 10) * 100)}%` }}></div>
                  </div>
                </div>
              </div>
            )) : (
              <div className="py-8 text-center text-zinc-500 font-body">No critical stock alerts.</div>
            )}
          </div>
          <button onClick={() => onNavigate('inventory')} className="w-full mt-8 py-4 rounded-full border border-white/10 font-label font-bold uppercase tracking-widest text-xs hover:bg-surface-highest transition-colors text-zinc-400">View Full Inventory</button>
        </div>

        <div className="lg:col-span-2">
          <h4 className="font-headline text-2xl font-bold tracking-tight mb-8">RECENT ACTIVITY</h4>
          <div className="relative pl-8 border-l border-white/10 space-y-10">
            {recentActivity.map((act, i) => (
              <div key={i} className="relative">
                <div className={`absolute -left-[41px] top-0 w-4 h-4 rounded-full ${act.color} ring-4 ring-background`}></div>
                <div>
                  <p className={`text-[10px] font-bold ${act.type === 'Alert' ? 'text-error' : act.type === 'Stock Added' ? 'text-zinc-500' : 'text-primary'} uppercase tracking-[0.1em] mb-1`}>{act.type} • {act.time}</p>
                  <h6 className="font-bold text-white">{act.title}</h6>
                  <p className="text-sm text-zinc-500 mt-1">{act.desc}</p>
                  {act.val && <span className="inline-block mt-2 text-primary font-bold text-sm">{act.val}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

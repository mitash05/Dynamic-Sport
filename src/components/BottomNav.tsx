import { LayoutGrid, Package, PlusCircle, BarChart2, ShoppingCart } from 'lucide-react';
import { Screen } from '../App';
import { useStore } from '../store';

interface BottomNavProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
}

export default function BottomNav({ currentScreen, onNavigate }: BottomNavProps) {
  const products = useStore(state => state.products);
  const lowStockCount = products.filter(p => p.inventory < p.threshold).length;

  const navItems = [
    { id: 'dashboard', icon: LayoutGrid, label: 'Dashboard' },
    { id: 'pos', icon: ShoppingCart, label: 'POS' },
    { id: 'inventory', icon: Package, label: 'Inventory' },
    { id: 'add', icon: PlusCircle, label: 'Add Item' },
    { id: 'reports', icon: BarChart2, label: 'Reports' },
  ] as const;

  // Detail screen hides the bottom nav or keeps it? The mockup shows it on detail screen.
  
  return (
    <nav className="fixed bottom-0 w-full rounded-t-[2rem] z-50 bg-zinc-950/80 backdrop-blur-2xl flex justify-around items-center h-24 px-4 pb-4 shadow-[0_-10px_40px_0_rgba(143,245,255,0.06)]">
      {navItems.map((item) => {
        const isActive = currentScreen === item.id || (currentScreen === 'detail' && item.id === 'inventory');
        const Icon = item.icon;
        
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`relative flex flex-col items-center justify-center px-6 py-2 transition-all active:scale-90 duration-150 ${
              isActive 
                ? 'bg-cyan-accent/10 text-cyan-accent rounded-full' 
                : 'text-zinc-500 hover:bg-zinc-800/50'
            }`}
          >
            <div className="relative">
              <Icon size={24} className="mb-1" strokeWidth={isActive ? 2.5 : 2} />
              {item.id === 'inventory' && lowStockCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] flex items-center justify-center">
                  {lowStockCount}
                </span>
              )}
            </div>
            <span className="font-label text-[10px] font-bold uppercase tracking-[0.05em] mt-1">
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

import { X, LayoutDashboard, Package, History, Bell } from 'lucide-react';
import { Screen } from '../App';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../store';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (screen: Screen) => void;
}

export default function Sidebar({ isOpen, onClose, onNavigate }: SidebarProps) {
  const products = useStore(state => state.products);
  const lowStockCount = products.filter(p => p.inventory < p.threshold).length;

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, screen: 'dashboard' as Screen },
    { label: 'Inventory', icon: Package, screen: 'inventory' as Screen },
    { label: 'Sales History', icon: History, screen: 'reports' as Screen },
    { label: 'Stock Alerts', icon: Bell, screen: 'inventory' as Screen }, // Stock alerts are in inventory
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 left-0 bottom-0 w-72 bg-zinc-950 border-r border-white/10 z-[70] flex flex-col shadow-[20px_0_50px_rgba(0,0,0,0.5)]"
          >
            <div className="p-6 border-b border-white/10 flex justify-between items-center">
              <h2 className="font-headline font-black tracking-widest text-cyan-accent text-xl uppercase">
                Menu
              </h2>
              <button
                onClick={onClose}
                className="text-zinc-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full"
              >
                <X size={24} />
              </button>
            </div>

            <nav className="flex-1 p-4 space-y-2">
              {navItems.map((item) => (
                <button
                  key={item.label}
                  onClick={() => {
                    onNavigate(item.screen);
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-4 py-4 rounded-xl text-zinc-400 hover:text-cyan-accent hover:bg-cyan-accent/5 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <item.icon size={22} className="group-hover:scale-110 transition-transform" />
                    <span className="font-headline font-bold uppercase tracking-widest text-sm">
                      {item.label}
                    </span>
                  </div>
                  {item.label === 'Stock Alerts' && lowStockCount > 0 && (
                    <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      {lowStockCount}
                    </span>
                  )}
                </button>
              ))}
            </nav>

            <div className="p-6 border-t border-white/10">
              <p className="text-[10px] font-label font-bold text-zinc-600 uppercase tracking-[0.2em] text-center">
                Dynamic Sport v1.0
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

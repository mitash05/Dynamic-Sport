import { useState, useEffect } from 'react';
import { Toaster, toast } from 'sonner';
import { X } from 'lucide-react';
import TopBar from './components/TopBar';
import BottomNav from './components/BottomNav';
import Sidebar from './components/Sidebar';
import FAB from './components/FAB';
import Dashboard from './screens/Dashboard';
import Inventory from './screens/Inventory';
import AddItem from './screens/AddItem';
import Reports from './screens/Reports';
import ProductDetail from './screens/ProductDetail';
import CommandPalette from './components/CommandPalette';
import { useStore } from './store';
import { useScrollLock } from './hooks/useScrollLock';

import POS from './screens/POS';

export type Screen = 'dashboard' | 'inventory' | 'add' | 'reports' | 'detail' | 'pos';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('dashboard');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [isCmdPaletteOpen, setIsCmdPaletteOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const products = useStore(state => state.products);
  const { undo, redo, canUndo, canRedo } = useStore();

  useScrollLock(currentScreen === 'detail');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsCmdPaletteOpen(prev => !prev);
      }
      
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        if (e.shiftKey) {
          if (canRedo()) {
            e.preventDefault();
            redo();
            toast.success('Action redone');
          }
        } else {
          if (canUndo()) {
            e.preventDefault();
            undo();
            toast.success('Action undone');
          }
        }
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        if (canRedo()) {
          e.preventDefault();
          redo();
          toast.success('Action redone');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, canUndo, canRedo]);

  const navigate = (screen: Screen | 'search', data?: any) => {
    if (screen === 'search') {
      setIsCmdPaletteOpen(true);
      return;
    }
    if (data && data.id) setSelectedProductId(data.id);
    setCurrentScreen(screen as Screen);
  };

  const selectedProduct = products.find(p => p.id === selectedProductId) || products[0];

  return (
    <div className="min-h-screen bg-background text-white pb-32">
      <Toaster theme="dark" position="bottom-center" />
      <CommandPalette 
        isOpen={isCmdPaletteOpen} 
        onClose={() => setIsCmdPaletteOpen(false)} 
        onNavigate={navigate} 
      />
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        onNavigate={navigate} 
      />
      
      <TopBar 
        currentScreen={currentScreen} 
        onBack={() => navigate('inventory')} 
        onToggleSidebar={() => setIsSidebarOpen(true)}
        productName={selectedProduct?.name}
      />

      <main className="pt-28 px-6 max-w-7xl mx-auto">
        {currentScreen === 'dashboard' && <Dashboard onNavigate={navigate} />}
        {currentScreen === 'pos' && <POS />}
        {(currentScreen === 'inventory' || currentScreen === 'detail') && <Inventory onNavigate={navigate} />}
        {currentScreen === 'add' && <AddItem />}
        {currentScreen === 'reports' && <Reports />}
      </main>

      {currentScreen === 'detail' && (
        <div className="fixed inset-0 z-[150] bg-background/95 backdrop-blur-xl overflow-y-auto">
          <div className="max-w-7xl mx-auto px-6 pt-28 pb-32 relative">
            <button 
              onClick={() => navigate('inventory')}
              className="fixed top-8 right-8 z-[160] p-3 bg-surface-highest rounded-full hover:bg-surface-high text-white transition-all shadow-lg border border-white/10"
            >
              <X size={24} />
            </button>
            <ProductDetail product={selectedProduct} onNavigate={navigate} />
          </div>
        </div>
      )}

      <FAB onNavigate={navigate} />
      <BottomNav currentScreen={currentScreen} onNavigate={navigate} />
    </div>
  );
}

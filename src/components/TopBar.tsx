import { Menu, Search, ArrowLeft, X, Undo2, Redo2 } from 'lucide-react';
import { Screen } from '../App';
import { useStore } from '../store';
import { toast } from 'sonner';

interface TopBarProps {
  currentScreen: Screen;
  onBack: () => void;
  onToggleSidebar: () => void;
  productName?: string;
}

export default function TopBar({ currentScreen, onBack, onToggleSidebar, productName }: TopBarProps) {
  const { undo, redo, canUndo, canRedo } = useStore();

  const handleUndo = () => {
    if (canUndo()) {
      undo();
      toast.success('Action undone');
    }
  };

  const handleRedo = () => {
    if (canRedo()) {
      redo();
      toast.success('Action redone');
    }
  };

  const renderActions = () => (
    <div className="flex items-center gap-4">
      <button 
        onClick={handleUndo} 
        disabled={!canUndo()}
        className={`transition-all duration-300 active:scale-95 ${canUndo() ? 'text-zinc-400 hover:text-cyan-accent' : 'text-zinc-700 cursor-not-allowed'}`}
        title="Undo"
      >
        <Undo2 size={20} />
      </button>
      <button 
        onClick={handleRedo} 
        disabled={!canRedo()}
        className={`transition-all duration-300 active:scale-95 ${canRedo() ? 'text-zinc-400 hover:text-cyan-accent' : 'text-zinc-700 cursor-not-allowed'}`}
        title="Redo"
      >
        <Redo2 size={20} />
      </button>
      <button className="text-zinc-400 hover:text-cyan-dim transition-colors duration-300 active:scale-95">
        <Search size={24} />
      </button>
    </div>
  );

  if (currentScreen === 'detail') {
    return (
      <header className="fixed top-0 w-full z-50 bg-zinc-950/70 backdrop-blur-xl flex justify-between items-center px-6 h-20 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="text-cyan-accent active:scale-95 transition-transform">
            <ArrowLeft size={24} />
          </button>
          <h1 className="font-headline font-bold tracking-tighter text-lg uppercase text-cyan-accent">
            {productName || 'Product Detail'}
          </h1>
        </div>
        {renderActions()}
      </header>
    );
  }

  if (currentScreen === 'add') {
    return (
      <header className="fixed top-0 w-full z-50 bg-zinc-950/70 backdrop-blur-xl flex justify-between items-center px-6 h-20 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="text-cyan-accent active:scale-95 transition-transform">
            <X size={24} />
          </button>
          <h1 className="font-headline font-bold tracking-tighter text-lg uppercase text-cyan-accent">
            Add New Item
          </h1>
        </div>
        {renderActions()}
      </header>
    );
  }

  return (
    <header className="fixed top-0 w-full z-50 bg-zinc-950/70 backdrop-blur-xl flex justify-between items-center px-6 h-20 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
      <div className="flex items-center gap-4">
        <button onClick={onToggleSidebar} className="text-cyan-accent active:scale-95 transition-transform">
          <Menu size={24} />
        </button>
        <h1 className="font-headline font-black tracking-widest text-cyan-accent text-lg uppercase">
          Dynamic Sport
        </h1>
      </div>
      {renderActions()}
    </header>
  );
}

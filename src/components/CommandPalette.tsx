import { useState, useEffect } from 'react';
import { Search, Package, TrendingUp, Plus, X } from 'lucide-react';
import { useStore } from '../store';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (screen: string, data?: any) => void;
}

export default function CommandPalette({ isOpen, onClose, onNavigate }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const products = useStore(state => state.products);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (isOpen) onClose();
        else onNavigate('search'); // Just to trigger open, handled in App.tsx
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onNavigate]);

  if (!isOpen) return null;

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(query.toLowerCase()) || 
    p.sku.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 5);

  return (
    <div className="fixed inset-0 z-[200] bg-background/80 backdrop-blur-sm flex items-start justify-center pt-[20vh] p-4">
      <div className="bg-surface-low border border-white/10 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center px-4 border-b border-white/5">
          <Search className="text-zinc-500 mr-3" size={20} />
          <input
            autoFocus
            type="text"
            placeholder="Search products, reports, or commands..."
            className="w-full bg-transparent border-none outline-none py-4 text-white placeholder-zinc-500 font-headline text-lg"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <button onClick={onClose} className="text-zinc-500 hover:text-white p-2">
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {query && filteredProducts.length > 0 && (
            <div className="mb-4">
              <div className="px-3 py-2 text-xs font-bold text-zinc-500 uppercase tracking-widest">Products</div>
              {filteredProducts.map(p => (
                <button
                  key={p.id}
                  onClick={() => {
                    onNavigate('detail', { id: p.id });
                    onClose();
                  }}
                  className="w-full flex items-center px-3 py-3 hover:bg-white/5 rounded-xl transition-colors text-left"
                >
                  <img src={p.img} alt={p.name} className="w-10 h-10 rounded-lg object-cover mr-4" />
                  <div>
                    <div className="font-bold text-white">{p.name}</div>
                    <div className="text-xs text-zinc-400">{p.sku} • {p.inventory} in stock</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {!query && (
            <div>
              <div className="px-3 py-2 text-xs font-bold text-zinc-500 uppercase tracking-widest">Quick Actions</div>
              <button
                onClick={() => { onNavigate('pos'); onClose(); }}
                className="w-full flex items-center px-3 py-3 hover:bg-white/5 rounded-xl transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/20 text-primary flex items-center justify-center mr-4">
                  <Search size={20} />
                </div>
                <div className="font-bold text-white">Point of Sale</div>
              </button>
              <button
                onClick={() => { onNavigate('add'); onClose(); }}
                className="w-full flex items-center px-3 py-3 hover:bg-white/5 rounded-xl transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center mr-4">
                  <Plus size={20} />
                </div>
                <div className="font-bold text-white">Add New Item</div>
              </button>
              <button
                onClick={() => { onNavigate('reports'); onClose(); }}
                className="w-full flex items-center px-3 py-3 hover:bg-white/5 rounded-xl transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center mr-4">
                  <TrendingUp size={20} />
                </div>
                <div className="font-bold text-white">View Reports</div>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

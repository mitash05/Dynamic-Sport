import { useState } from 'react';
import { Plus, ScanBarcode, ShoppingCart, X } from 'lucide-react';
import { Screen } from '../App';

export default function FAB({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const [open, setOpen] = useState(false);
  
  return (
    <div className="fixed bottom-24 right-6 z-50 flex flex-col items-end gap-4">
      {open && (
        <div className="flex flex-col gap-3 items-end animate-in slide-in-from-bottom-4 fade-in duration-200">
          <button 
            onClick={() => { setOpen(false); onNavigate('add'); }} 
            className="flex items-center gap-3 bg-surface-highest text-white px-4 py-3 rounded-full border border-white/10 shadow-xl hover:bg-surface-high transition-all"
          >
            <span className="font-label text-xs font-bold uppercase tracking-widest">Add Item</span>
            <div className="bg-primary/20 p-2 rounded-full text-primary"><Plus size={16} /></div>
          </button>
          
          <button 
            onClick={() => { setOpen(false); onNavigate('add'); }} 
            className="flex items-center gap-3 bg-surface-highest text-white px-4 py-3 rounded-full border border-white/10 shadow-xl hover:bg-surface-high transition-all"
          >
            <span className="font-label text-xs font-bold uppercase tracking-widest">Scan Barcode</span>
            <div className="bg-primary/20 p-2 rounded-full text-primary"><ScanBarcode size={16} /></div>
          </button>
          
          <button 
            onClick={() => { setOpen(false); onNavigate('inventory'); }} 
            className="flex items-center gap-3 bg-surface-highest text-white px-4 py-3 rounded-full border border-white/10 shadow-xl hover:bg-surface-high transition-all"
          >
            <span className="font-label text-xs font-bold uppercase tracking-widest">Quick Sale</span>
            <div className="bg-primary/20 p-2 rounded-full text-primary"><ShoppingCart size={16} /></div>
          </button>
        </div>
      )}
      
      <button 
        onClick={() => setOpen(!open)} 
        className="bg-primary text-background p-4 rounded-full shadow-lg shadow-primary/20 hover:scale-110 transition-transform flex items-center justify-center"
      >
        {open ? <X size={24} /> : <Plus size={24} />}
      </button>
    </div>
  );
}

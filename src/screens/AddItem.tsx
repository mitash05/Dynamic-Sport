import React, { useState, useEffect } from 'react';
import { Upload, Plus, AlertCircle, CheckCircle2, ScanBarcode, Camera, Package, X, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useStore, ProductVariant } from '../store';

const BRANDS = ['Nike', 'Adidas', 'Puma', 'Under Armour', 'Asics', 'New Balance', 'Salomon', 'Other'];
const CATEGORIES = ['Footwear', 'Apparel', 'Accessories'];
const FOOTWEAR_SIZES = Array.from({length: 12}, (_, i) => String(36 + i));
const APPAREL_SIZES = ['S', 'M', 'L', 'XL', 'XXL'];

export default function AddItem() {
  const addProduct = useStore(state => state.addProduct);

  const [formData, setFormData] = useState({
    name: '', brand: BRANDS[0], category: CATEGORIES[0], barcode: '',
    purchasePrice: '', retailPrice: '', supplier: '', threshold: '5', notes: '', tags: [] as string[]
  });
  
  const [tagInput, setTagInput] = useState('');
  const [colorways, setColorways] = useState<{ id: string, name: string, image?: string }>([{ id: '1', name: '', image: '' }]);
  const [variantMatrix, setVariantMatrix] = useState<Record<string, Record<string, string>>>({});
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [serverError, setServerError] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const currentSizeGrid = formData.category === 'Footwear' ? FOOTWEAR_SIZES : formData.category === 'Apparel' ? APPAREL_SIZES : ['One Size'];
  
  const totalInventory = Object.values(variantMatrix).reduce<number>((total, sizes) => {
    return total + Object.values(sizes).reduce<number>((sum, val) => sum + (parseInt(val as string) || 0), 0);
  }, 0);

  useEffect(() => {
    setVariantMatrix({});
  }, [formData.category]);

  useEffect(() => {
    const newErrors: Record<string, string> = {};
    if (touched.name && !formData.name.trim()) newErrors.name = 'Product name is required';
    if (touched.retailPrice && (!formData.retailPrice || isNaN(Number(formData.retailPrice)) || Number(formData.retailPrice) <= 0)) {
      newErrors.retailPrice = 'Valid selling price is required';
    }
    setErrors(newErrors);
  }, [formData, touched]);

  const handleBlur = (field: string) => setTouched(prev => ({ ...prev, [field]: true }));

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      setFormData(prev => ({ ...prev, barcode: '841234567890', name: 'Scanned Pro Item' }));
    }, 1500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Product name is required';
    if (!formData.retailPrice || isNaN(Number(formData.retailPrice)) || Number(formData.retailPrice) <= 0) {
      newErrors.retailPrice = 'Valid selling price is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setTouched({ name: true, retailPrice: true });
      return;
    }

    setStatus('submitting');
    
    setTimeout(() => {
      if (Math.random() < 0.05) {
        setStatus('error');
        setServerError('Network error: Failed to connect to the inventory database.');
      } else {
        const variants: ProductVariant[] = [];
        const numericSizes: Record<string, number> = {};
        
        const isMultiVariant = colorways.length > 1 || (colorways.length === 1 && colorways[0].name.trim() !== '');
        
        if (isMultiVariant) {
          colorways.forEach(cw => {
            const colorName = cw.name.trim() || 'Default';
            const sizesForColor = variantMatrix[cw.id] || {};
            Object.entries(sizesForColor).forEach(([size, qtyStr]) => {
              const qty = parseInt(qtyStr as string);
              if (qty > 0) {
                variants.push({
                  id: `VAR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  color: colorName,
                  size: size,
                  sku: `${formData.barcode || 'SKU'}-${colorName.substring(0,3).toUpperCase()}-${size}`,
                  inventory: qty,
                  image: cw.image
                });
              }
            });
          });
        } else {
          const sizesForColor = variantMatrix[colorways[0].id] || {};
          Object.entries(sizesForColor).forEach(([size, qtyStr]) => {
            const qty = parseInt(qtyStr as string);
            if (qty > 0) numericSizes[size] = qty;
          });
        }

        addProduct({
          id: `DYN-${Date.now()}`,
          name: formData.name,
          cat: formData.category,
          brand: formData.brand,
          sku: formData.barcode || `DYN-${formData.brand.substring(0, 3).toUpperCase()}-${Math.floor(Math.random() * 1000)}`,
          inventory: totalInventory,
          retail: Number(formData.retailPrice),
          threshold: Number(formData.threshold) || 5,
          img: imagePreview || 'https://lh3.googleusercontent.com/aida-public/AB6AXuA2vlgu4_TR2rG2K5FiEivengrUMB8xRFFYgaK4GSe9RK36kM3Jvf_RVlknJJnvMwSGsclmTasYDRhlLM2uAG5jRe5njXc2YAh9TwPucAz3vQ_tcaKv0Wo7yP986joA0CjGKlEBbD4cZ_6SnuyNuB453M45eh0NlBUZWYhfShLBc99rfqvh9BQf7vWFZ5xe1Is7bD80T0q5wlU4v4beqrb4BS0sULY8tjKT9Fwe2IHOiB6V_DvaL8IRaBu8VmWzP9E68DKTdBGdzQ',
          purchasePrice: Number(formData.purchasePrice),
          supplier: formData.supplier,
          notes: formData.notes,
          barcode: formData.barcode,
          tags: formData.tags,
          sizes: isMultiVariant ? undefined : numericSizes,
          variants: isMultiVariant ? variants : undefined
        });
        
        setStatus('success');
        toast.success(`Added ${formData.name} to inventory`);
        setFormData({ name: '', brand: BRANDS[0], category: CATEGORIES[0], barcode: '', purchasePrice: '', retailPrice: '', supplier: '', threshold: '5', notes: '', tags: [] });
        setColorways([{ id: '1', name: '', image: '' }]);
        setVariantMatrix({});
        setTouched({});
        setImagePreview(null);
        setTimeout(() => setStatus('idle'), 3000);
      }
    }, 1000);
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <h2 className="font-headline text-3xl font-bold tracking-tight">Add New Asset</h2>
        <div className="flex items-center gap-2">
          <button type="button" onClick={handleScan} className="bg-surface-highest text-primary px-4 py-2 rounded-full font-label font-bold uppercase tracking-widest text-xs flex items-center gap-2 hover:bg-surface-high transition-colors border border-primary/20">
            <ScanBarcode size={16} />
            {isScanning ? 'Scanning...' : 'Scan Barcode'}
          </button>
        </div>
      </div>

      {status === 'error' && (
        <div className="bg-error-container border border-error/20 p-4 rounded-xl flex items-start gap-3">
          <AlertCircle className="text-error shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="text-error font-bold text-sm">Failed to add item</h4>
            <p className="text-error/80 text-sm mt-1">{serverError}</p>
          </div>
        </div>
      )}

      {status === 'success' && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl flex items-start gap-3">
          <CheckCircle2 className="text-emerald-400 shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="text-emerald-400 font-bold text-sm">Item added successfully</h4>
            <p className="text-emerald-400/80 text-sm mt-1">The new asset has been added to your inventory.</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Info */}
        <div className="bg-surface-low p-4 sm:p-8 rounded-2xl border border-white/5 space-y-6">
          <h3 className="font-headline font-bold text-lg sm:text-xl uppercase tracking-tight border-b border-white/5 pb-4">Basic Information</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div className="sm:col-span-2">
              <label className="block text-[10px] sm:text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Product Name *</label>
              <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} onBlur={() => handleBlur('name')} className={`w-full bg-surface-highest border ${errors.name ? 'border-error/50 focus:ring-error/40' : 'border-transparent focus:ring-primary/40'} rounded-xl px-4 py-3 text-white focus:ring-2 transition-all outline-none text-sm sm:text-base`} placeholder="e.g. Air Max 270" />
              {errors.name && <p className="text-error text-[10px] sm:text-xs mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="block text-[10px] sm:text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Barcode / SKU</label>
              <input type="text" value={formData.barcode} onChange={e => setFormData({...formData, barcode: e.target.value})} className="w-full bg-surface-highest border border-transparent focus:ring-primary/40 rounded-xl px-4 py-3 text-white focus:ring-2 transition-all outline-none text-sm sm:text-base" placeholder="Scan or enter manually" />
            </div>
            <div>
              <label className="block text-[10px] sm:text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Brand</label>
              <div className="relative">
                <select value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} className="w-full bg-surface-highest border border-transparent focus:ring-primary/40 rounded-xl px-4 py-3 text-white focus:ring-2 transition-all outline-none appearance-none text-sm sm:text-base">
                  {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[10px] sm:text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Category</label>
              <div className="relative">
                <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-surface-highest border border-transparent focus:ring-primary/40 rounded-xl px-4 py-3 text-white focus:ring-2 transition-all outline-none appearance-none text-sm sm:text-base">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[10px] sm:text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Tags</label>
              <div className="w-full bg-surface-highest border border-transparent focus-within:ring-primary/40 focus-within:ring-2 rounded-xl px-4 py-3 transition-all flex flex-wrap gap-2 items-center">
                {formData.tags.map(tag => (
                  <span key={tag} className="bg-primary/20 text-primary px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1">
                    {tag}
                    <button type="button" onClick={() => setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }))} className="hover:text-white transition-colors">
                      <X size={12} />
                    </button>
                  </span>
                ))}
                <input 
                  type="text" 
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      const newTag = tagInput.trim().toLowerCase();
                      if (newTag && !formData.tags.includes(newTag)) {
                        setFormData(prev => ({ ...prev, tags: [...prev.tags, newTag] }));
                      }
                      setTagInput('');
                    }
                  }}
                  className="bg-transparent border-none outline-none text-white text-sm sm:text-base flex-1 min-w-[120px]" 
                  placeholder="e.g. new arrival, on sale (Press Enter)" 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Media */}
        <div className="bg-surface-low p-4 sm:p-8 rounded-2xl border border-white/5 space-y-6">
          <h3 className="font-headline font-bold text-lg sm:text-xl uppercase tracking-tight border-b border-white/5 pb-4">Media</h3>
          <label className="border-2 border-dashed border-white/10 rounded-xl p-6 sm:p-8 flex flex-col items-center justify-center text-center hover:border-primary/50 transition-colors cursor-pointer group relative overflow-hidden min-h-[160px]">
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageUpload} />
            {imagePreview ? (
              <img src={imagePreview} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-30 transition-opacity" />
            ) : null}
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-surface-highest flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform">
                <Camera className="text-primary" size={20} />
              </div>
              <p className="font-bold text-xs sm:text-sm text-white mb-1">{imagePreview ? 'Change Photo' : 'Take Photo or Upload'}</p>
              <p className="text-[10px] sm:text-xs text-zinc-500 font-body">PNG, JPG up to 5MB</p>
            </div>
          </label>
        </div>

        {/* Variants & Inventory */}
        <div className="bg-surface-low p-4 sm:p-8 rounded-2xl border border-white/5 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-4">
            <h3 className="font-headline font-bold text-lg sm:text-xl uppercase tracking-tight">Variants & Inventory</h3>
            <span className="bg-primary/20 text-primary px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-widest w-fit">Total: {totalInventory}</span>
          </div>
          
          <div className="space-y-6 sm:space-y-8">
            {colorways.map((cw, index) => (
              <div key={cw.id} className="space-y-4 bg-surface-highest/50 p-4 sm:p-6 rounded-xl border border-white/5">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] sm:text-xs font-bold text-zinc-500 uppercase tracking-widest">Colorway {index + 1}</label>
                    {colorways.length > 1 && (
                      <button 
                        type="button" 
                        onClick={() => {
                          const newCws = colorways.filter(c => c.id !== cw.id);
                          setColorways(newCws);
                          const newMatrix = { ...variantMatrix };
                          delete newMatrix[cw.id];
                          setVariantMatrix(newMatrix);
                        }}
                        className="text-error hover:bg-error/10 p-2 rounded-lg transition-colors"
                      >
                        <X size={18} />
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <input 
                        type="text" 
                        value={cw.name} 
                        onChange={e => {
                          const newCws = [...colorways];
                          newCws[index].name = e.target.value;
                          setColorways(newCws);
                        }} 
                        className="w-full bg-background border border-transparent focus:ring-primary/40 rounded-xl px-4 py-3 text-white focus:ring-2 transition-all outline-none text-sm sm:text-base" 
                        placeholder="e.g. Triple Black, Red/White" 
                      />
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-2">
                      <div className="relative flex-1 w-full">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <ImageIcon size={16} className="text-zinc-500" />
                        </div>
                        <input 
                          type="text" 
                          value={cw.image || ''} 
                          onChange={e => {
                            const newCws = [...colorways];
                            newCws[index].image = e.target.value;
                            setColorways(newCws);
                          }} 
                          className="w-full bg-background border border-transparent focus:ring-primary/40 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 transition-all outline-none text-sm sm:text-base" 
                          placeholder="Image URL (Optional)" 
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const qty = window.prompt('Enter quantity to fill all sizes:');
                          if (qty && !isNaN(Number(qty))) {
                            const newMatrix = { ...variantMatrix };
                            newMatrix[cw.id] = newMatrix[cw.id] || {};
                            currentSizeGrid.forEach(size => {
                              newMatrix[cw.id][size] = qty;
                            });
                            setVariantMatrix(newMatrix);
                            toast.success(`Filled all sizes with ${qty}`);
                          }
                        }}
                        className="w-full sm:w-auto bg-surface-highest hover:bg-white/10 text-white px-4 py-3 rounded-xl font-bold text-xs sm:text-sm transition-colors whitespace-nowrap"
                      >
                        Fill All
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 sm:gap-4">
                  {currentSizeGrid.map(size => (
                    <div key={size} className="bg-background p-2 sm:p-3 rounded-xl border border-white/5 flex flex-col items-center gap-1 sm:gap-2">
                      <span className="text-[10px] sm:text-xs font-bold text-zinc-400">{size}</span>
                      <input 
                        type="number" 
                        min="0"
                        value={variantMatrix[cw.id]?.[size] || ''} 
                        onChange={e => {
                          setVariantMatrix(prev => ({
                            ...prev,
                            [cw.id]: {
                              ...(prev[cw.id] || {}),
                              [size]: e.target.value
                            }
                          }));
                        }}
                        className="w-full bg-surface-highest border border-transparent focus:border-primary/50 rounded-lg px-1 py-1 sm:py-2 text-center text-white font-bold outline-none text-xs sm:text-sm"
                        placeholder="0"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
            
            <button 
              type="button" 
              onClick={() => setColorways([...colorways, { id: Date.now().toString(), name: '' }])}
              className="w-full py-4 border-2 border-dashed border-white/10 rounded-xl text-zinc-400 font-bold hover:border-primary/50 hover:text-primary transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              <Plus size={18} />
              Add Another Colorway
            </button>
          </div>
        </div>

        {/* Pricing & Details */}
        <div className="bg-surface-low p-4 sm:p-8 rounded-2xl border border-white/5 space-y-6">
          <h3 className="font-headline font-bold text-lg sm:text-xl uppercase tracking-tight border-b border-white/5 pb-4">Pricing & Logistics</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <label className="block text-[10px] sm:text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Purchase Price ($)</label>
              <input type="number" value={formData.purchasePrice} onChange={e => setFormData({...formData, purchasePrice: e.target.value})} onBlur={() => handleBlur('purchasePrice')} className={`w-full bg-surface-highest border ${errors.purchasePrice ? 'border-error/50 focus:ring-error/40' : 'border-transparent focus:ring-primary/40'} rounded-xl px-4 py-3 text-white font-headline font-bold focus:ring-2 transition-all outline-none text-sm sm:text-base`} placeholder="0.00" />
            </div>
            <div>
              <label className="block text-[10px] sm:text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Selling Price ($) *</label>
              <input type="number" value={formData.retailPrice} onChange={e => setFormData({...formData, retailPrice: e.target.value})} onBlur={() => handleBlur('retailPrice')} className={`w-full bg-surface-highest border ${errors.retailPrice ? 'border-error/50 focus:ring-error/40' : 'border-transparent focus:ring-primary/40'} rounded-xl px-4 py-3 text-primary font-headline font-bold focus:ring-2 transition-all outline-none text-sm sm:text-base`} placeholder="0.00" />
              {errors.retailPrice && <p className="text-error text-[10px] sm:text-xs mt-1">{errors.retailPrice}</p>}
            </div>
            <div>
              <label className="block text-[10px] sm:text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Supplier Name</label>
              <input type="text" value={formData.supplier} onChange={e => setFormData({...formData, supplier: e.target.value})} className="w-full bg-surface-highest border border-transparent focus:ring-primary/40 rounded-xl px-4 py-3 text-white focus:ring-2 transition-all outline-none text-sm sm:text-base" placeholder="e.g. Global Sports Inc." />
            </div>
            <div>
              <label className="block text-[10px] sm:text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Low Stock Alert Threshold</label>
              <input type="number" value={formData.threshold} onChange={e => setFormData({...formData, threshold: e.target.value})} className="w-full bg-surface-highest border border-transparent focus:ring-primary/40 rounded-xl px-4 py-3 text-error font-headline font-bold focus:ring-2 transition-all outline-none text-sm sm:text-base" placeholder="5" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[10px] sm:text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Internal Notes</label>
              <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full bg-surface-highest border border-transparent focus:ring-primary/40 rounded-xl px-4 py-3 text-white focus:ring-2 transition-all outline-none min-h-[100px] text-sm sm:text-base" placeholder="Add any internal notes here..."></textarea>
            </div>
          </div>
        </div>

        <button 
          type="submit" 
          disabled={status === 'submitting'}
          className="w-full bg-primary text-background py-5 rounded-2xl font-headline font-black uppercase tracking-widest text-lg hover:bg-primary-dim transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {status === 'submitting' ? (
            <div className="w-6 h-6 border-4 border-background border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <>
              <Plus size={24} />
              Add to Inventory
            </>
          )}
        </button>
      </form>
    </div>
  );
}

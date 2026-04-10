import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, ShoppingCart, Plus, Minus, Trash2, ArrowRightLeft, CreditCard, RotateCcw, Banknote, Gift } from 'lucide-react';
import { toast } from 'sonner';
import Fuse from 'fuse.js';
import { useStore, Product, ProductVariant } from '../store';

interface CartItem {
  cartId: string;
  product: Product;
  quantity: number;
  price: number;
  size?: string;
  variant?: ProductVariant;
  isReturn: boolean;
}

export default function POS() {
  const products = useStore(state => state.products);
  const recordSale = useStore(state => state.recordSale);
  const recordReturn = useStore(state => state.recordReturn);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [mode, setMode] = useState<'sale' | 'return'>('sale');
  const [paymentMethod, setPaymentMethod] = useState<'credit' | 'cash' | 'gift'>('credit');
  
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus search on mount
    searchInputRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + Enter to checkout
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (cart.length > 0) checkout();
      }
      // Escape to clear cart or close modal
      if (e.key === 'Escape') {
        if (selectedProduct) {
          setSelectedProduct(null);
          setSelectedSize('');
          setSelectedVariant(null);
        } else if (cart.length > 0) {
          setCart([]);
          toast.info('Cart cleared');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, selectedProduct]);

  const fuse = useMemo(() => new Fuse(products, {
    keys: ['name', 'sku', 'barcode', 'cat', 'tags'],
    threshold: 0.4,
  }), [products]);

  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products;
    return fuse.search(searchQuery).map(result => result.item);
  }, [searchQuery, fuse, products]);

  const handleSearchEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && filteredProducts.length === 1) {
      handleProductClick(filteredProducts[0]);
    }
  };

  const addToCart = (product: Product, size?: string, variant?: ProductVariant) => {
    const existingIdx = cart.findIndex(item => 
      item.product.id === product.id && 
      item.size === size && 
      item.variant?.id === variant?.id &&
      item.isReturn === (mode === 'return')
    );

    if (existingIdx >= 0) {
      const newCart = [...cart];
      newCart[existingIdx].quantity += 1;
      setCart(newCart);
    } else {
      setCart([...cart, {
        cartId: `${Date.now()}-${Math.random()}`,
        product,
        quantity: 1,
        price: product.retail,
        size,
        variant,
        isReturn: mode === 'return'
      }]);
    }
    
    setSelectedProduct(null);
    setSelectedSize('');
    setSelectedVariant(null);
    setSearchQuery('');
    searchInputRef.current?.focus();
  };

  const handleProductClick = (product: Product) => {
    if (product.variants && product.variants.length > 0) {
      setSelectedProduct(product);
    } else if (product.sizes && Object.keys(product.sizes).length > 0) {
      setSelectedProduct(product);
    } else {
      addToCart(product);
    }
  };

  const updateQuantity = (cartId: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.cartId === cartId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (cartId: string) => {
    setCart(cart.filter(item => item.cartId !== cartId));
  };

  const cartTotal = cart.reduce((sum, item) => {
    const itemTotal = item.price * item.quantity;
    return sum + (item.isReturn ? -itemTotal : itemTotal);
  }, 0);

  const checkout = () => {
    cart.forEach(item => {
      if (item.isReturn) {
        recordReturn(item.product.id, item.quantity, item.price, 'POS Return', item.size, item.variant?.id);
      } else {
        recordSale(item.product.id, item.quantity, item.price, item.size, item.variant?.id);
      }
    });
    setCart([]);
    
    if (cartTotal < 0) {
      toast.success('Refund processed successfully!');
    } else {
      const methodStr = paymentMethod === 'credit' ? 'Credit Card' : paymentMethod === 'cash' ? 'Cash' : 'Gift Card';
      toast.success(`Payment of $${cartTotal.toFixed(2)} via ${methodStr} successful!`);
    }
    
    searchInputRef.current?.focus();
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-200px)]">
      {/* Left Side: Products */}
      <div className="flex-1 flex flex-col bg-surface-low rounded-2xl border border-white/5 overflow-hidden">
        <div className="p-6 border-b border-white/5 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="font-headline font-black text-3xl uppercase">Register</h2>
            <div className="flex bg-surface-highest rounded-lg p-1">
              <button 
                onClick={() => setMode('sale')}
                className={`px-4 py-2 rounded-md font-bold text-xs uppercase tracking-widest transition-all ${mode === 'sale' ? 'bg-primary text-background' : 'text-zinc-500 hover:text-white'}`}
              >
                Sale
              </button>
              <button 
                onClick={() => setMode('return')}
                className={`px-4 py-2 rounded-md font-bold text-xs uppercase tracking-widest transition-all ${mode === 'return' ? 'bg-error text-white' : 'text-zinc-500 hover:text-white'}`}
              >
                Return
              </button>
            </div>
          </div>
          
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
            <input 
              ref={searchInputRef}
              type="text" 
              placeholder="Scan barcode or search products..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchEnter}
              className="w-full bg-surface-highest border border-transparent focus:border-primary/50 rounded-xl py-4 pl-12 pr-4 text-white font-headline font-bold outline-none"
              autoFocus
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map(product => (
              <div 
                key={product.id} 
                onClick={() => handleProductClick(product)}
                className="bg-surface-highest rounded-xl p-4 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all group relative overflow-hidden"
              >
                <div className="aspect-square rounded-lg bg-surface-lowest mb-3 overflow-hidden">
                  <img src={product.img} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                </div>
                <h4 className="font-bold text-sm leading-tight truncate">{product.name}</h4>
                {(product.tags && product.tags.length > 0) && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {product.tags.slice(0, 2).map(tag => (
                      <span key={tag} className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest truncate max-w-[80px]">
                        {tag}
                      </span>
                    ))}
                    {product.tags.length > 2 && (
                      <span className="bg-surface text-zinc-400 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest">
                        +{product.tags.length - 2}
                      </span>
                    )}
                  </div>
                )}
                <div className="flex justify-between items-center mt-2">
                  <span className="text-primary font-headline font-bold">${product.retail.toFixed(2)}</span>
                  <span className="text-xs text-zinc-500">{product.inventory} in stock</span>
                </div>

                {/* Hover Preview Overlay */}
                <div className="absolute inset-0 bg-surface-highest/95 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-4 flex flex-col pointer-events-none border border-white/10 rounded-xl z-10">
                  <div className="flex items-start gap-3 mb-3">
                    <img src={product.img} alt={product.name} className="w-12 h-12 rounded-lg object-cover shadow-lg shrink-0" />
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm leading-tight text-white truncate">{product.name}</h4>
                      <span className="text-primary font-headline font-bold">${product.retail.toFixed(2)}</span>
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto no-scrollbar">
                    {product.variants && product.variants.length > 0 ? (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Variants</span>
                        <div className="flex flex-wrap gap-1">
                          {product.variants.slice(0, 8).map(v => (
                            <span key={v.id} className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${v.inventory > 0 ? 'bg-surface-low text-zinc-300' : 'bg-error/10 text-error/50'}`}>
                              {v.color.substring(0,3)}/{v.size} ({v.inventory})
                            </span>
                          ))}
                          {product.variants.length > 8 && <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-surface-low text-zinc-500">+{product.variants.length - 8}</span>}
                        </div>
                      </div>
                    ) : product.sizes && Object.keys(product.sizes).length > 0 ? (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Sizes</span>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(product.sizes).map(([size, qty]) => (
                            <span key={size} className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${qty > 0 ? 'bg-surface-low text-zinc-300' : 'bg-error/10 text-error/50'}`}>
                              {size} ({qty})
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Standard Item</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-2 pt-2 border-t border-white/10 text-center">
                    <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Click to Add</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side: Cart */}
      <div className="w-full lg:w-96 flex flex-col bg-surface-low rounded-2xl border border-white/5 overflow-hidden shrink-0">
        <div className="p-6 border-b border-white/5 flex items-center gap-3">
          <ShoppingCart className="text-primary" />
          <h3 className="font-headline font-bold text-xl uppercase">Current Order</h3>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-500">
              <ShoppingCart size={48} className="mb-4 opacity-20" />
              <p className="font-body text-sm">Cart is empty</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.cartId} className={`p-4 rounded-xl border ${item.isReturn ? 'bg-error/10 border-error/20' : 'bg-surface-highest border-white/5'}`}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      {item.isReturn && <RotateCcw size={14} className="text-error" />}
                      <h5 className="font-bold text-sm leading-tight">{item.product.name}</h5>
                    </div>
                    <p className="text-xs text-zinc-400 mt-1">
                      {item.variant ? `${item.variant.color} / ${item.variant.size}` : item.size ? `Size: ${item.size}` : ''}
                    </p>
                  </div>
                  <button onClick={() => removeFromCart(item.cartId)} className="text-zinc-500 hover:text-error transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
                
                <div className="flex justify-between items-center mt-4">
                  <div className="flex items-center gap-3 bg-surface rounded-lg p-1">
                    <button onClick={() => updateQuantity(item.cartId, -1)} className="p-1 hover:bg-white/10 rounded text-zinc-400 hover:text-white"><Minus size={14} /></button>
                    <span className="font-bold text-sm w-4 text-center">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.cartId, 1)} className="p-1 hover:bg-white/10 rounded text-zinc-400 hover:text-white"><Plus size={14} /></button>
                  </div>
                  <span className={`font-headline font-bold ${item.isReturn ? 'text-error' : 'text-white'}`}>
                    {item.isReturn ? '-' : ''}${(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-6 border-t border-white/5 bg-surface-highest/50">
          <div className="flex justify-between items-center mb-6">
            <span className="text-zinc-400 font-bold uppercase tracking-widest text-sm">Total</span>
            <span className={`font-headline font-black text-3xl ${cartTotal < 0 ? 'text-error' : 'text-primary'}`}>
              {cartTotal < 0 ? '-' : ''}${Math.abs(cartTotal).toFixed(2)}
            </span>
          </div>

          {cartTotal >= 0 && (
            <div className="mb-6 space-y-3">
              <span className="text-zinc-400 font-bold uppercase tracking-widest text-[10px]">Payment Method</span>
              <div className="grid grid-cols-3 gap-2">
                <button 
                  onClick={() => setPaymentMethod('credit')}
                  className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all ${paymentMethod === 'credit' ? 'bg-primary/10 border-primary text-primary' : 'bg-surface border-white/5 text-zinc-400 hover:text-white hover:border-white/20'}`}
                >
                  <CreditCard size={20} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Card</span>
                </button>
                <button 
                  onClick={() => setPaymentMethod('cash')}
                  className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all ${paymentMethod === 'cash' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-surface border-white/5 text-zinc-400 hover:text-white hover:border-white/20'}`}
                >
                  <Banknote size={20} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Cash</span>
                </button>
                <button 
                  onClick={() => setPaymentMethod('gift')}
                  className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all ${paymentMethod === 'gift' ? 'bg-purple-500/10 border-purple-500 text-purple-400' : 'bg-surface border-white/5 text-zinc-400 hover:text-white hover:border-white/20'}`}
                >
                  <Gift size={20} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Gift</span>
                </button>
              </div>
            </div>
          )}
          
          <button 
            onClick={checkout}
            disabled={cart.length === 0}
            className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl font-headline font-black uppercase tracking-widest text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${cartTotal < 0 ? 'bg-error text-white hover:bg-error/80' : paymentMethod === 'cash' ? 'bg-emerald-500 text-background hover:bg-emerald-600' : paymentMethod === 'gift' ? 'bg-purple-500 text-white hover:bg-purple-600' : 'bg-primary text-background hover:bg-primary-dim'}`}
          >
            {cartTotal < 0 ? <RotateCcw size={24} /> : paymentMethod === 'cash' ? <Banknote size={24} /> : paymentMethod === 'gift' ? <Gift size={24} /> : <CreditCard size={24} />}
            {cartTotal < 0 ? 'Process Refund' : `Pay with ${paymentMethod === 'credit' ? 'Card' : paymentMethod === 'cash' ? 'Cash' : 'Gift Card'}`}
          </button>
        </div>
      </div>

      {/* Variant/Size Selection Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[100] bg-background/90 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-surface-low border border-white/10 p-8 rounded-3xl max-w-md w-full animate-in fade-in zoom-in-95 duration-200">
            <h3 className="font-headline font-bold text-2xl uppercase mb-6">Select Options</h3>
            
            {selectedProduct.variants && selectedProduct.variants.length > 0 ? (
              <div className="space-y-4">
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest">Variant (Color / Size)</label>
                <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
                  {selectedProduct.variants.map(v => (
                    <button
                      key={v.id}
                      disabled={mode === 'sale' && v.inventory <= 0}
                      onClick={() => setSelectedVariant(v)}
                      className={`flex justify-between items-center p-4 rounded-xl border transition-all ${selectedVariant?.id === v.id ? 'bg-primary text-background border-primary' : (mode === 'sale' && v.inventory <= 0) ? 'bg-surface opacity-50 cursor-not-allowed' : 'bg-surface-highest hover:border-white/30'}`}
                    >
                      <span className="font-bold">{v.color} / {v.size}</span>
                      <span className="text-xs opacity-70">{v.inventory} left</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : selectedProduct.sizes ? (
              <div className="space-y-4">
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest">Size</label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(selectedProduct.sizes).map(([size, qty]) => {
                    const quantity = Number(qty);
                    return (
                    <button
                      key={size}
                      disabled={mode === 'sale' && quantity <= 0}
                      onClick={() => setSelectedSize(size)}
                      className={`px-4 py-2 rounded-lg font-headline font-bold text-lg border transition-all ${selectedSize === size ? 'bg-primary text-background border-primary' : (mode === 'sale' && quantity <= 0) ? 'bg-surface opacity-50 cursor-not-allowed' : 'bg-surface-highest hover:border-white/30'}`}
                    >
                      {size} <span className="text-xs opacity-50 ml-1">({quantity})</span>
                    </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="flex gap-4 mt-8">
              <button 
                onClick={() => { setSelectedProduct(null); setSelectedSize(''); setSelectedVariant(null); }}
                className="flex-1 py-4 rounded-xl font-bold uppercase tracking-widest bg-surface-highest text-white hover:bg-surface transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={() => addToCart(selectedProduct, selectedSize, selectedVariant || undefined)}
                disabled={
                  (selectedProduct.variants && selectedProduct.variants.length > 0 && !selectedVariant) ||
                  (selectedProduct.sizes && Object.keys(selectedProduct.sizes).length > 0 && !selectedSize)
                }
                className="flex-1 py-4 rounded-xl font-bold uppercase tracking-widest bg-primary text-background hover:bg-primary-dim transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

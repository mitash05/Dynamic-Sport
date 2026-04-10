import { create } from 'zustand';
import { subDays, format } from 'date-fns';

export interface ProductVariant {
  id: string;
  color: string;
  size: string;
  sku: string;
  inventory: number;
  image?: string;
}

export interface Product {
  id: string;
  cat: string;
  name: string;
  sku: string;
  inventory: number;
  retail: number;
  img: string;
  threshold: number;
  desc?: string;
  colorway?: string;
  releaseDate?: string;
  material?: string;
  weight?: string;
  warranty?: string;
  sizes?: Record<string, number>;
  variants?: ProductVariant[];
  purchasePrice?: number;
  supplier?: string;
  notes?: string;
  barcode?: string;
  brand?: string;
  tags?: string[];
}

export interface Transaction {
  id: string;
  productId: string;
  type: 'sale' | 'restock' | 'adjustment' | 'return' | 'exchange';
  quantity: number;
  price: number; // Price per unit at the time of transaction
  date: string; // ISO string
  reason?: string;
  size?: string;
  color?: string;
  variantId?: string;
}

interface StoreState {
  products: Product[];
  transactions: Transaction[];
  history: { products: Product[]; transactions: Transaction[] }[];
  historyIndex: number;
  addProduct: (product: Product) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  recordSale: (productId: string, quantity: number, price: number, size?: string, variantId?: string) => void;
  restockProduct: (productId: string, quantity: number, cost?: number, size?: string, variantId?: string) => void;
  recordAdjustment: (productId: string, quantityDelta: number, reason: string, size?: string, variantId?: string) => void;
  recordReturn: (productId: string, quantity: number, price: number, reason: string, size?: string, variantId?: string) => void;
  recordExchange: (returnProductId: string, returnQty: number, outProductId: string, outQty: number, reason: string, returnSize?: string, returnVariantId?: string, outSize?: string, outVariantId?: string) => void;
  bulkImport: (products: Product[]) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

// Generate some dummy transactions for the past 7 days
const generateDummyTransactions = (products: Product[]): Transaction[] => {
  const txs: Transaction[] = [];
  let txId = 1;
  const now = new Date();
  
  products.forEach(p => {
    // Random sales over the last 7 days
    for (let i = 0; i < 5; i++) {
      const daysAgo = Math.floor(Math.random() * 7);
      const qty = Math.floor(Math.random() * 3) + 1;
      txs.push({
        id: `tx-${txId++}`,
        productId: p.id,
        type: 'sale',
        quantity: qty,
        price: p.retail,
        date: subDays(now, daysAgo).toISOString(),
        reason: `Sale (Order #${1000 + txId})`
      });
    }
    // A restock
    txs.push({
      id: `tx-${txId++}`,
      productId: p.id,
      type: 'restock',
      quantity: 20,
      price: p.retail * 0.4, // wholesale cost
      date: subDays(now, 5).toISOString(),
      reason: 'Warehouse Restock'
    });
  });
  
  return txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

const initialProducts: Product[] = [
  {
    id: '1', cat: 'Sneakers', name: 'Air Max 270', sku: 'DYN-AM270-001', inventory: 42, retail: 150.00, threshold: 20,
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA2vlgu4_TR2rG2K5FiEivengrUMB8xRFFYgaK4GSe9RK36kM3Jvf_RVlknJJnvMwSGsclmTasYDRhlLM2uAG5jRe5njXc2YAh9TwPucAz3vQ_tcaKv0Wo7yP986joA0CjGKlEBbD4cZ_6SnuyNuB453M45eh0NlBUZWYhfShLBc99rfqvh9BQf7vWFZ5xe1Is7bD80T0q5wlU4v4beqrb4BS0sULY8tjKT9Fwe2IHOiB6V_DvaL8IRaBu8VmWzP9E68DKTdBGdzQ',
    colorway: 'Triple Red', releaseDate: '2023-05-12', material: 'Knit / Synthetic', weight: '11.2 oz', warranty: '1 Year',
    tags: ['best seller', 'running']
  },
  {
    id: '2', cat: 'Sneakers', name: 'Dunk Low Pro', sku: 'DYN-DLP-042', inventory: 18, retail: 110.00, threshold: 20,
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCxJn5KHkkO-J5LTFip_bsYFtxnNKS2Uci7K9AsqO2MPQGjmhNbnJ5MWmh6xngO0sVxix8_FCFTD7Js_dcQoVHyvaEHjWAtVnqgJrxvKzOy59N0jdzmP7CrCbxyqwt8zOk69_E9c_SSuFH_W7z_0YSe3G-88RmFkoyh9xomATvjxhaHBnEcv7dOon1wOM_Z9eqHGvKc6AZF7BzWaO2lvDhuf19wG_CGZo8ghZAlVmHZtdIadw3ZmRAh-S17Z5AZXkqIgZXbwTTonw',
    colorway: 'Pure Platinum', releaseDate: '2024-01-08', material: 'Premium Leather', weight: '14.5 oz', warranty: '1 Year',
    tags: ['new arrival', 'skate']
  },
  {
    id: '3', cat: 'Apparel', name: 'Tech Essential Tee', sku: 'DYN-APP-TEE', inventory: 124, retail: 45.00, threshold: 50,
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAV938SpW3MOJUmAuyHaJnZG6nSBKiALY4J2jjXGosHUPUiEVOu8R41613x2jVceBtpddPFzKKTgxez4L0AxpKANb7nJ-jImws3Su4BAcW0gdHXDqY4KmxXsvKBl5DO837AZ96aeqSzTo6-vYYyLulvAjEyFzVZbE01cWhJIWo5R679H_Pw9-o4Tce5gfEis3ajRUNcSnb-F-0aiD5azRvC22Lho8wcUveR7-ZFhUszazbiWB0h6e88EMPm90WPErJr8TS0tw2D-Q',
    colorway: 'Obsidian Black', releaseDate: '2023-11-20', material: 'Moisture-Wicking Blend', weight: '4.2 oz', warranty: '90 Days',
    tags: ['essential', 'training']
  },
  {
    id: '4', cat: 'Accessories', name: 'Hydro Flask Pro', sku: 'DYN-ACC-WTR', inventory: 85, retail: 35.00, threshold: 30,
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA5tvepJm7oEQX10d5t6TQf3mUY5c25-kzOQEkrBSC3F1cdNPgU3KJksa_XEllpSGtebFLEeHvLUkXB_5W0He0eyOsy3_nOnQEJriojj7k4iSlPqAtvNrb1VRw6v1GETebyb5tcpBq33rajIiWZI-dWtFzDmqyjPWICX4kQu6UBs5raQfMMIPo4Ri8XJeNZFlieujsOZz5xPb4jZoO3VDzSUPQAXYQ3NxbIqLau3J-vvP1KYNb8PXeDRszBCWxjLANUyDfFndq5yA',
    colorway: 'Matte Black / Cyan', releaseDate: '2022-08-15', material: 'Stainless Steel', weight: '12.0 oz', warranty: 'Lifetime'
  },
  {
    id: '5', cat: 'Sneakers', name: 'VaporFly Next% 3', sku: 'DYN-VFN-003', inventory: 2, retail: 250.00, threshold: 10,
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBgW5AzVrb8gGtyhXKlsQfdLWTW8d2BG-NH6q75CtmiPmgXS2zn_Jpn1VSeZtxxEdPD_wGUSBOnnuuENDhBn6V7SjfFCt_dLdKzpzkYm4-2OV3nBTeZcnOjhlskplgFKSRNzvR5-JSa5FjZdgplhEgFlSt5kCUSsDSjgHxhKfRv0YTbQRYJLbDWZDZrVsT9T99rzL1OTrcK83ZGVsTSahDf2cKF-PDxivoj-DGoN4efKP9qBbG3r67IiH1piPVkGU2pudOzARcMvw',
    colorway: 'Hyper Red / Carbon', releaseDate: '2024-02-28', material: 'Flyknit / Carbon Fiber', weight: '6.5 oz', warranty: '1 Year'
  },
  {
    id: '6', cat: 'Apparel', name: 'Pro-Tech Base Layer', sku: 'DYN-APP-PTB', inventory: 5, retail: 65.00, threshold: 15,
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBiRdeqZT1FP2_TwLNPETgfjDMu6lqOQGzWrq6iEF-pd8rmehn9G0qNRBo5jM6q4192Pwg1eQQKyfzotUcxKDPIPEF1H439CxvGFMIRyH1l1oSImq9rYsatJ7lF43JxU2raVm38BShtFAj6ZslbyLmIEQmKwGhUkW9pym9Yo6D9JAb9E4GtyqAxrQeqo96kdx76EAmR06BcBa9hP1AR2Z94Tgth93PNULzaZG6FduzZSEexnB3acaWM49_4Waz_tLhXj5FxTuXDmQ',
    colorway: 'Stealth Grey', releaseDate: '2023-09-10', material: 'Spandex Blend', weight: '3.8 oz', warranty: '90 Days'
  },
  {
    id: '7', cat: 'Sneakers', name: 'Terra Kiger 9', sku: 'DYN-TK9-001', inventory: 8, retail: 140.00, threshold: 12,
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCYqdcJ9t5ziYyVvauDTr-eGEiQGsXVPodanp8z5kSbxf4m2jWoOvX560YZciKKcuJrnUgXerzCxAZ7N7g7c366jTajn3XQbKJc7-KBozOrnq5lSCRHdaJ-wyBw_DDUTdBrB5tsmxM35G5LKNyWqFjEc8gKR3LIvGLCKUgZ0P40kvdrNsLIgGiPpwsqvAwwYx-VFZN9Gm2e2JdLjlfq3twEna7uc67M6ClMhs5Z7e_sd6d_JSJb4oJIy3uzxZ3bva29miW_IMVM5A',
    colorway: 'Olive / Orange', releaseDate: '2023-10-05', material: 'Mesh / Rubber', weight: '10.5 oz', warranty: '1 Year'
  },
  {
    id: '8', cat: 'Accessories', name: 'Elite Running Cap', sku: 'DYN-ACC-CAP', inventory: 45, retail: 28.00, threshold: 20,
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA5tvepJm7oEQX10d5t6TQf3mUY5c25-kzOQEkrBSC3F1cdNPgU3KJksa_XEllpSGtebFLEeHvLUkXB_5W0He0eyOsy3_nOnQEJriojj7k4iSlPqAtvNrb1VRw6v1GETebyb5tcpBq33rajIiWZI-dWtFzDmqyjPWICX4kQu6UBs5raQfMMIPo4Ri8XJeNZFlieujsOZz5xPb4jZoO3VDzSUPQAXYQ3NxbIqLau3J-vvP1KYNb8PXeDRszBCWxjLANUyDfFndq5yA',
    colorway: 'White / Reflective', releaseDate: '2024-01-15', material: 'Polyester', weight: '2.1 oz', warranty: '30 Days'
  },
  {
    id: '9', cat: 'Sneakers', name: 'FLUX V-1 ULTRA', sku: 'DYN-FLX-001', inventory: 112, retail: 210.00, threshold: 30,
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBypcSn7_aYqTrMaYccJnwbE4C45fWUiZtirD67qM7ZRTV57DJaLzFVVYszG0gaKsUO3nW1PafoST4of-bNTgx9Ln-4cazisOK4g0pIadLyk8j-zEtHWOo2CmRkWUY_PSigrf2STbJavSDHBupViR2KEjs38I6F0GRmRiicYFMpL3VwAzMLkDA10rZsll5RawSXtTh_N4If90Nxk16CQz-w8YP30sI0iAK35mKyuYVve4lpy6nRCeBqupMsRCiT7nbVRzJEfE2BLA',
    colorway: 'Neon / Black', releaseDate: '2024-03-01', material: 'Synthetic', weight: '9.8 oz', warranty: '1 Year'
  },
  {
    id: '10', cat: 'Sneakers', name: 'ZENITH CORE', sku: 'DYN-ZNC-002', inventory: 65, retail: 165.00, threshold: 25,
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDofhMs2xv2mG93rF_3Wi6Eo9uV3wxq4T96mo2_xK7gIp4Xlb_bNXtWKxhruAOrFkgb0DMYzgAQ51mJLpE01bnpuPADcaCuDahMMk_fGGBjHHyJXbk5NmjjQMenQT_Kt7ejH8L0PNTZdRhunORvOxJpzUZipReltJqjWPsFLuoYpJDURyFEnK-vb6ntvPewlNX9ysIhJmu7Eaa1IofQO3twPAWMwfc-eThEW05dCQ2e8UOrBvV--9bD3yzn4I4pExeWboUU_Rc7fw',
    colorway: 'Core White', releaseDate: '2023-12-10', material: 'Leather / Suede', weight: '12.5 oz', warranty: '1 Year'
  },
  {
    id: '11', cat: 'Apparel', name: 'KINETIC SHELL', sku: 'DYN-APP-SHL', inventory: 34, retail: 85.00, threshold: 15,
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDY3jViBHuaCxbfsG3N_MuV12WrvRDM_pygR4xJoYaQpeF7VP0zSr90Sc3koq1Fpqw_mHNqFogWfxXwMIxQ8Kmmlow4TkstdoF199g83cLh4yBX567wEKMAlBeMJnA9n6nrWPHjgUfXnYHe98RW3I-sUqGypP-_3hKMVBh-Eg-7eNMB79ImN1KaTKyLCiEQWcto1KRdZtPM2hNQTzaqfBjIUvaOciNHu5V7Dc4e5iwuVuKHxTAEOQTeqcgqEVZzXaIrx_ASsGh3Iw',
    colorway: 'Slate Grey', releaseDate: '2023-11-05', material: 'Gore-Tex', weight: '8.0 oz', warranty: '1 Year'
  },
  {
    id: '12', cat: 'Sneakers', name: 'FLUX NEON X', sku: 'DYN-FLX-002', inventory: 15, retail: 240.00, threshold: 10,
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBUUx1lrS1dA1B16tNZ4KDo9lqEBUa31xkm1noEE3xp2kcdz7DfElFiWnMJgonv-HuQgD1qLk8EmB38qbB8hJujDfvL_HaKqtL1CtYQtBKNPkp2DqTV-Cq4ly5E852myyyy6PH_4EyyAaxVQ1Uhu58xdqd143LAR6WIAoqMT7R90aAzje-bnVt4dfP4EEkZK0Qn_tuR9H1oS5-YllYt70qx7MPN6z-dYLo0Iw6Xtv2WViPFhHJbthxtDvYKjQc-RRSqaEik04ZGxw',
    colorway: 'Volt / Black', releaseDate: '2024-03-15', material: 'Synthetic', weight: '9.5 oz', warranty: '1 Year'
  }
];

export const useStore = create<StoreState>((set, get) => {
  const initialProductsList = initialProducts;
  const initialTransactionsList = generateDummyTransactions(initialProducts);

  const addToHistory = (products: Product[], transactions: Transaction[]) => {
    const { history, historyIndex } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ products: JSON.parse(JSON.stringify(products)), transactions: JSON.parse(JSON.stringify(transactions)) });
    
    // Limit history size to 50 items
    if (newHistory.length > 50) {
      newHistory.shift();
      return {
        history: newHistory,
        historyIndex: newHistory.length - 1
      };
    }
    
    return {
      history: newHistory,
      historyIndex: newHistory.length - 1
    };
  };

  return {
    products: initialProductsList,
    transactions: initialTransactionsList,
    history: [{ products: initialProductsList, transactions: initialTransactionsList }],
    historyIndex: 0,
    
    addProduct: (product) => set((state) => {
      const nextProducts = [...state.products, product];
      const nextTransactions = state.transactions;
      return {
        products: nextProducts,
        ...addToHistory(nextProducts, nextTransactions)
      };
    }),
    
    updateProduct: (id, updates) => set((state) => {
      const nextProducts = state.products.map(p => p.id === id ? { ...p, ...updates } : p);
      const nextTransactions = state.transactions;
      return {
        products: nextProducts,
        ...addToHistory(nextProducts, nextTransactions)
      };
    }),
    
    recordSale: (productId, quantity, price, size, variantId) => set((state) => {
      const newTx: Transaction = {
        id: `tx-${Date.now()}`,
        productId,
        type: 'sale',
        quantity,
        price,
        date: new Date().toISOString(),
        reason: 'Manual Sale Entry',
        size,
        variantId
      };
      
      const nextTransactions = [newTx, ...state.transactions];
      const nextProducts = state.products.map(p => {
        if (p.id === productId) {
          const newSizes = p.sizes ? { ...p.sizes } : undefined;
          if (newSizes && size && newSizes[size] !== undefined) {
            newSizes[size] = Math.max(0, newSizes[size] - quantity);
          }
          const newVariants = p.variants ? [...p.variants] : undefined;
          if (newVariants && variantId) {
            const vIdx = newVariants.findIndex(v => v.id === variantId);
            if (vIdx >= 0) newVariants[vIdx] = { ...newVariants[vIdx], inventory: Math.max(0, newVariants[vIdx].inventory - quantity) };
          }
          return { ...p, inventory: Math.max(0, p.inventory - quantity), sizes: newSizes, variants: newVariants };
        }
        return p;
      });

      return {
        transactions: nextTransactions,
        products: nextProducts,
        ...addToHistory(nextProducts, nextTransactions)
      };
    }),
    
    restockProduct: (productId, quantity, cost, size, variantId) => set((state) => {
      const newTx: Transaction = {
        id: `tx-${Date.now()}`,
        productId,
        type: 'restock',
        quantity,
        price: cost || 0,
        date: new Date().toISOString(),
        reason: 'Manual Restock',
        size,
        variantId
      };
      
      const nextTransactions = [newTx, ...state.transactions];
      const nextProducts = state.products.map(p => {
        if (p.id === productId) {
          const newSizes = p.sizes ? { ...p.sizes } : undefined;
          if (newSizes && size) {
            newSizes[size] = (newSizes[size] || 0) + quantity;
          }
          const newVariants = p.variants ? [...p.variants] : undefined;
          if (newVariants && variantId) {
            const vIdx = newVariants.findIndex(v => v.id === variantId);
            if (vIdx >= 0) newVariants[vIdx] = { ...newVariants[vIdx], inventory: newVariants[vIdx].inventory + quantity };
          }
          return { ...p, inventory: p.inventory + quantity, sizes: newSizes, variants: newVariants };
        }
        return p;
      });

      return {
        transactions: nextTransactions,
        products: nextProducts,
        ...addToHistory(nextProducts, nextTransactions)
      };
    }),
    
    recordAdjustment: (productId, quantityDelta, reason, size, variantId) => set((state) => {
      const product = state.products.find(p => p.id === productId);
      if (!product) return state;

      const newTx: Transaction = {
        id: `tx-${Date.now()}`,
        productId,
        type: 'adjustment',
        quantity: Math.abs(quantityDelta),
        price: product.purchasePrice || 0,
        date: new Date().toISOString(),
        reason: reason,
        size,
        variantId
      };
      
      const nextTransactions = [newTx, ...state.transactions];
      const nextProducts = state.products.map(p => {
        if (p.id === productId) {
          const newSizes = p.sizes ? { ...p.sizes } : undefined;
          if (newSizes && size) {
            newSizes[size] = Math.max(0, (newSizes[size] || 0) + quantityDelta);
          }
          const newVariants = p.variants ? [...p.variants] : undefined;
          if (newVariants && variantId) {
            const vIdx = newVariants.findIndex(v => v.id === variantId);
            if (vIdx >= 0) newVariants[vIdx] = { ...newVariants[vIdx], inventory: Math.max(0, newVariants[vIdx].inventory + quantityDelta) };
          }
          return { ...p, inventory: Math.max(0, p.inventory + quantityDelta), sizes: newSizes, variants: newVariants };
        }
        return p;
      });

      return {
        transactions: nextTransactions,
        products: nextProducts,
        ...addToHistory(nextProducts, nextTransactions)
      };
    }),
  
    recordReturn: (productId, quantity, price, reason, size, variantId) => set((state) => {
      const newTx: Transaction = {
        id: `tx-${Date.now()}`,
        productId,
        type: 'return',
        quantity,
        price,
        date: new Date().toISOString(),
        reason,
        size,
        variantId
      };
      
      const nextTransactions = [newTx, ...state.transactions];
      const nextProducts = state.products.map(p => {
        if (p.id === productId) {
          const newSizes = p.sizes ? { ...p.sizes } : undefined;
          if (newSizes && size) {
            newSizes[size] = (newSizes[size] || 0) + quantity;
          }
          const newVariants = p.variants ? [...p.variants] : undefined;
          if (newVariants && variantId) {
            const vIdx = newVariants.findIndex(v => v.id === variantId);
            if (vIdx >= 0) newVariants[vIdx] = { ...newVariants[vIdx], inventory: newVariants[vIdx].inventory + quantity };
          }
          return { ...p, inventory: p.inventory + quantity, sizes: newSizes, variants: newVariants };
        }
        return p;
      });

      return {
        transactions: nextTransactions,
        products: nextProducts,
        ...addToHistory(nextProducts, nextTransactions)
      };
    }),
  
    recordExchange: (returnProductId, returnQty, outProductId, outQty, reason, returnSize, returnVariantId, outSize, outVariantId) => set((state) => {
      const now = new Date().toISOString();
      const returnProduct = state.products.find(p => p.id === returnProductId);
      const outProduct = state.products.find(p => p.id === outProductId);
      
      const returnTx: Transaction = {
        id: `tx-ret-${Date.now()}`,
        productId: returnProductId,
        type: 'return',
        quantity: returnQty,
        price: returnProduct?.retail || 0,
        date: now,
        reason: `Exchange: ${reason}`,
        size: returnSize,
        variantId: returnVariantId
      };
  
      const outTx: Transaction = {
        id: `tx-out-${Date.now()}`,
        productId: outProductId,
        type: 'sale',
        quantity: outQty,
        price: outProduct?.retail || 0,
        date: now,
        reason: `Exchange: ${reason}`,
        size: outSize,
        variantId: outVariantId
      };
  
      const nextTransactions = [returnTx, outTx, ...state.transactions];
      const nextProducts = state.products.map(p => {
        let updatedP = { ...p };
        
        // Handle Return (Add to inventory)
        if (p.id === returnProductId) {
          const newSizes = updatedP.sizes ? { ...updatedP.sizes } : undefined;
          if (newSizes && returnSize) newSizes[returnSize] = (newSizes[returnSize] || 0) + returnQty;
          
          const newVariants = updatedP.variants ? [...updatedP.variants] : undefined;
          if (newVariants && returnVariantId) {
            const vIdx = newVariants.findIndex(v => v.id === returnVariantId);
            if (vIdx >= 0) newVariants[vIdx] = { ...newVariants[vIdx], inventory: newVariants[vIdx].inventory + returnQty };
          }
          updatedP = { ...updatedP, inventory: updatedP.inventory + returnQty, sizes: newSizes, variants: newVariants };
        }
  
        // Handle Out/Sale (Subtract from inventory)
        if (p.id === outProductId) {
          const newSizes = updatedP.sizes ? { ...updatedP.sizes } : undefined;
          if (newSizes && outSize && newSizes[outSize] !== undefined) {
            newSizes[outSize] = Math.max(0, newSizes[outSize] - outQty);
          }
          
          const newVariants = updatedP.variants ? [...updatedP.variants] : undefined;
          if (newVariants && outVariantId) {
            const vIdx = newVariants.findIndex(v => v.id === outVariantId);
            if (vIdx >= 0) newVariants[vIdx] = { ...newVariants[vIdx], inventory: Math.max(0, newVariants[vIdx].inventory - outQty) };
          }
          updatedP = { ...updatedP, inventory: Math.max(0, updatedP.inventory - outQty), sizes: newSizes, variants: newVariants };
        }
  
        return updatedP;
      });

      return {
        transactions: nextTransactions,
        products: nextProducts,
        ...addToHistory(nextProducts, nextTransactions)
      };
    }),
  
    bulkImport: (newProducts) => set((state) => {
      const nextProducts = [...newProducts, ...state.products];
      const nextTransactions = state.transactions;
      return {
        products: nextProducts,
        ...addToHistory(nextProducts, nextTransactions)
      };
    }),

    undo: () => set((state) => {
      if (state.historyIndex > 0) {
        const prevIndex = state.historyIndex - 1;
        const prevState = state.history[prevIndex];
        return {
          products: JSON.parse(JSON.stringify(prevState.products)),
          transactions: JSON.parse(JSON.stringify(prevState.transactions)),
          historyIndex: prevIndex
        };
      }
      return state;
    }),

    redo: () => set((state) => {
      if (state.historyIndex < state.history.length - 1) {
        const nextIndex = state.historyIndex + 1;
        const nextState = state.history[nextIndex];
        return {
          products: JSON.parse(JSON.stringify(nextState.products)),
          transactions: JSON.parse(JSON.stringify(nextState.transactions)),
          historyIndex: nextIndex
        };
      }
      return state;
    }),

    canUndo: () => get().historyIndex > 0,
    canRedo: () => get().historyIndex < get().history.length - 1
  };
});

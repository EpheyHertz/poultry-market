import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product } from '../types';

export interface CartItem {
  id: string;
  product: Product;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  total: number;
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getItemCount: () => number;
  calculateTotal: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      total: 0,

      addItem: (product: Product, quantity = 1) => {
        const items = get().items;
        const existingItem = items.find(item => item.id === product.id);
        
        if (existingItem) {
          get().updateQuantity(product.id, existingItem.quantity + quantity);
        } else {
          const newItem: CartItem = {
            id: product.id,
            product,
            quantity,
          };
          set({ items: [...items, newItem] });
          get().calculateTotal();
        }
      },

      removeItem: (productId: string) => {
        const items = get().items.filter(item => item.id !== productId);
        set({ items });
        get().calculateTotal();
      },

      updateQuantity: (productId: string, quantity: number) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }
        
        const items = get().items.map(item =>
          item.id === productId ? { ...item, quantity } : item
        );
        set({ items });
        get().calculateTotal();
      },

      clearCart: () => {
        set({ items: [], total: 0 });
      },

      getItemCount: () => {
        return get().items.reduce((count, item) => count + item.quantity, 0);
      },

      calculateTotal: () => {
        const total = get().items.reduce(
          (sum, item) => sum + (item.product.price * item.quantity),
          0
        );
        set({ total });
      },
    }),
    {
      name: 'cart-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
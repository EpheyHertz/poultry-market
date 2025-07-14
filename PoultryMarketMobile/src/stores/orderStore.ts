import { create } from 'zustand';
import { Order } from '../types';
import { apiService } from '../services/api';

interface OrderState {
  orders: Order[];
  loading: boolean;
  error: string | null;
  currentOrder: Order | null;
  fetchOrders: () => Promise<void>;
  createOrder: (orderData: any) => Promise<Order>;
  submitPayment: (orderId: string, paymentData: any) => Promise<void>;
  setCurrentOrder: (order: Order | null) => void;
}

export const useOrderStore = create<OrderState>((set, get) => ({
  orders: [],
  loading: false,
  error: null,
  currentOrder: null,

  fetchOrders: async () => {
    set({ loading: true, error: null });
    try {
      const response = await apiService.getOrders();
      set({ orders: response.orders, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  createOrder: async (orderData) => {
    set({ loading: true, error: null });
    try {
      const order = await apiService.createOrder(orderData);
      set(state => ({
        orders: [order, ...state.orders],
        currentOrder: order,
        loading: false,
      }));
      return order;
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  submitPayment: async (orderId, paymentData) => {
    set({ loading: true, error: null });
    try {
      await apiService.submitPayment(orderId, paymentData);
      // Refresh orders to get updated payment status
      await get().fetchOrders();
      set({ loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  setCurrentOrder: (order) => {
    set({ currentOrder: order });
  },
}));
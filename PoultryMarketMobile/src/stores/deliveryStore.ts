import { create } from 'zustand';
import { apiService } from '../services/api';

interface Delivery {
  id: string;
  orderId: string;
  address: string;
  trackingId: string;
  status: string;
  courierName?: string;
  courierPhone?: string;
  estimatedDelivery?: string;
  actualDelivery?: string;
  order: {
    id: string;
    customer: {
      name: string;
      phone?: string;
    };
    total: number;
    items: Array<{
      product: {
        name: string;
      };
      quantity: number;
    }>;
  };
}

interface DeliveryState {
  deliveries: Delivery[];
  loading: boolean;
  error: string | null;
  currentDelivery: Delivery | null;
  fetchDeliveries: () => Promise<void>;
  updateDeliveryStatus: (deliveryId: string, status: string, location?: string) => Promise<void>;
  setCurrentDelivery: (delivery: Delivery | null) => void;
}

export const useDeliveryStore = create<DeliveryState>((set, get) => ({
  deliveries: [],
  loading: false,
  error: null,
  currentDelivery: null,

  fetchDeliveries: async () => {
    set({ loading: true, error: null });
    try {
      const response = await apiService.getDeliveries();
      set({ deliveries: response.deliveries, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  updateDeliveryStatus: async (deliveryId, status, location) => {
    set({ loading: true, error: null });
    try {
      await apiService.updateDeliveryStatus(deliveryId, { status, location });
      await get().fetchDeliveries();
      set({ loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  setCurrentDelivery: (delivery) => {
    set({ currentDelivery: delivery });
  },
}));
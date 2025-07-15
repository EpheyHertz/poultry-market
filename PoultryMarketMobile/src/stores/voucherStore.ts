import { create } from 'zustand';
import { apiService } from '../services/api';

interface Voucher {
  id: string;
  code: string;
  discount: number;
  type: 'percentage' | 'fixed';
  validFrom: string;
  validUntil: string;
  maxUses: number;
  usedCount: number;
  isActive: boolean;
  createdBy: {
    name: string;
    role: string;
  };
}

interface VoucherState {
  vouchers: Voucher[];
  loading: boolean;
  error: string | null;
  fetchVouchers: () => Promise<void>;
  createVoucher: (voucherData: any) => Promise<void>;
  updateVoucher: (voucherId: string, voucherData: any) => Promise<void>;
  deleteVoucher: (voucherId: string) => Promise<void>;
  validateVoucher: (code: string) => Promise<any>;
}

export const useVoucherStore = create<VoucherState>((set, get) => ({
  vouchers: [],
  loading: false,
  error: null,

  fetchVouchers: async () => {
    set({ loading: true, error: null });
    try {
      const response = await apiService.getVouchers();
      set({ vouchers: response.vouchers, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  createVoucher: async (voucherData) => {
    set({ loading: true, error: null });
    try {
      const voucher = await apiService.createVoucher(voucherData);
      set(state => ({
        vouchers: [voucher, ...state.vouchers],
        loading: false
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  updateVoucher: async (voucherId, voucherData) => {
    set({ loading: true, error: null });
    try {
      await apiService.updateVoucher(voucherId, voucherData);
      await get().fetchVouchers();
      set({ loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  deleteVoucher: async (voucherId) => {
    set({ loading: true, error: null });
    try {
      await apiService.deleteVoucher(voucherId);
      set(state => ({
        vouchers: state.vouchers.filter(v => v.id !== voucherId),
        loading: false
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  validateVoucher: async (code) => {
    try {
      return await apiService.validateVoucher(code);
    } catch (error: any) {
      throw error;
    }
  },
}));
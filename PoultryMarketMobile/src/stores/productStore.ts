import { create } from 'zustand';
import { Product } from '../types';
import { apiService } from '../services/api';

interface ProductState {
  products: Product[];
  loading: boolean;
  error: string | null;
  filters: {
    type: string;
    search: string;
    sortBy: string;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  fetchProducts: () => Promise<void>;
  setFilters: (filters: Partial<ProductState['filters']>) => void;
  clearFilters: () => void;
  setPage: (page: number) => void;
}

export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  loading: false,
  error: null,
  filters: {
    type: '',
    search: '',
    sortBy: '',
  },
  pagination: {
    page: 1,
    limit: 12,
    total: 0,
    pages: 0,
  },

  fetchProducts: async () => {
    set({ loading: true, error: null });
    try {
      const { filters, pagination } = get();
      const params = {
        ...filters,
        page: pagination.page,
        limit: pagination.limit,
      };
      
      // Remove empty filters
      Object.keys(params).forEach(key => {
        if (!params[key as keyof typeof params]) {
          delete params[key as keyof typeof params];
        }
      });

      const response = await apiService.getProducts(params);
      
      set({
        products: response.products,
        pagination: response.pagination,
        loading: false,
      });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  setFilters: (newFilters) => {
    set(state => ({
      filters: { ...state.filters, ...newFilters },
      pagination: { ...state.pagination, page: 1 }, // Reset to first page
    }));
    get().fetchProducts();
  },

  clearFilters: () => {
    set({
      filters: { type: '', search: '', sortBy: '' },
      pagination: { ...get().pagination, page: 1 },
    });
    get().fetchProducts();
  },

  setPage: (page) => {
    set(state => ({
      pagination: { ...state.pagination, page },
    }));
    get().fetchProducts();
  },
}));
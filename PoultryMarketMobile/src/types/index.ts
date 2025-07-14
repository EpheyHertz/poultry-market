export interface User {
  id: string;
  email: string;
  name: string;
  role: 'CUSTOMER' | 'SELLER' | 'COMPANY' | 'STAKEHOLDER' | 'ADMIN';
  avatar?: string;
  phone?: string;
  isVerified: boolean;
  dashboardSlug?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  type: 'EGGS' | 'CHICKEN_MEAT' | 'CHICKEN_FEED' | 'CHICKS' | 'HATCHING_EGGS';
  images: string[];
  seller: {
    id: string;
    name: string;
    role: string;
    tags: Array<{ tag: string }>;
  };
}

export interface Order {
  id: string;
  status: 'PENDING' | 'CONFIRMED' | 'PACKED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';
  total: number;
  paymentStatus: 'UNPAID' | 'PENDING' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  paymentType: 'BEFORE_DELIVERY' | 'AFTER_DELIVERY';
  createdAt: string;
  items: Array<{
    id: string;
    quantity: number;
    price: number;
    product: {
      id: string;
      name: string;
      images: string[];
    };
  }>;
  delivery?: {
    address: string;
    trackingId: string;
    status: string;
  };
}

export interface AuthResponse {
  user: User;
  token?: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}
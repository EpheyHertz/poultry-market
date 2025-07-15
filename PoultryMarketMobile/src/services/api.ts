import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = 'http://localhost:3000/api'; // Change this to your actual API URL

class ApiService {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await SecureStore.getItemAsync('authToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const headers = await this.getAuthHeaders();

    const config: RequestInit = {
      headers,
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Auth endpoints
  async login(email: string, password: string) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(userData: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    role: string;
  }) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async getCurrentUser() {
    return this.request('/auth/me');
  }

  async logout() {
    return this.request('/auth/logout', {
      method: 'POST',
    });
  }

  // Products endpoints
  async getProducts(params?: {
    type?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }
    
    const endpoint = `/products${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request(endpoint);
  }

  async getProduct(id: string) {
    return this.request(`/products/${id}`);
  }

  // Orders endpoints
  async getOrders(params?: { status?: string; page?: number; limit?: number }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }
    
    const endpoint = `/orders${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request(endpoint);
  }

  async createOrder(orderData: {
    items: Array<{ productId: string; quantity: number }>;
    deliveryAddress: string;
    paymentType: string;
    paymentDetails?: any;
  }) {
    return this.request('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  }

  async submitPayment(orderId: string, paymentData: {
    phone: string;
    reference: string;
    mpesaMessage: string;
  }) {
    return this.request(`/orders/${orderId}/payment`, {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
  }

  // Profile endpoints
  async getProfile() {
    return this.request('/profile');
  }

  async updateProfile(profileData: {
    name?: string;
    phone?: string;
    bio?: string;
    location?: string;
    website?: string;
    avatar?: string;
  }) {
    return this.request('/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  // Store endpoints
  async getStoreBySlug(slug: string) {
    return this.request(`/store/${slug}`);
  }

  // Delivery endpoints
  async getDeliveries() {
    return this.request('/deliveries');
  }

  async updateDeliveryStatus(deliveryId: string, statusData: {
    status: string;
    location?: string;
  }) {
    return this.request(`/deliveries/${deliveryId}/status`, {
      method: 'PUT',
      body: JSON.stringify(statusData),
    });
  }

  // Chat endpoints
  async getChats() {
    return this.request('/chats');
  }

  async getChatMessages(chatId: string) {
    return this.request(`/chats/${chatId}/messages`);
  }

  async sendMessage(chatId: string, messageData: {
    content: string;
    type?: string;
  }) {
    return this.request(`/chats/${chatId}/messages`, {
      method: 'POST',
      body: JSON.stringify(messageData),
    });
  }

  async createChat(participantId: string) {
    return this.request('/chats', {
      method: 'POST',
      body: JSON.stringify({ participantId }),
    });
  }

  // Voucher endpoints
  async getVouchers() {
    return this.request('/vouchers');
  }

  async createVoucher(voucherData: any) {
    return this.request('/vouchers', {
      method: 'POST',
      body: JSON.stringify(voucherData),
    });
  }

  async updateVoucher(voucherId: string, voucherData: any) {
    return this.request(`/vouchers/${voucherId}`, {
      method: 'PUT',
      body: JSON.stringify(voucherData),
    });
  }

  async deleteVoucher(voucherId: string) {
    return this.request(`/vouchers/${voucherId}`, {
      method: 'DELETE',
    });
  }

  async validateVoucher(code: string) {
    return this.request('/vouchers/validate', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  }

  // Analytics endpoints
  async getAnalytics(params?: { period?: string }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }
    
    const endpoint = `/analytics${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request(endpoint);
  }

  // Applications endpoints
  async getApplications() {
    return this.request('/applications');
  }

  async getApplication(id: string) {
    return this.request(`/applications/${id}`);
  }

  async createApplication(applicationData: {
    requestedRole: string;
    businessName: string;
    businessType: string;
    description: string;
    documents?: string[];
  }) {
    return this.request('/applications', {
      method: 'POST',
      body: JSON.stringify(applicationData),
    });
  }

  // Sponsorship endpoints
  async getSponsorships() {
    return this.request('/sponsorships');
  }

  async createSponsorship(sponsorshipData: any) {
    return this.request('/sponsorships', {
      method: 'POST',
      body: JSON.stringify(sponsorshipData),
    });
  }
}

export const apiService = new ApiService(API_BASE_URL);
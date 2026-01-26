// services/apiService.ts

import { API_CONFIG, API_ENDPOINTS, buildApiUrl, buildQueryString, getRequestOptions, ApiResponse } from '@/config/apiConfig';

// Custom error class for API errors
class ApiError extends Error {
  constructor(public status: number, public statusText: string) {
    super(`API Error: ${status} - ${statusText}`);
    this.name = 'ApiError';
  }
}

// Generic API service class
class ApiService {
  private baseUrl: string;
  private timeout: number;

  constructor() {
    this.baseUrl = API_CONFIG.BASE_URL;
    this.timeout = API_CONFIG.TIMEOUT;
  }

  // Generic request method
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    params?: Record<string, string | number>
  ): Promise<ApiResponse<T>> {
    const url = buildApiUrl(endpoint, params);
    const token = this.getAuthToken();
    
    const requestOptions: RequestInit = {
      ...getRequestOptions(token || undefined),
      ...options,
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      console.log('🔄 API Request:', url); // Debug log

      const response = await fetch(url, {
        ...requestOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Try to get error details from response
        let errorDetails = response.statusText;
        try {
          const errorData = await response.json();
          errorDetails = errorData.error || errorData.message || errorDetails;
        } catch (e) {
          // Response body is not JSON
        }
        throw new ApiError(response.status, errorDetails);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ API Request failed:', url, error); // Debug log
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      // Better error messages for different scenarios
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new ApiError(408, 'Request timeout');
      }
      
      if (error instanceof TypeError) {
        throw new ApiError(0, 'Network error - Check internet connection or CORS settings');
      }
      
      throw new ApiError(500, error instanceof Error ? error.message : 'Unknown network error');
    }
  }

  // GET request
  async get<T>(endpoint: string, params?: Record<string, string | number>, queryParams?: Record<string, string | number | boolean>): Promise<ApiResponse<T>> {
    let url = endpoint;
    if (queryParams) {
      const queryString = buildQueryString(queryParams);
      url += `?${queryString}`;
    }
    return this.request<T>(url, { method: 'GET' }, params);
  }

  // POST request
  async post<T>(endpoint: string, data?: Record<string, unknown> | unknown[], params?: Record<string, string | number>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    }, params);
  }

  // PUT request
  async put<T>(endpoint: string, data?: Record<string, unknown> | unknown[], params?: Record<string, string | number>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, params);
  }

  // DELETE request
  async delete<T>(endpoint: string, params?: Record<string, string | number>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' }, params);
  }

  // File upload
  async uploadFile<T>(endpoint: string, file: File, additionalData?: Record<string, string | number | boolean>): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
    }

    const token = this.getAuthToken();
    return this.request<T>(endpoint, {
      method: 'POST',
      body: formData,
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    });
  }

  // Get auth token from localStorage
  private getAuthToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('authToken');
    }
    return null;
  }

  // Set auth token
  setAuthToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('authToken', token);
    }
  }

  // Clear auth token
  clearAuthToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
    }
  }
}

// Create singleton instance
export const apiService = new ApiService();

// Specific API service functions
export const authService = {
  login: async (credentials: { email: string; password: string }) => {
    return apiService.post(API_ENDPOINTS.AUTH.LOGIN, credentials);
  },

  register: async (userData: { name: string; email: string; password: string; role?: string }) => {
    return apiService.post(API_ENDPOINTS.AUTH.REGISTER, userData);
  },

  logout: async () => {
    return apiService.post(API_ENDPOINTS.AUTH.LOGOUT);
  },

  refreshToken: async () => {
    return apiService.post(API_ENDPOINTS.AUTH.REFRESH);
  },

  forgotPassword: async (email: string) => {
    return apiService.post(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, { email });
  },

  resetPassword: async (token: string, password: string) => {
    return apiService.post(API_ENDPOINTS.AUTH.RESET_PASSWORD, { token, password });
  },

  getProfile: async () => {
    return apiService.get(API_ENDPOINTS.AUTH.PROFILE);
  },
};

export const productService = {
  getAllProducts: async (queryParams?: Record<string, string | number | boolean>) => {
    return apiService.get(API_ENDPOINTS.PRODUCTS.GET_ALL, undefined, queryParams);
  },

  getProductById: async (id: string | number) => {
    return apiService.get(API_ENDPOINTS.PRODUCTS.GET_BY_ID, { id });
  },

  searchProducts: async (query: string, filters?: Record<string, string | number | boolean>) => {
    return apiService.get(API_ENDPOINTS.PRODUCTS.SEARCH, undefined, { q: query, ...filters });
  },

  getProductsByCategory: async (category: string, queryParams?: Record<string, string | number | boolean>) => {
    return apiService.get(API_ENDPOINTS.PRODUCTS.GET_BY_CATEGORY, { category }, queryParams);
  },

  getFeaturedProducts: async () => {
    return apiService.get(API_ENDPOINTS.PRODUCTS.GET_FEATURED);
  },

  getRelatedProducts: async (id: string | number) => {
    return apiService.get(API_ENDPOINTS.PRODUCTS.GET_RELATED, { id });
  },

  getCategories: async () => {
    return apiService.get(API_ENDPOINTS.PRODUCTS.GET_CATEGORIES);
  },

  getProductReviews: async (id: string | number) => {
    return apiService.get(API_ENDPOINTS.PRODUCTS.GET_REVIEWS, { id });
  },

  addProductReview: async (id: string | number, review: { rating: number; comment: string; userName?: string }) => {
    return apiService.post(API_ENDPOINTS.PRODUCTS.ADD_REVIEW, review, { id });
  },
};

export const cartService = {
  getCart: async () => {
    return apiService.get(API_ENDPOINTS.CART.GET_CART);
  },

  addItem: async (productId: string | number, quantity: number) => {
    return apiService.post(API_ENDPOINTS.CART.ADD_ITEM, { productId, quantity });
  },

  updateItem: async (productId: string | number, quantity: number) => {
    return apiService.put(API_ENDPOINTS.CART.UPDATE_ITEM, { productId, quantity });
  },

  removeItem: async (productId: string | number) => {
    return apiService.delete(API_ENDPOINTS.CART.REMOVE_ITEM, { productId });
  },

  clearCart: async () => {
    return apiService.delete(API_ENDPOINTS.CART.CLEAR_CART);
  },

  getCartCount: async () => {
    return apiService.get(API_ENDPOINTS.CART.GET_COUNT);
  },

  getCartTotal: async () => {
    return apiService.get(API_ENDPOINTS.CART.GET_TOTAL);
  },
};

export const wishlistService = {
  getWishlist: async () => {
    return apiService.get(API_ENDPOINTS.WISHLIST.GET_WISHLIST);
  },

  addItem: async (productId: string | number) => {
    return apiService.post(API_ENDPOINTS.WISHLIST.ADD_ITEM, { productId });
  },

  removeItem: async (productId: string | number) => {
    return apiService.delete(API_ENDPOINTS.WISHLIST.REMOVE_ITEM, { productId });
  },

  clearWishlist: async () => {
    return apiService.delete(API_ENDPOINTS.WISHLIST.CLEAR_WISHLIST);
  },

  getWishlistCount: async () => {
    return apiService.get(API_ENDPOINTS.WISHLIST.GET_COUNT);
  },
};

export const orderService = {
  createOrder: async (orderData: Record<string, unknown>) => {
    return apiService.post(API_ENDPOINTS.ORDERS.CREATE_ORDER, orderData);
  },

  getOrders: async (queryParams?: Record<string, string | number | boolean>) => {
    return apiService.get(API_ENDPOINTS.ORDERS.GET_ORDERS, undefined, queryParams);
  },

  getOrderById: async (id: string | number) => {
    return apiService.get(API_ENDPOINTS.ORDERS.GET_ORDER_BY_ID, { id });
  },

  updateOrderStatus: async (id: string | number, status: string) => {
    return apiService.put(API_ENDPOINTS.ORDERS.UPDATE_ORDER_STATUS, { status }, { id });
  },

  cancelOrder: async (id: string | number) => {
    return apiService.put(API_ENDPOINTS.ORDERS.CANCEL_ORDER, {}, { id });
  },

  trackOrder: async (id: string | number) => {
    return apiService.get(API_ENDPOINTS.ORDERS.TRACK_ORDER, { id });
  },
};

export const userService = {
  getProfile: async () => {
    return apiService.get(API_ENDPOINTS.USER.GET_PROFILE);
  },

  updateProfile: async (profileData: Record<string, unknown>) => {
    return apiService.put(API_ENDPOINTS.USER.UPDATE_PROFILE, profileData);
  },

  changePassword: async (passwordData: { currentPassword: string; newPassword: string }) => {
    return apiService.put(API_ENDPOINTS.USER.CHANGE_PASSWORD, passwordData);
  },

  uploadAvatar: async (file: File) => {
    return apiService.uploadFile(API_ENDPOINTS.USER.UPLOAD_AVATAR, file);
  },

  getUserOrders: async (queryParams?: Record<string, string | number | boolean>) => {
    return apiService.get(API_ENDPOINTS.USER.GET_ORDERS, undefined, queryParams);
  },

  deleteAccount: async () => {
    return apiService.delete(API_ENDPOINTS.USER.DELETE_ACCOUNT);
  },
};

export const searchService = {
  searchProducts: async (query: string, filters?: Record<string, string | number | boolean>) => {
    return apiService.get(API_ENDPOINTS.SEARCH.PRODUCTS, undefined, { q: query, ...filters });
  },

  searchCompanies: async (query: string) => {
    return apiService.get(API_ENDPOINTS.SEARCH.COMPANIES, undefined, { q: query });
  },

  getSuggestions: async (query: string) => {
    return apiService.get(API_ENDPOINTS.SEARCH.SUGGESTIONS, undefined, { q: query });
  },

  getPopularSearches: async () => {
    return apiService.get(API_ENDPOINTS.SEARCH.POPULAR);
  },
};

export const categoryService = {
  getAllCategories: async () => {
    return apiService.get(API_ENDPOINTS.CATEGORIES.GET_ALL);
  },

  getCategoryById: async (id: string | number) => {
    return apiService.get(API_ENDPOINTS.CATEGORIES.GET_BY_ID, { id });
  },

  getCategoryProducts: async (id: string | number, queryParams?: Record<string, string | number | boolean>) => {
    return apiService.get(API_ENDPOINTS.CATEGORIES.GET_PRODUCTS, { id }, queryParams);
  },

  getSubcategories: async (id: string | number) => {
    return apiService.get(API_ENDPOINTS.CATEGORIES.GET_SUBCATEGORIES, { id });
  },
};

export const companyService = {
  getAllCompanies: async (queryParams?: Record<string, string | number | boolean>) => {
    return apiService.get(API_ENDPOINTS.COMPANIES.GET_ALL, undefined, queryParams);
  },

  getCompanyById: async (id: string | number) => {
    return apiService.get(API_ENDPOINTS.COMPANIES.GET_BY_ID, { id });
  },

  getCompanyProducts: async (id: string | number, queryParams?: Record<string, string | number | boolean>) => {
    return apiService.get(API_ENDPOINTS.COMPANIES.GET_PRODUCTS, { id }, queryParams);
  },

  getCompanyProfile: async () => {
    return apiService.get(API_ENDPOINTS.COMPANIES.GET_PROFILE);
  },

  updateCompanyProfile: async (profileData: Record<string, unknown>) => {
    return apiService.put(API_ENDPOINTS.COMPANIES.UPDATE_PROFILE, profileData);
  },

  verifyCompany: async (verificationData: Record<string, unknown>) => {
    return apiService.post(API_ENDPOINTS.COMPANIES.VERIFY_COMPANY, verificationData);
  },
};

export default apiService;

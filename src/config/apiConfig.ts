// config/api.ts

// API Configuration
export const API_CONFIG = {
  // Use empty string for same-origin requests (works for both dev and production)
  BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || '',
  API_VERSION: '', // Not needed since routes already start with /api
  TIMEOUT: 30000, // 30 seconds
  USE_STATIC_DATA: false, // Always use API in production
};

// API Endpoints
export const API_ENDPOINTS = {
  // Authentication endpoints
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    LOGOUT: '/api/auth/logout',
    REFRESH: '/api/auth/refresh',
    FORGOT_PASSWORD: '/api/auth/forgot-password',
    RESET_PASSWORD: '/api/auth/reset-password',
    VERIFY_EMAIL: '/api/auth/verify-email',
    PROFILE: '/api/auth/profile',
  },

  // User endpoints
  USER: {
    GET_PROFILE: '/api/user/profile',
    UPDATE_PROFILE: '/api/user/profile',
    CHANGE_PASSWORD: '/api/user/profile/password',
    UPLOAD_AVATAR: '/api/user/avatar',
    GET_ORDERS: '/api/user/orders',
    GET_WISHLIST: '/api/user/wishlist',
    DELETE_ACCOUNT: '/api/user/delete',
  },

  // Product endpoints
  PRODUCTS: {
    GET_ALL: '/api/products',
    GET_BY_ID: '/api/products/:id',
    SEARCH: '/api/products/search',
    GET_BY_CATEGORY: '/api/products/category/:category',
    GET_CATEGORIES: '/api/products/categories',
    GET_FEATURED: '/api/products?featured=true', // Query param instead of path
    GET_RELATED: '/api/products/:id/related',
    GET_REVIEWS: '/api/products/:id/reviews',
    ADD_REVIEW: '/api/products/:id/reviews',
    GET_SPECIFICATIONS: '/api/products/:id/specifications',
  },

  // Company/Seller endpoints
  COMPANIES: {
    GET_ALL: '/api/companies',
    GET_BY_ID: '/api/companies/:id',
    GET_PRODUCTS: '/api/companies/:id/products',
    GET_PROFILE: '/api/companies/profile',
    UPDATE_PROFILE: '/api/companies/profile',
    VERIFY_COMPANY: '/api/companies/verify',
  },

  // Cart endpoints
  CART: {
    GET_CART: '/api/cart',
    ADD_ITEM: '/api/cart/add',
    UPDATE_ITEM: '/api/cart/update',
    REMOVE_ITEM: '/api/cart/remove',
    CLEAR_CART: '/api/cart/clear',
    GET_COUNT: '/api/cart/count',
    GET_TOTAL: '/api/cart/total',
  },

  // Wishlist endpoints
  WISHLIST: {
    GET_WISHLIST: '/api/wishlist',
    ADD_ITEM: '/api/wishlist/add',
    REMOVE_ITEM: '/api/wishlist/remove',
    CLEAR_WISHLIST: '/api/wishlist/clear',
    GET_COUNT: '/api/wishlist/count',
  },

  // Order endpoints
  ORDERS: {
    CREATE_ORDER: '/api/orders',
    GET_ORDERS: '/api/orders',
    GET_ORDER_BY_ID: '/api/orders/:id',
    UPDATE_ORDER_STATUS: '/api/orders/:id/status',
    CANCEL_ORDER: '/api/orders/:id/cancel',
    GET_ORDER_HISTORY: '/api/orders/history',
    TRACK_ORDER: '/api/orders/:id/track',
  },

  // Category endpoints
  CATEGORIES: {
    GET_ALL: '/api/categories',
    GET_BY_ID: '/api/categories/:id',
    GET_PRODUCTS: '/api/categories/:id/products',
    GET_SUBCATEGORIES: '/api/categories/:id/subcategories',
  },

  // Search endpoints
  SEARCH: {
    PRODUCTS: '/api/search/products',
    COMPANIES: '/api/search/companies',
    SUGGESTIONS: '/api/search/suggestions',
    POPULAR: '/api/search/popular',
  },

  // File upload endpoints
  UPLOAD: {
    PRODUCT_IMAGE: '/api/upload/product-image',
    COMPANY_LOGO: '/api/upload/company-logo',
    USER_AVATAR: '/api/upload/user-avatar',
    BULK_PRODUCTS: '/api/upload/bulk-products',
  },

  // Analytics endpoints
  ANALYTICS: {
    PRODUCT_VIEWS: '/api/analytics/product-views',
    POPULAR_PRODUCTS: '/api/analytics/popular-products',
    SEARCH_TRENDS: '/api/analytics/search-trends',
    SALES_REPORT: '/api/analytics/sales-report',
  },

  // Notification endpoints
  NOTIFICATIONS: {
    GET_ALL: '/api/notifications',
    MARK_READ: '/api/notifications/:id/read',
    MARK_ALL_READ: '/api/notifications/mark-all-read',
    GET_UNREAD_COUNT: '/api/notifications/unread-count',
    DELETE: '/api/notifications/:id',
  },

  // Settings endpoints
  SETTINGS: {
    GET_SETTINGS: '/api/settings',
    UPDATE_SETTINGS: '/api/settings',
    GET_PAYMENT_METHODS: '/api/settings/payment-methods',
    UPDATE_PAYMENT_METHOD: '/api/settings/payment-methods',
    GET_SHIPPING_ADDRESSES: '/api/settings/shipping-addresses',
    ADD_SHIPPING_ADDRESS: '/api/settings/shipping-addresses',
    UPDATE_SHIPPING_ADDRESS: '/api/settings/shipping-addresses/:id',
    DELETE_SHIPPING_ADDRESS: '/api/settings/shipping-addresses/:id',
  },
};

// Helper function to build complete API URL
export const buildApiUrl = (endpoint: string, params?: Record<string, string | number>): string => {
  // Ensure endpoint starts with / and doesn't have double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  // If BASE_URL is empty, use same-origin (relative path)
  let url = API_CONFIG.BASE_URL ? `${API_CONFIG.BASE_URL}${cleanEndpoint}` : cleanEndpoint;
  
  // Replace path parameters
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url = url.replace(`:${key}`, String(value));
    });
  }
  
  return url;
};

// Helper function to build query string
export const buildQueryString = (params: Record<string, any>): string => {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        value.forEach(v => searchParams.append(key, String(v)));
      } else {
        searchParams.append(key, String(value));
      }
    }
  });
  
  return searchParams.toString();
};

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: Record<string, string[]>;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Common API request options
export const getRequestOptions = (token?: string): RequestInit => ({
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  },
  credentials: 'include',
});

// API Error types
export interface ApiError {
  status: number;
  message: string;
  errors?: Record<string, string[]>;
}

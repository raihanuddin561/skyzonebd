// config/api.ts

// API Configuration
export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8081',
  API_VERSION: '/api/v1',
  TIMEOUT: 30000, // 30 seconds
};

// API Endpoints
export const API_ENDPOINTS = {
  // Authentication endpoints
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    VERIFY_EMAIL: '/auth/verify-email',
    PROFILE: '/auth/profile',
  },

  // User endpoints
  USER: {
    GET_PROFILE: '/users/profile',
    UPDATE_PROFILE: '/users/profile',
    CHANGE_PASSWORD: '/users/change-password',
    UPLOAD_AVATAR: '/users/avatar',
    GET_ORDERS: '/users/orders',
    GET_WISHLIST: '/users/wishlist',
    DELETE_ACCOUNT: '/users/delete',
  },

  // Product endpoints
  PRODUCTS: {
    GET_ALL: '/products',
    GET_BY_ID: '/products/:id',
    SEARCH: '/products/search',
    GET_BY_CATEGORY: '/products/category/:category',
    GET_CATEGORIES: '/products/categories',
    GET_FEATURED: '/products/featured',
    GET_RELATED: '/products/:id/related',
    GET_REVIEWS: '/products/:id/reviews',
    ADD_REVIEW: '/products/:id/reviews',
    GET_SPECIFICATIONS: '/products/:id/specifications',
  },

  // Company/Seller endpoints
  COMPANIES: {
    GET_ALL: '/companies',
    GET_BY_ID: '/companies/:id',
    GET_PRODUCTS: '/companies/:id/products',
    GET_PROFILE: '/companies/profile',
    UPDATE_PROFILE: '/companies/profile',
    VERIFY_COMPANY: '/companies/verify',
  },

  // Cart endpoints
  CART: {
    GET_CART: '/cart',
    ADD_ITEM: '/cart/add',
    UPDATE_ITEM: '/cart/update',
    REMOVE_ITEM: '/cart/remove',
    CLEAR_CART: '/cart/clear',
    GET_COUNT: '/cart/count',
    GET_TOTAL: '/cart/total',
  },

  // Wishlist endpoints
  WISHLIST: {
    GET_WISHLIST: '/wishlist',
    ADD_ITEM: '/wishlist/add',
    REMOVE_ITEM: '/wishlist/remove',
    CLEAR_WISHLIST: '/wishlist/clear',
    GET_COUNT: '/wishlist/count',
  },

  // Order endpoints
  ORDERS: {
    CREATE_ORDER: '/orders',
    GET_ORDERS: '/orders',
    GET_ORDER_BY_ID: '/orders/:id',
    UPDATE_ORDER_STATUS: '/orders/:id/status',
    CANCEL_ORDER: '/orders/:id/cancel',
    GET_ORDER_HISTORY: '/orders/history',
    TRACK_ORDER: '/orders/:id/track',
  },

  // Category endpoints
  CATEGORIES: {
    GET_ALL: '/categories',
    GET_BY_ID: '/categories/:id',
    GET_PRODUCTS: '/categories/:id/products',
    GET_SUBCATEGORIES: '/categories/:id/subcategories',
  },

  // Search endpoints
  SEARCH: {
    PRODUCTS: '/search/products',
    COMPANIES: '/search/companies',
    SUGGESTIONS: '/search/suggestions',
    POPULAR: '/search/popular',
  },

  // File upload endpoints
  UPLOAD: {
    PRODUCT_IMAGE: '/upload/product-image',
    COMPANY_LOGO: '/upload/company-logo',
    USER_AVATAR: '/upload/user-avatar',
    BULK_PRODUCTS: '/upload/bulk-products',
  },

  // Analytics endpoints
  ANALYTICS: {
    PRODUCT_VIEWS: '/analytics/product-views',
    POPULAR_PRODUCTS: '/analytics/popular-products',
    SEARCH_TRENDS: '/analytics/search-trends',
    SALES_REPORT: '/analytics/sales-report',
  },

  // Notification endpoints
  NOTIFICATIONS: {
    GET_ALL: '/notifications',
    MARK_READ: '/notifications/:id/read',
    MARK_ALL_READ: '/notifications/mark-all-read',
    GET_UNREAD_COUNT: '/notifications/unread-count',
    DELETE: '/notifications/:id',
  },

  // Settings endpoints
  SETTINGS: {
    GET_SETTINGS: '/settings',
    UPDATE_SETTINGS: '/settings',
    GET_PAYMENT_METHODS: '/settings/payment-methods',
    UPDATE_PAYMENT_METHOD: '/settings/payment-methods',
    GET_SHIPPING_ADDRESSES: '/settings/shipping-addresses',
    ADD_SHIPPING_ADDRESS: '/settings/shipping-addresses',
    UPDATE_SHIPPING_ADDRESS: '/settings/shipping-addresses/:id',
    DELETE_SHIPPING_ADDRESS: '/settings/shipping-addresses/:id',
  },

  // Admin endpoints (if needed)
  ADMIN: {
    GET_DASHBOARD: '/admin/dashboard',
    GET_USERS: '/admin/users',
    GET_COMPANIES: '/admin/companies',
    GET_ORDERS: '/admin/orders',
    GET_PRODUCTS: '/admin/products',
    APPROVE_COMPANY: '/admin/companies/:id/approve',
    REJECT_COMPANY: '/admin/companies/:id/reject',
    SUSPEND_USER: '/admin/users/:id/suspend',
  },
};

// Helper function to build complete API URL
export const buildApiUrl = (endpoint: string, params?: Record<string, string | number>): string => {
  let url = `${API_CONFIG.BASE_URL}${API_CONFIG.API_VERSION}${endpoint}`;
  
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
export const DEFAULT_REQUEST_OPTIONS: RequestInit = {
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  credentials: 'include', // Include cookies for authentication
};

// API Error types
export interface ApiError {
  status: number;
  message: string;
  errors?: Record<string, string[]>;
}

// Environment-specific configurations
export const ENV_CONFIG = {
  development: {
    API_BASE_URL: 'http://localhost:8081',
    DEBUG: true,
    LOG_LEVEL: 'debug',
  },
  production: {
    API_BASE_URL: 'https://skyzonebd.shop',
    DEBUG: false,
    LOG_LEVEL: 'error',
  },
  staging: {
    API_BASE_URL: 'https://staging-api.skyzonebd.com',
    DEBUG: true,
    LOG_LEVEL: 'warn',
  },
};

// Get current environment config
export const getCurrentConfig = () => {
  const env = process.env.NODE_ENV || 'development';
  return ENV_CONFIG[env as keyof typeof ENV_CONFIG] || ENV_CONFIG.development;
};

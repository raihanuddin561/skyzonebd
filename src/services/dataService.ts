// services/dataService.ts
// Production version - uses ONLY API calls, no static data

import { 
  productService, 
  categoryService, 
  searchService, 
  companyService
} from './apiService';
import { Product } from '@/types/cart';

// Debug logging
if (typeof window !== 'undefined') {
  console.log('🔧 DataService: Using real database via API only');
}

// Helper function to handle API calls with error handling
const apiCall = async <T>(
  call: () => Promise<T>,
  fallbackValue: T
): Promise<T> => {
  try {
    return await call();
  } catch (error) {
    console.error('❌ API call failed:', error);
    return fallbackValue;
  }
};

export const dataService = {
  // Products
  products: {
    // Returns the full { products, pagination, categories } payload (not
    // just the products array) so server-side search/filter/sort/pagination
    // — already computed by the API — can actually be surfaced by callers
    // like src/app/products/page.tsx, instead of being silently discarded
    // and refetched-then-re-filtered client-side over a fixed 100-row page.
    getAll: async (queryParams?: Record<string, string | number | boolean>) => {
      return apiCall(
        async () => {
          const response = await productService.getAllProducts(queryParams);
          return (response.data as { products?: unknown[]; pagination?: unknown; categories?: unknown[] }) || { products: [], pagination: null, categories: [] };
        },
        { products: [] as unknown[], pagination: null, categories: [] as unknown[] }
      );
    },

    getById: async (id: number | string) => {
      return apiCall(
        async () => {
          const response = await productService.getProductById(id);
          return (response.data as { product?: unknown })?.product || response.data;
        },
        null
      );
    },

    getByCategory: async (category: string, queryParams?: Record<string, string | number>) => {
      return apiCall(
        async () => {
          const response = await productService.getProductsByCategory(category, queryParams);
          return (response.data as { products?: unknown[] })?.products || response.data || [];
        },
        []
      );
    },

    getFeatured: async (): Promise<Product[]> => {
      return apiCall(
        async () => {
          const response = await productService.getFeaturedProducts();
          console.log('✨ Featured products API response:', response);
          const products = (response.data as { products?: Product[] })?.products || (response.data as Product[]) || [];
          console.log('📦 Featured products count:', products.length);
          return products;
        },
        [] as Product[]
      );
    },

    getRelated: async (id: number | string) => {
      return apiCall(
        async () => {
          const response = await productService.getRelatedProducts(id);
          return (response.data as { relatedProducts?: unknown[] })?.relatedProducts || response.data || [];
        },
        []
      );
    },

    getFrequentlyBoughtTogether: async (id: number | string) => {
      return apiCall(
        async () => {
          const response = await productService.getFrequentlyBoughtTogether(id);
          return (response.data as { frequentlyBoughtTogether?: unknown[] })?.frequentlyBoughtTogether || [];
        },
        []
      );
    },

    getByIds: async (ids: string[]) => {
      if (ids.length === 0) return [];
      return apiCall(
        async () => {
          const response = await productService.getProductsByIds(ids);
          return (response.data as { products?: unknown[] })?.products || [];
        },
        []
      );
    },

    search: async (query: string, filters?: Record<string, string | number | boolean>) => {
      return apiCall(
        async () => {
          const response = await searchService.searchProducts(query, filters);
          return response.data;
        },
        []
      );
    },

    getReviews: async (id: number) => {
      return apiCall(
        async () => {
          const response = await productService.getProductReviews(id);
          return response.data;
        },
        []
      );
    },

    addReview: async (productId: string | number, review: { rating: number; comment: string; userName?: string }) => {
      return apiCall(
        async () => {
          const response = await productService.addProductReview(productId, review);
          return response.data;
        },
        { success: false, message: 'Failed to add review' }
      );
    }
  },

  // Categories
  categories: {
    getAll: async () => {
      return apiCall(
        async () => {
          const response = await categoryService.getAllCategories();
          return Array.isArray(response.data) ? response.data : ((response.data as { categories?: unknown[] })?.categories || response.data || []);
        },
        []
      );
    },

    getById: async (id: string | number) => {
      return apiCall(
        async () => {
          const response = await categoryService.getCategoryById(id);
          return response.data;
        },
        null
      );
    },

    getProductsByCategory: async (categoryId: string | number) => {
      return apiCall(
        async () => {
          const response = await categoryService.getCategoryProducts(categoryId);
          return response.data;
        },
        []
      );
    }
  },

  // Search
  search: {
    // Same shape as products.getAll above (search now goes through the same
    // canonical /api/products endpoint) — returns pagination too, so
    // src/app/search/page.tsx can paginate server-side instead of fetching
    // an unbounded result set and slicing it client-side.
    products: async (query: string, filters?: Record<string, string | number | boolean>) => {
      return apiCall(
        async () => {
          const response = await searchService.searchProducts(query, filters);
          return (response.data as { products?: unknown[]; pagination?: unknown }) || { products: [], pagination: null };
        },
        { products: [] as unknown[], pagination: null }
      );
    },

    suggestions: async (query: string) => {
      return apiCall(
        async () => {
          const response = await searchService.getSuggestions(query);
          return (response.data as { suggestions?: unknown[] })?.suggestions || response.data || [];
        },
        []
      );
    },

    popular: async () => {
      return apiCall(
        async () => {
          const response = await searchService.getPopularSearches();
          return (response.data as { searches?: unknown[] })?.searches || response.data || [];
        },
        []
      );
    },

    companies: async (query: string) => {
      return apiCall(
        async () => {
          const response = await searchService.searchCompanies(query);
          return (response.data as { companies?: unknown[] })?.companies || response.data || [];
        },
        []
      );
    }
  },

  // Companies
  companies: {
    getAll: async () => {
      return apiCall(
        async () => {
          const response = await companyService.getAllCompanies();
          return (response.data as { companies?: unknown[] })?.companies || response.data || [];
        },
        []
      );
    },

    getById: async (id: string | number) => {
      return apiCall(
        async () => {
          const response = await companyService.getCompanyById(id);
          return (response.data as { company?: unknown })?.company || response.data;
        },
        null
      );
    },

    getProducts: async (companyId: string | number) => {
      return apiCall(
        async () => {
          const response = await companyService.getCompanyProducts(companyId);
          return (response.data as { products?: unknown[] })?.products || response.data || [];
        },
        []
      );
    }
  }
};

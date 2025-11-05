// services/dataService.ts

import { 
  allProducts, 
  categories, 
  getProductById, 
  searchProducts, 
  getProductsByCategory
} from '@/data/products';
import { 
  productService, 
  categoryService, 
  searchService, 
  companyService
} from './apiService';
import { Product } from '@/types/cart';

// Configuration to switch between static data and API
// IMPORTANT: Always use API - static data removed for production
const USE_API = true;
const ENABLE_FALLBACK = false; // Disable fallback to static data

// Debug logging
if (typeof window !== 'undefined') {
  console.log('🔧 DataService Configuration:', {
    USE_API: true,
    ENABLE_FALLBACK: false,
    message: 'Using real database data via API'
  });
}

// Helper functions for static data
const getFeaturedProducts = () => {
  return allProducts.filter(product => product.rating && product.rating >= 4.5);
};

const getRelatedProducts = (id: number) => {
  const product = getProductById(id);
  if (!product) return [];
  return allProducts.filter(p => 
    p.category === product.category && 
    p.id !== id
  ).slice(0, 4);
};

// Helper function to handle API calls
const withFallback = async <T>(
  apiCall: () => Promise<T>,
  fallbackData: T,
  fallbackFunction?: () => T
): Promise<T> => {
  if (!USE_API) {
    return fallbackFunction ? fallbackFunction() : fallbackData;
  }

  try {
    const response = await apiCall();
    return response;
  } catch (error) {
    console.error('API call failed:', error);
    
    // Only use fallback if explicitly enabled (disabled by default)
    if (ENABLE_FALLBACK) {
      console.warn('Using fallback data (not recommended for production)');
      return fallbackFunction ? fallbackFunction() : fallbackData;
    }
    
    // Return empty data structure instead of fallback
    console.error('Fallback disabled - returning empty data');
    if (Array.isArray(fallbackData)) {
      return [] as T;
    }
    throw error;
  }
};

// Product data service
export const dataService = {
  // Products
  products: {
    getAll: async (queryParams?: {
      page?: number;
      limit?: number;
      category?: string;
      minPrice?: number;
      maxPrice?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      search?: string;
    }) => {
      return withFallback(
        async () => {
          const response = await productService.getAllProducts(queryParams);
          // API returns { success, data: { products: [...], pagination: {...} } }
          return (response.data as { products?: unknown[] })?.products || response.data || [];
        },
        allProducts,
        () => {
          let filteredProducts = [...allProducts];
          
          // Apply category filter
          if (queryParams?.category) {
            filteredProducts = filteredProducts.filter(p => 
              p.category?.toLowerCase() === queryParams.category?.toLowerCase()
            );
          }
          
          // Apply price filter
          if (queryParams?.minPrice !== undefined) {
            filteredProducts = filteredProducts.filter(p => p.price >= queryParams.minPrice!);
          }
          if (queryParams?.maxPrice !== undefined) {
            filteredProducts = filteredProducts.filter(p => p.price <= queryParams.maxPrice!);
          }
          
          // Apply search filter
          if (queryParams?.search) {
            filteredProducts = searchProducts(queryParams.search);
          }
          
          // Apply sorting
          if (queryParams?.sortBy) {
            filteredProducts.sort((a, b) => {
              const sortBy = queryParams.sortBy as keyof typeof a;
              const aValue = a[sortBy] ?? 0;
              const bValue = b[sortBy] ?? 0;
              
              if (queryParams.sortOrder === 'desc') {
                return bValue > aValue ? 1 : -1;
              }
              return aValue > bValue ? 1 : -1;
            });
          }
          
          // Apply pagination
          const page = queryParams?.page || 1;
          const limit = queryParams?.limit || 12;
          const startIndex = (page - 1) * limit;
          const endIndex = startIndex + limit;
          
          return {
            products: filteredProducts.slice(startIndex, endIndex),
            total: filteredProducts.length,
            page,
            limit,
            totalPages: Math.ceil(filteredProducts.length / limit)
          };
        }
      );
    },

    getById: async (id: number | string) => {
      return withFallback(
        async () => {
          const response = await productService.getProductById(id);
          // API returns { success, data: { product, relatedProducts } }
          return (response.data as { product?: unknown })?.product || response.data;
        },
        null,
        () => getProductById(typeof id === 'number' ? id : parseInt(id, 10))
      );
    },

    getByCategory: async (category: string, queryParams?: Record<string, string | number>) => {
      return withFallback(
        async () => {
          const response = await productService.getProductsByCategory(category, queryParams);
          return (response.data as { products?: unknown[] })?.products || response.data || [];
        },
        [],
        () => getProductsByCategory(category)
      );
    },

    getFeatured: async (): Promise<Product[]> => {
      return withFallback(
        async () => {
          const response = await productService.getFeaturedProducts();
          // API returns { success, data: { products: [...] } }
          return (response.data as { products?: Product[] })?.products || (response.data as Product[]) || [];
        },
        [] as Product[],
        () => getFeaturedProducts()
      );
    },

    getRelated: async (id: number | string) => {
      return withFallback(
        async () => {
          const response = await productService.getRelatedProducts(id);
          // API returns { success, data: { product, relatedProducts } }
          return (response.data as { relatedProducts?: unknown[] })?.relatedProducts || response.data || [];
        },
        [],
        () => getRelatedProducts(typeof id === 'number' ? id : parseInt(id, 10))
      );
    },

    search: async (query: string, filters?: Record<string, string | number | boolean>) => {
      return withFallback(
        async () => {
          const response = await searchService.searchProducts(query, filters);
          return response.data;
        },
        [],
        () => searchProducts(query)
      );
    },

    getReviews: async (id: number) => {
      return withFallback(
        async () => {
          const response = await productService.getProductReviews(id);
          return response.data;
        },
        [],
        () => {
          // Static reviews data
          return [
            {
              id: 1,
              userId: 1,
              userName: 'John Doe',
              rating: 5,
              comment: 'Great product! Highly recommended.',
              date: '2024-01-15',
              verified: true
            },
            {
              id: 2,
              userId: 2,
              userName: 'Jane Smith',
              rating: 4,
              comment: 'Good quality, fast shipping.',
              date: '2024-01-10',
              verified: true
            }
          ];
        }
      );
    },

    addReview: async (productId: string | number, review: { rating: number; comment: string; userName?: string }) => {
      return withFallback(
        async () => {
          const response = await productService.addProductReview(productId, review);
          return response.data;
        },
        { success: true, message: 'Review added successfully' },
        () => {
          // For static data, just return success
          return { success: true, message: 'Review added successfully' };
        }
      );
    }
  },

  // Categories
  categories: {
    getAll: async () => {
      return withFallback(
        async () => {
          const response = await categoryService.getAllCategories();
          // API returns array directly or in data field
          return Array.isArray(response.data) ? response.data : ((response.data as { categories?: unknown[] })?.categories || response.data || []);
        },
        categories,
        () => categories
      );
    },

    getById: async (id: string | number) => {
      return withFallback(
        async () => {
          const response = await categoryService.getCategoryById(id);
          return response.data;
        },
        null,
        () => categories.find(c => c.id === String(id)) || null
      );
    },

    getProducts: async (id: string | number, queryParams?: Record<string, string | number>) => {
      return withFallback(
        async () => {
          const response = await categoryService.getCategoryProducts(id, queryParams);
          return response.data;
        },
        [],
        () => {
          const category = categories.find(c => c.id === String(id));
          if (!category) return [];
          return getProductsByCategory(category.name);
        }
      );
    },

    getSubcategories: async (id: number) => {
      return withFallback(
        async () => {
          const response = await categoryService.getSubcategories(id);
          return response.data;
        },
        [],
        () => {
          // Static subcategories logic
          return [];
        }
      );
    }
  },

  // Search
  search: {
    products: async (query: string, filters?: Record<string, string | number | boolean>) => {
      return withFallback(
        async () => {
          const response = await searchService.searchProducts(query, filters);
          return response.data;
        },
        [],
        () => searchProducts(query)
      );
    },

    companies: async (query: string) => {
      return withFallback(
        async () => {
          const response = await searchService.searchCompanies(query);
          return response.data;
        },
        [],
        () => {
          // Static companies data
          const companies = [
            { id: 1, name: 'Tech Solutions Inc', type: 'Technology' },
            { id: 2, name: 'Baby Care Co', type: 'Baby Products' },
            { id: 3, name: 'Electronics Hub', type: 'Electronics' }
          ];
          return companies.filter(c => 
            c.name.toLowerCase().includes(query.toLowerCase())
          );
        }
      );
    },

    getSuggestions: async (query: string) => {
      return withFallback(
        async () => {
          const response = await searchService.getSuggestions(query);
          return response.data;
        },
        [],
        () => {
          // Static suggestions based on products
          const suggestions = allProducts
            .filter((p: Product) => p.name.toLowerCase().includes(query.toLowerCase()))
            .slice(0, 5)
            .map((p: Product) => p.name);
          return suggestions;
        }
      );
    },

    getPopular: async () => {
      return withFallback(
        async () => {
          const response = await searchService.getPopularSearches();
          return response.data;
        },
        ['headphones', 'baby dress', 'electronics', 'puzzle game'],
        () => ['headphones', 'baby dress', 'electronics', 'puzzle game']
      );
    }
  },

  // Companies
  companies: {
    getAll: async (queryParams?: Record<string, string | number>) => {
      return withFallback(
        async () => {
          const response = await companyService.getAllCompanies(queryParams);
          return response.data;
        },
        [],
        () => {
          // Static companies data
          return [
            { id: 1, name: 'Tech Solutions Inc', type: 'Technology', verified: true },
            { id: 2, name: 'Baby Care Co', type: 'Baby Products', verified: true },
            { id: 3, name: 'Electronics Hub', type: 'Electronics', verified: false }
          ];
        }
      );
    },

    getById: async (id: number) => {
      return withFallback(
        async () => {
          const response = await companyService.getCompanyById(id);
          return response.data;
        },
        null,
        () => {
          // Static company data
          return {
            id,
            name: 'Sample Company',
            type: 'Technology',
            verified: true,
            description: 'Sample company description',
            location: 'Sample Location'
          };
        }
      );
    },

    getProducts: async (id: number, queryParams?: Record<string, string | number>) => {
      return withFallback(
        async () => {
          const response = await companyService.getCompanyProducts(id, queryParams);
          return response.data;
        },
        [],
        () => {
          // Return some products for the company
          return allProducts.slice(0, 3);
        }
      );
    }
  }
};

// Export individual services for backward compatibility
export const { products: productDataService, categories: categoryDataService, search: searchDataService, companies: companyDataService } = dataService;

export default dataService;

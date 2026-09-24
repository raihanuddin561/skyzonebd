// hooks/useProducts.ts

import { useState, useEffect } from 'react';
import { dataService } from '@/services/dataService';
import { Product } from '@/types/cart';
import { getRecentlyViewedIds } from '@/utils/recentlyViewed';

export interface ProductsPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Server-side search/filter/sort/pagination: `queryParams` is passed straight
// through to GET /api/products (search, category, minPrice, maxPrice,
// sortBy, page, limit), and the resulting pagination metadata is returned
// alongside the page of products — callers (src/app/products/page.tsx) drive
// pagination/filtering from this instead of fetching everything and
// filtering/slicing client-side.
export interface ProductsCategoryFacet {
  id: string;
  name: string;
  slug: string;
  count: number;
}

export const useProducts = (queryParams?: Record<string, string | number | boolean>) => {
  const [products, setProducts] = useState<any[]>([]);
  const [pagination, setPagination] = useState<ProductsPagination | null>(null);
  const [categories, setCategories] = useState<ProductsCategoryFacet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await dataService.products.getAll(queryParams) as {
          products?: any[];
          pagination?: ProductsPagination | null;
          categories?: ProductsCategoryFacet[];
        };
        if (cancelled) return;
        setProducts(data?.products || []);
        setPagination(data?.pagination || null);
        setCategories(data?.categories || []);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to fetch products');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchProducts();
    return () => { cancelled = true; };
  }, [JSON.stringify(queryParams)]);

  return { products, pagination, categories, loading, error, refetch: () => setProducts([]) };
};

export const useProduct = (id: number | string) => {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchProduct = async () => {
      try {
        setLoading(true);
        setError(null);
        // Convert to number if it looks like a numeric ID, otherwise keep as string
        const productId = typeof id === 'string' && !isNaN(Number(id)) ? Number(id) : id;
        const data = await dataService.products.getById(productId as number);
        if (cancelled) return;
        setProduct(data as Product | null);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to fetch product');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (id) {
      fetchProduct();
    }

    return () => { cancelled = true; };
  }, [id]);

  return { product, loading, error };
};

export const useProductsByCategory = (category: string, queryParams?: any) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await dataService.products.getByCategory(category, queryParams);
        if (cancelled) return;
        setProducts(data as Product[]);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to fetch products');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (category) {
      fetchProducts();
    }

    return () => { cancelled = true; };
  }, [category, JSON.stringify(queryParams)]);

  return { products, loading, error };
};

export const useFeaturedProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await dataService.products.getFeatured();
        console.log('✨ Featured products loaded:', data?.length || 0, 'products');
        if (data && data.length > 0) {
          console.log('📦 Sample product IDs:', (data as any[]).slice(0, 2).map(p => ({ 
            id: p.id, 
            type: typeof p.id,
            isCuid: typeof p.id === 'string' && p.id.startsWith('cm')
          })));
        }
        setProducts(data as Product[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch featured products');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  return { products, loading, error };
};

export const useRelatedProducts = (id: number | string) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        // Convert to number if it looks like a numeric ID, otherwise keep as string
        const productId = typeof id === 'string' && !isNaN(Number(id)) ? Number(id) : id;
        const data = await dataService.products.getRelated(productId as number);
        if (cancelled) return;
        setProducts(data as Product[]);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to fetch related products');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (id) {
      fetchProducts();
    }

    return () => { cancelled = true; };
  }, [id]);

  return { products, loading, error };
};

// Reads the localStorage recently-viewed list (utils/recentlyViewed.ts) and
// resolves it into full Product objects via the /api/products `ids` batch
// lookup, preserving the localStorage recency order (the API's `id: {in}`
// filter doesn't guarantee input order).
export const useRecentlyViewedProducts = (excludeProductId?: string) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ids = getRecentlyViewedIds(excludeProductId);
    if (ids.length === 0) {
      setProducts([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const data = await dataService.products.getByIds(ids) as Product[];
        if (cancelled) return;
        const byId = new Map(data.map((p) => [String(p.id), p]));
        const ordered = ids.map((id) => byId.get(id)).filter((p): p is Product => !!p);
        setProducts(ordered);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [excludeProductId]);

  return { products, loading };
};

export const useFrequentlyBoughtTogether = (id: number | string) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        const productId = typeof id === 'string' && !isNaN(Number(id)) ? Number(id) : id;
        const data = await dataService.products.getFrequentlyBoughtTogether(productId as number);
        if (cancelled) return;
        setProducts(data as Product[]);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to fetch frequently bought together products');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (id) {
      fetchProducts();
    }

    return () => { cancelled = true; };
  }, [id]);

  return { products, loading, error };
};

// Server-side paginated search (mirrors useProducts above) — `filters` may
// include page/limit/sortBy, passed straight through to the canonical
// /api/products endpoint via dataService.search.products.
export const useProductSearch = (query: string, filters?: Record<string, string | number | boolean>) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<ProductsPagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const searchProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await dataService.search.products(query, filters) as {
          products?: Product[];
          pagination?: ProductsPagination | null;
        };
        if (cancelled) return;
        setProducts(data?.products || []);
        setPagination(data?.pagination || null);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to search products');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (query) {
      searchProducts();
    } else {
      setProducts([]);
      setPagination(null);
      setLoading(false);
    }

    return () => { cancelled = true; };
  }, [query, JSON.stringify(filters)]);

  return { products, pagination, loading, error };
};

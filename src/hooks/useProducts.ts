// hooks/useProducts.ts

import { useState, useEffect } from 'react';
import { dataService } from '@/services/dataService';
import { Product } from '@/types/cart';

export const useProducts = (queryParams?: any) => {
  const [products, setProducts] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await dataService.products.getAll(queryParams);
        setProducts(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch products');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [JSON.stringify(queryParams)]);

  return { products, loading, error, refetch: () => setProducts(null) };
};

export const useProduct = (id: number | string) => {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        setError(null);
        // Convert to number if it looks like a numeric ID, otherwise keep as string
        const productId = typeof id === 'string' && !isNaN(Number(id)) ? Number(id) : id;
        const data = await dataService.products.getById(productId as number);
        setProduct(data as Product | null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch product');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchProduct();
    }
  }, [id]);

  return { product, loading, error };
};

export const useProductsByCategory = (category: string, queryParams?: any) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await dataService.products.getByCategory(category, queryParams);
        setProducts(data as Product[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch products');
      } finally {
        setLoading(false);
      }
    };

    if (category) {
      fetchProducts();
    }
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
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        // Convert to number if it looks like a numeric ID, otherwise keep as string
        const productId = typeof id === 'string' && !isNaN(Number(id)) ? Number(id) : id;
        const data = await dataService.products.getRelated(productId as number);
        setProducts(data as Product[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch related products');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchProducts();
    }
  }, [id]);

  return { products, loading, error };
};

export const useProductSearch = (query: string, filters?: any) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const searchProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await dataService.search.products(query, filters);
        setProducts(data as Product[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to search products');
      } finally {
        setLoading(false);
      }
    };

    if (query) {
      searchProducts();
    } else {
      setProducts([]);
      setLoading(false);
    }
  }, [query, JSON.stringify(filters)]);

  return { products, loading, error };
};

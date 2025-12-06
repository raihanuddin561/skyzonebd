// hooks/useSearch.ts

import { useState, useEffect } from 'react';
import { dataService } from '@/services/dataService';
import { Product } from '@/types/cart';

export const useSearch = (query: string, filters?: any) => {
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const searchProducts = async () => {
      if (!query.trim()) {
        setResults([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await dataService.search.products(query, filters);
        setResults(data as Product[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed');
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchProducts, 300);
    return () => clearTimeout(debounceTimer);
  }, [query, JSON.stringify(filters)]);

  return { results, loading, error };
};

export const useSearchSuggestions = (query: string) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!query.trim()) {
        setSuggestions([]);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await dataService.search.suggestions(query);
        setSuggestions(data as string[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch suggestions');
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounceTimer);
  }, [query]);

  return { suggestions, loading, error };
};

export const usePopularSearches = () => {
  const [searches, setSearches] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPopularSearches = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await dataService.search.popular();
        setSearches(data as string[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch popular searches');
      } finally {
        setLoading(false);
      }
    };

    fetchPopularSearches();
  }, []);

  return { searches, loading, error };
};

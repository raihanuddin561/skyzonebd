// contexts/WishlistContext.tsx
'use client'

import { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { Product } from '@/types/cart';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/utils/apiClient';

interface WishlistState {
  items: Product[];
}

interface WishlistContextType {
  items: Product[];
  addToWishlist: (product: Product) => void;
  removeFromWishlist: (productId: string | number) => void;
  isInWishlist: (productId: string | number) => boolean;
  clearWishlist: () => void;
  getTotalItems: () => number;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

type WishlistAction =
  | { type: 'ADD_TO_WISHLIST'; payload: Product }
  | { type: 'REMOVE_FROM_WISHLIST'; payload: string | number }
  | { type: 'CLEAR_WISHLIST' }
  | { type: 'LOAD_WISHLIST'; payload: Product[] };

function wishlistReducer(state: WishlistState, action: WishlistAction): WishlistState {
  switch (action.type) {
    case 'ADD_TO_WISHLIST':
      // Check if item already exists
      const existingItem = state.items.find(item => item.id === action.payload.id);
      if (existingItem) {
        return state; // Don't add duplicates
      }
      return {
        ...state,
        items: [...state.items, action.payload],
      };

    case 'REMOVE_FROM_WISHLIST':
      return {
        ...state,
        items: state.items.filter(item => item.id !== action.payload),
      };

    case 'CLEAR_WISHLIST':
      return {
        ...state,
        items: [],
      };

    case 'LOAD_WISHLIST':
      return {
        ...state,
        items: action.payload,
      };

    default:
      return state;
  }
}

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(wishlistReducer, { items: [] });
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // Persistence requires an account (per confirmed scope) — a guest's
  // wishlist stays in-memory-only, same as before this change. Once logged
  // in, the server copy replaces whatever was in memory; it does not merge
  // pre-login guest picks, since there's no server-side identity to merge
  // them into until this point.
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;

    let cancelled = false;
    (async () => {
      try {
        const response = await api.get('/api/wishlist');
        const data = await response.json();
        if (!cancelled && data.success) {
          dispatch({ type: 'LOAD_WISHLIST', payload: data.data.items });
        }
      } catch (error) {
        console.error('Error loading wishlist:', error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, authLoading]);

  const addToWishlist = (product: Product) => {
    dispatch({ type: 'ADD_TO_WISHLIST', payload: product });

    if (isAuthenticated) {
      api.post('/api/wishlist', { productId: product.id }).catch(error => {
        console.error('Error syncing wishlist add:', error);
      });
    }
  };

  const removeFromWishlist = (productId: string | number) => {
    dispatch({ type: 'REMOVE_FROM_WISHLIST', payload: productId });

    if (isAuthenticated) {
      api.delete(`/api/wishlist/${productId}`).catch(error => {
        console.error('Error syncing wishlist removal:', error);
      });
    }
  };

  const isInWishlist = (productId: string | number) => {
    return state.items.some(item => item.id === productId);
  };

  const clearWishlist = () => {
    const removedIds = state.items.map(item => item.id);
    dispatch({ type: 'CLEAR_WISHLIST' });

    if (isAuthenticated) {
      Promise.all(
        removedIds.map(id => api.delete(`/api/wishlist/${id}`))
      ).catch(error => {
        console.error('Error syncing wishlist clear:', error);
      });
    }
  };

  const getTotalItems = () => {
    return state.items.length;
  };

  return (
    <WishlistContext.Provider
      value={{
        items: state.items,
        addToWishlist,
        removeFromWishlist,
        isInWishlist,
        clearWishlist,
        getTotalItems,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
}

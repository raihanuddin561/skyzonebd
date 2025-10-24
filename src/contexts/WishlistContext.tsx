// contexts/WishlistContext.tsx
'use client'

import { createContext, useContext, useReducer, ReactNode } from 'react';
import { Product } from '@/types/cart';

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
  | { type: 'CLEAR_WISHLIST' };

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
    
    default:
      return state;
  }
}

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(wishlistReducer, { items: [] });

  const addToWishlist = (product: Product) => {
    dispatch({ type: 'ADD_TO_WISHLIST', payload: product });
  };

  const removeFromWishlist = (productId: string | number) => {
    dispatch({ type: 'REMOVE_FROM_WISHLIST', payload: productId });
  };

  const isInWishlist = (productId: string | number) => {
    return state.items.some(item => item.id === productId);
  };

  const clearWishlist = () => {
    dispatch({ type: 'CLEAR_WISHLIST' });
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

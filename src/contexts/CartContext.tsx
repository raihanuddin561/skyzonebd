'use client'

import React, { createContext, useContext, useReducer, useEffect, useState, ReactNode } from 'react';
import { CartItem, Product, CartContextType } from '@/types/cart';

// Cart Actions
type CartAction =
  | { type: 'ADD_TO_CART'; payload: { product: Product; quantity: number } }
  | { type: 'REMOVE_FROM_CART'; payload: { productId: string | number } }
  | { type: 'UPDATE_QUANTITY'; payload: { productId: string | number; quantity: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'LOAD_CART'; payload: { items: CartItem[] } };

// Cart Reducer
function cartReducer(state: CartItem[], action: CartAction): CartItem[] {
  switch (action.type) {
    case 'ADD_TO_CART': {
      const { product, quantity } = action.payload;
      
      // Check if item already exists in cart
      const existingItemIndex = state.findIndex(item => item.product.id === product.id);
      
      if (existingItemIndex >= 0) {
        // Update existing item quantity
        const newState = [...state];
        newState[existingItemIndex] = {
          ...newState[existingItemIndex],
          quantity: newState[existingItemIndex].quantity + quantity
        };
        return newState;
      } else {
        // Add new item to cart
        return [...state, { product, quantity }];
      }
    }
    
    case 'REMOVE_FROM_CART': {
      return state.filter(item => item.product.id !== action.payload.productId);
    }
    
    case 'UPDATE_QUANTITY': {
      const { productId, quantity } = action.payload;
      
      if (quantity <= 0) {
        return state.filter(item => item.product.id !== productId);
      }
      
      return state.map(item =>
        item.product.id === productId
          ? { ...item, quantity }
          : item
      );
    }
    
    case 'CLEAR_CART': {
      return [];
    }
    
    case 'LOAD_CART': {
      return action.payload.items;
    }
    
    default:
      return state;
  }
}

// Create Context
const CartContext = createContext<CartContextType | undefined>(undefined);

// Cart Provider Component
export function CartProvider({ children }: { children: ReactNode }) {
  const [items, dispatch] = useReducer(cartReducer, []);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedCart = localStorage.getItem('cart');
        if (savedCart) {
          const cartItems: CartItem[] = JSON.parse(savedCart);

          dispatch({ type: 'LOAD_CART', payload: { items: cartItems } });
        }
      } catch (error) {
        console.error('Error loading cart from localStorage:', error);
      }
      setIsLoaded(true);
    }
  }, []);

  // Save cart to localStorage whenever it changes (but only after initial load)
  useEffect(() => {
    if (typeof window !== 'undefined' && isLoaded) {

      localStorage.setItem('cart', JSON.stringify(items));
    }
  }, [items, isLoaded]);

  const addToCart = (product: Product, quantity: number) => {
    // Don't enforce MOQ here - let the UI components handle validation based on user type
    // This allows guests/retail to add any quantity, while wholesale validation happens in the UI
    dispatch({ type: 'ADD_TO_CART', payload: { product, quantity } });
  };

  const removeFromCart = (productId: string | number) => {
    dispatch({ type: 'REMOVE_FROM_CART', payload: { productId } });
  };

  const updateQuantity = (productId: string | number, quantity: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { productId, quantity } });
  };

  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' });
  };

  const getTotalItems = () => {
    return items.reduce((total, item) => total + item.quantity, 0);
  };

  const getTotalPrice = () => {
    return items.reduce((total, item) => total + (item.product.price * item.quantity), 0);
  };

  const value: CartContextType = {
    items,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getTotalItems,
    getTotalPrice,
    isLoaded
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

// Custom hook to use cart context
export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

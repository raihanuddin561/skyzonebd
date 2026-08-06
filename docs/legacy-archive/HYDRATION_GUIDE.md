# Hydration Error Prevention Guide

## What is Hydration?

Hydration is the process where React attaches event listeners to the server-rendered HTML. For hydration to work properly, the HTML rendered on the server must match the HTML rendered on the client.

## Common Causes of Hydration Errors

1. **Client-side only APIs**: `localStorage`, `sessionStorage`, `window`, `document`
2. **Random values**: `Math.random()`, `Date.now()`, `crypto.randomUUID()`
3. **User-specific data**: Data that depends on authentication state
4. **Browser-specific features**: User agent detection, screen size

## Solutions Implemented

### 1. Client-Side Detection Hook

```typescript
// hooks/useClientSide.ts
export const useClientSide = () => {
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  return isClient;
};
```

### 2. Safe localStorage Utility

```typescript
// utils/localStorage.ts
export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return null;
    }
  },
  // ... other methods
};
```

### 3. NoSSR Component

```typescript
// components/NoSSR.tsx
import { useEffect, useState } from 'react';

export default function NoSSR({ children }: { children: React.ReactNode }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return null;
  return <>{children}</>;
}
```

### 4. Conditional Rendering

```typescript
// In components
const [isClient, setIsClient] = useState(false);

useEffect(() => {
  setIsClient(true);
}, []);

if (!isClient) {
  return <LoadingSpinner />;
}

return (
  <div>
    {/* Client-side only content */}
  </div>
);
```

## Best Practices

### 1. Use useEffect for Client-Side Code
```typescript
// ❌ Wrong
const userAgent = navigator.userAgent;

// ✅ Correct
const [userAgent, setUserAgent] = useState('');
useEffect(() => {
  setUserAgent(navigator.userAgent);
}, []);
```

### 2. Wrap Client-Side Components
```typescript
// ❌ Wrong
<div>
  Cart items: {cartItems.length}
</div>

// ✅ Correct
<NoSSR>
  <div>
    Cart items: {cartItems.length}
  </div>
</NoSSR>
```

### 3. Use Fallback Values
```typescript
// ❌ Wrong
const theme = localStorage.getItem('theme');

// ✅ Correct
const theme = safeLocalStorage.getItem('theme') || 'light';
```

### 4. Defer Non-Critical Content
```typescript
// ❌ Wrong
const [data, setData] = useState(expensiveCalculation());

// ✅ Correct
const [data, setData] = useState(null);
useEffect(() => {
  setData(expensiveCalculation());
}, []);
```

## Implementation Examples

### ProductCard Component
```typescript
export default function ProductCard({ product }: ProductCardProps) {
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <div className="product-card">
      {/* Server-safe content */}
      <h3>{product.name}</h3>
      <p>{product.price}</p>
      
      {/* Client-only content */}
      <button
        className={`wishlist-btn ${
          isClient && isInWishlist(product.id) ? 'active' : ''
        }`}
      >
        ♥
      </button>
    </div>
  );
}
```

### AuthContext with Safe Storage
```typescript
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    const loadUser = () => {
      const userData = safeLocalStorage.getItem('user');
      const token = safeLocalStorage.getItem('token');
      
      if (userData && token) {
        const user = JSON.parse(userData);
        dispatch({ type: 'SET_USER', payload: user });
      } else {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    loadUser();
  }, []);

  // ... rest of the context
}
```

## Testing for Hydration Issues

1. **Development**: Check browser console for hydration warnings
2. **Production**: Use `next build` and `next start` to test SSR
3. **Debugging**: Add `suppressHydrationWarning={true}` temporarily to isolate issues

## Quick Fixes Applied

1. ✅ Added `isClient` state to ProductsPage
2. ✅ Added `isClient` state to ProductCard
3. ✅ Updated AuthContext to use `safeLocalStorage`
4. ✅ Added client-side checks for wishlist state
5. ✅ Fixed date handling with fallback values
6. ✅ Wrapped dynamic content in NoSSR components

## Result

The application now renders consistently on both server and client, eliminating hydration errors while maintaining full functionality.

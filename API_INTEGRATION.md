# API Configuration Documentation

## Overview

This project is configured to work with both static data and a Spring Boot backend API. The configuration allows seamless switching between development (static data) and production (API) modes.

## Backend Integration

The backend is expected to be a Spring Boot application running on `http://localhost:8081`.

### API Configuration

The API configuration is centralized in `src/config/apiConfig.ts`:

```typescript
const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8081/api',
  TIMEOUT: 30000,
  // ... other config
};
```

### Environment Variables

Create a `.env.local` file with the following variables:

```env
# API Configuration
NEXT_PUBLIC_API_BASE_URL=http://localhost:8081/api
NEXT_PUBLIC_USE_API=false

# Set to true when backend is ready
# NEXT_PUBLIC_USE_API=true
```

## Data Service Layer

The `src/services/dataService.ts` provides a unified interface that:

1. **Development Mode**: Uses static data from `src/data/products.ts`
2. **Production Mode**: Makes API calls to Spring Boot backend
3. **Fallback**: Falls back to static data if API calls fail

### Usage

```typescript
import { dataService } from '@/services/dataService';

// Get all products
const products = await dataService.products.getAll();

// Get product by ID
const product = await dataService.products.getById(1);

// Search products
const searchResults = await dataService.search.products('headphones');
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh token
- `GET /api/auth/profile` - Get user profile

### Products
- `GET /api/products` - Get all products
- `GET /api/products/{id}` - Get product by ID
- `GET /api/products/search` - Search products
- `GET /api/products/category/{category}` - Get products by category
- `GET /api/products/featured` - Get featured products
- `GET /api/products/{id}/related` - Get related products
- `GET /api/products/{id}/reviews` - Get product reviews
- `POST /api/products/{id}/reviews` - Add product review

### Categories
- `GET /api/categories` - Get all categories
- `GET /api/categories/{id}` - Get category by ID
- `GET /api/categories/{id}/products` - Get products in category
- `GET /api/categories/{id}/subcategories` - Get subcategories

### Cart
- `GET /api/cart` - Get user's cart
- `POST /api/cart/items` - Add item to cart
- `PUT /api/cart/items/{productId}` - Update cart item
- `DELETE /api/cart/items/{productId}` - Remove cart item
- `DELETE /api/cart` - Clear cart

### Wishlist
- `GET /api/wishlist` - Get user's wishlist
- `POST /api/wishlist/items` - Add item to wishlist
- `DELETE /api/wishlist/items/{productId}` - Remove wishlist item

### Orders
- `POST /api/orders` - Create new order
- `GET /api/orders` - Get user's orders
- `GET /api/orders/{id}` - Get order by ID
- `PUT /api/orders/{id}/status` - Update order status
- `GET /api/orders/{id}/track` - Track order

### Search
- `GET /api/search/products` - Search products
- `GET /api/search/companies` - Search companies
- `GET /api/search/suggestions` - Get search suggestions
- `GET /api/search/popular` - Get popular searches

## Request/Response Format

### Standard Response Format
```typescript
{
  success: boolean;
  data: any;
  message?: string;
  error?: string;
}
```

### Product Object
```typescript
{
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  images: string[];
  inStock: boolean;
  stockQuantity: number;
  minOrderQuantity: number;
  // ... other fields
}
```

## Custom Hooks

The project includes custom hooks for easy data fetching:

```typescript
// Products
const { products, loading, error } = useProducts();
const { product, loading, error } = useProduct(id);
const { products, loading, error } = useProductsByCategory(category);

// Categories
const { categories, loading, error } = useCategories();

// Search
const { results, loading, error } = useSearch(query);
const { suggestions, loading, error } = useSearchSuggestions(query);
```

## Error Handling

The API service includes comprehensive error handling:

```typescript
try {
  const data = await dataService.products.getAll();
} catch (error) {
  if (error instanceof ApiError) {
    console.error('API Error:', error.status, error.statusText);
  } else {
    console.error('Network Error:', error.message);
  }
}
```

## Development vs Production

### Development Mode (`NEXT_PUBLIC_USE_API=false`)
- Uses static data from `src/data/products.ts`
- No backend required
- Instant responses
- Perfect for frontend development

### Production Mode (`NEXT_PUBLIC_USE_API=true`)
- Makes actual API calls to Spring Boot backend
- Requires backend server running
- Real-time data
- Full authentication flow

## Migration Guide

### From Static to API

1. Ensure Spring Boot backend is running on `http://localhost:8081`
2. Update `.env.local`:
   ```env
   NEXT_PUBLIC_USE_API=true
   ```
3. Test all functionality with real API endpoints
4. Update authentication flow if needed

### Backend Requirements

Your Spring Boot backend should implement:

1. **CORS Configuration** for `http://localhost:3000`
2. **JWT Authentication** with Bearer token support
3. **RESTful API** endpoints as documented above
4. **JSON Response Format** matching the expected structure
5. **Error Handling** with appropriate HTTP status codes

## Testing

### API Testing
```bash
# Test if backend is running
curl http://localhost:8081/api/products

# Test with authentication
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8081/api/cart
```

### Frontend Testing
```typescript
// Test data service
import { dataService } from '@/services/dataService';

// This will use static data if API is disabled
const products = await dataService.products.getAll();
console.log(products);
```

## Security Considerations

1. **Environment Variables**: Never commit sensitive API keys
2. **Authentication**: JWT tokens are stored in localStorage
3. **HTTPS**: Use HTTPS in production
4. **CORS**: Configure CORS properly on backend
5. **Input Validation**: Validate all user inputs

## Performance Optimization

1. **Caching**: API responses are cached where appropriate
2. **Pagination**: Large datasets are paginated
3. **Debouncing**: Search requests are debounced
4. **Error Fallback**: Falls back to static data on API errors
5. **Loading States**: Proper loading indicators throughout the app

This configuration provides a robust foundation for integrating with your Spring Boot backend while maintaining development flexibility with static data.

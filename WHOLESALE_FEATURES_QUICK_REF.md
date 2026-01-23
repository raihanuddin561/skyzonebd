# Wholesale Features Quick Reference

## 🚀 Quick Start for Developers

### Using Bulk Cart API

```typescript
import { useCart } from '@/contexts/CartContext';

const { addBulkToCart } = useCart();

// Add multiple products
await addBulkToCart([
  { productId: 'product-id-1', quantity: 50 },
  { productId: 'product-id-2', quantity: 100 },
]);
```

---

### Using Quick Quantity Grid

```tsx
import QuickQuantityGrid from '@/components/wholesale/QuickQuantityGrid';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';

const { addBulkToCart } = useCart();
const { user } = useAuth();

<QuickQuantityGrid 
  products={products}
  onBulkAdd={addBulkToCart}
  userType={user?.userType}
/>
```

---

### Using RFQ Button

```tsx
import RFQButton from '@/components/rfq/RFQButton';
import { useAuth } from '@/contexts/AuthContext';

const { user } = useAuth();

// Icon variant (compact)
<RFQButton 
  product={product} 
  userType={user?.userType}
  variant="icon"
/>

// Primary variant (full button)
<RFQButton 
  product={product} 
  userType={user?.userType}
  variant="primary"
/>

// Secondary variant (outlined)
<RFQButton 
  product={product} 
  userType={user?.userType}
  variant="secondary"
/>
```

---

## 📋 MOQ Logic

```typescript
// Get effective MOQ based on user type
const effectiveMinQty = (user && user.userType === 'WHOLESALE') 
  ? (product.minOrderQuantity || 1) 
  : 1;

// Wholesale: Must meet MOQ
// Retail/Guest: Can order from 1
```

---

## 💰 Tiered Pricing Logic

```typescript
// Calculate price based on quantity
const getEffectivePrice = (quantity: number) => {
  if (!product.bulkPricing || product.bulkPricing.length === 0) {
    return product.price;
  }
  
  // Find highest tier that quantity meets
  const applicableTiers = product.bulkPricing
    .filter((tier: any) => quantity >= tier.quantity)
    .sort((a: any, b: any) => b.quantity - a.quantity);
  
  return applicableTiers.length > 0 
    ? applicableTiers[0].price 
    : product.price;
};
```

---

## 🔀 View Mode Toggle

```typescript
// State
const [viewMode, setViewMode] = useState<'grid' | 'wholesale'>('grid');

// Load preference
useEffect(() => {
  const saved = localStorage.getItem('productsViewMode');
  if (saved === 'wholesale' && user?.userType === 'WHOLESALE') {
    setViewMode('wholesale');
  }
}, [user]);

// Save preference
const handleViewModeChange = (mode: 'grid' | 'wholesale') => {
  setViewMode(mode);
  localStorage.setItem('productsViewMode', mode);
};

// Conditional render
{viewMode === 'wholesale' && user?.userType === 'WHOLESALE' ? (
  <QuickQuantityGrid ... />
) : (
  <ProductGrid ... />
)}
```

---

## 🎯 User Type Checks

```typescript
import { useAuth } from '@/contexts/AuthContext';

const { user } = useAuth();

// Check if wholesale
if (user?.userType === 'WHOLESALE') {
  // Show wholesale features
}

// Check if retail
if (user?.userType === 'RETAIL') {
  // Show retail features
}

// Check if guest (not logged in)
if (!user) {
  // Show guest features
}
```

---

## 📊 Product Data Structure

```typescript
interface Product {
  id: string | number;
  name: string;
  price: number;
  wholesalePrice?: number;        // B2B pricing
  minOrderQuantity?: number;      // MOQ for wholesale
  bulkPricing?: Array<{          // Tiered pricing
    quantity: number;
    price: number;
  }>;
  availability: 'in_stock' | 'out_of_stock' | 'limited';
  stock?: number;
  // ... other fields
}
```

---

## 🛠️ Common Patterns

### 1. Adding RFQ to Any Component

```tsx
import RFQButton from '@/components/rfq/RFQButton';

// Only shows for wholesale users
<RFQButton 
  product={product} 
  userType={user?.userType}
  variant="secondary"
  className="w-full mt-2"
/>
```

### 2. Bulk Operations

```typescript
// Prepare items
const items = selectedProducts.map(product => ({
  productId: String(product.id),
  quantity: quantities[product.id] || 1
}));

// Add to cart
await addBulkToCart(items);
```

### 3. MOQ Validation

```typescript
// Frontend validation
const validateMOQ = (product: Product, quantity: number) => {
  if (user?.userType === 'WHOLESALE') {
    const moq = product.minOrderQuantity || 1;
    if (quantity < moq) {
      toast.error(`Minimum order quantity is ${moq}`);
      return false;
    }
  }
  return true;
};
```

---

## 🐛 Troubleshooting

### RFQ Button Not Showing
```typescript
// Check:
1. User is logged in: user !== null
2. User type is wholesale: user.userType === 'WHOLESALE'
3. Component imported correctly
4. Product prop passed
```

### Bulk Cart Failing
```typescript
// Check:
1. Items array format: [{ productId: string, quantity: number }]
2. All productIds exist in database
3. Products are not out_of_stock
4. Quantities don't exceed stock
```

### Quick Quantity Grid Not Loading
```typescript
// Check:
1. Products array not empty
2. onBulkAdd function passed
3. userType prop passed
4. Component imported from correct path
```

### View Toggle Not Saving
```typescript
// Check:
1. localStorage available (client-side)
2. User type is WHOLESALE
3. handleViewModeChange called on button click
4. State updates correctly
```

---

## 📁 File Locations

```
src/
├── app/
│   ├── api/cart/bulk/route.ts          # Bulk cart API
│   ├── components/ProductCard.tsx      # With RFQ button
│   └── products/page.tsx                # With view toggle
├── components/
│   ├── rfq/RFQButton.tsx               # RFQ modal
│   └── wholesale/QuickQuantityGrid.tsx # Quick order grid
├── contexts/CartContext.tsx             # With addBulkToCart
└── types/cart.ts                        # CartContextType
```

---

## 🧪 Test Commands

```bash
# Run development server
npm run dev

# Check TypeScript errors
npm run build

# Test API endpoint
curl -X POST http://localhost:3000/api/cart/bulk \
  -H "Content-Type: application/json" \
  -d '{"items":[{"productId":"xxx","quantity":50}]}'
```

---

## 📝 Feature Checklist

### Before Testing
- [ ] User is logged in as WHOLESALE
- [ ] Products have `minOrderQuantity` set
- [ ] Products have `bulkPricing` configured
- [ ] Database has RFQ models

### Bulk Cart
- [ ] Add single product
- [ ] Add multiple products
- [ ] Handle product not found
- [ ] Handle out of stock
- [ ] Handle insufficient stock
- [ ] See success toast
- [ ] See error toasts
- [ ] Cart state updates

### Quick Quantity Grid
- [ ] Grid displays products
- [ ] Quantity inputs work
- [ ] Quick set buttons work
- [ ] Increment/decrement work
- [ ] MOQ validation works
- [ ] Total calculates correctly
- [ ] Bulk add works
- [ ] Clear all works

### RFQ
- [ ] Button shows for wholesale
- [ ] Button hidden for retail/guest
- [ ] Modal opens
- [ ] Form validates
- [ ] Submission works
- [ ] Success toast shows
- [ ] Form clears

### View Toggle
- [ ] Toggle shows for wholesale
- [ ] Toggle hidden for retail/guest
- [ ] Grid view works
- [ ] Wholesale view works
- [ ] Preference saves
- [ ] Preference loads

---

## 💡 Pro Tips

1. **Always convert product IDs to strings** in bulk operations
2. **Check user type before showing wholesale features**
3. **Validate MOQ on both frontend and backend**
4. **Use toast notifications for user feedback**
5. **Handle partial success in bulk operations**
6. **Cache view preferences for better UX**

---

## 🔗 Related Documentation

- Full Guide: `WHOLESALE_FEATURES_COMPLETE.md`
- Summary: `PROMPT_10_WHOLESALE_FEATURES_SUMMARY.md`
- MOQ System: `MOQ_SMART_IMPLEMENTATION.md`
- Tiered Pricing: `ALIBABA_STYLE_TIERED_PRICING.md`

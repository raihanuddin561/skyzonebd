# Wholesale Features Implementation Guide

## Overview
Complete implementation of wholesale-specific features for the SkyzoneBD B2B/B2C platform. This guide covers MOQ enforcement, tiered pricing, bulk cart operations, quick quantity grid, and RFQ (Request for Quotation) integration.

---

## Features Implemented

### 1. Minimum Order Quantity (MOQ) ✅

**Status:** Fully Implemented

**Description:**
MOQ enforcement ensures wholesale buyers meet minimum purchase requirements while allowing retail customers and guests to order freely.

**Implementation:**

#### Database Schema
```prisma
model Product {
  minOrderQuantity  Int?      // Optional - admins can choose not to set MOQ
}
```

#### Frontend Logic
- **Location:** `src/app/components/ProductCard.tsx`, `src/app/cart/page.tsx`, `src/app/products/[id]/page.tsx`
- **Logic:**
  ```typescript
  const effectiveMinQty = (user && user.userType === 'WHOLESALE') 
    ? (product.minOrderQuantity || 1) 
    : 1;
  ```

**User Type Behavior:**
- **WHOLESALE:** Must meet `minOrderQuantity` (defaults to 1 if not set)
- **RETAIL/GUEST:** Can order from quantity 1, no MOQ restriction

**Validation Points:**
1. Product Card - Quantity input minimum
2. Cart Page - Quantity update validation
3. Product Detail Page - Add to cart validation
4. Wishlist - MOQ respected when adding to cart
5. Quick Quantity Grid - MOQ validation before bulk add

---

### 2. Tiered Pricing (Bulk Pricing) ✅

**Status:** Fully Implemented

**Description:**
Price breaks based on quantity tiers, encouraging bulk purchases.

**Implementation:**

#### Database Schema
```prisma
model Product {
  bulkPricing      Json?    // Array of { quantity: number, price: number }
}
```

**Format:**
```json
[
  { "quantity": 10, "price": 950 },
  { "quantity": 50, "price": 900 },
  { "quantity": 100, "price": 850 }
]
```

#### Frontend Display
- **Location:** `src/app/products/[id]/page.tsx` (lines 411-420)
- **Calculation Logic:** (lines 113-122)
  ```typescript
  const getEffectivePrice = (quantity: number) => {
    if (!product.bulkPricing || product.bulkPricing.length === 0) {
      return product.price;
    }
    
    const applicableTiers = product.bulkPricing
      .filter((tier: any) => quantity >= tier.quantity)
      .sort((a: any, b: any) => b.quantity - a.quantity);
    
    return applicableTiers.length > 0 
      ? applicableTiers[0].price 
      : product.price;
  };
  ```

**Display Features:**
- Price breaks table showing all tiers
- Automatic price calculation based on quantity
- Savings percentage display
- Visual indication of current tier

---

### 3. Bulk Add to Cart 🆕

**Status:** Newly Implemented

**Description:**
Add multiple products with different quantities to cart in a single operation.

**Files Created:**
- `src/app/api/cart/bulk/route.ts` - Backend API endpoint
- `src/contexts/CartContext.tsx` - Updated with `addBulkToCart` method
- `src/types/cart.ts` - Updated CartContextType

#### API Endpoint

**POST** `/api/cart/bulk`

**Request Body:**
```json
{
  "items": [
    { "productId": "clxxx123", "quantity": 50 },
    { "productId": "clxxx456", "quantity": 100 }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "cartItems": [
    {
      "product": { /* full product object */ },
      "quantity": 50
    }
  ],
  "errors": ["Product X is out of stock"],
  "summary": {
    "totalItems": 150,
    "totalProducts": 2,
    "totalPrice": 45000
  }
}
```

**Validation:**
- ✅ Validates all products exist
- ✅ Checks product availability (not out_of_stock)
- ✅ Validates stock quantity
- ✅ Uses wholesalePrice if available, falls back to price
- ✅ Returns partial success if some items fail
- ⚠️ MOQ validation deferred to frontend based on user type

#### Frontend Integration

**CartContext Method:**
```typescript
const addBulkToCart = async (items: { productId: string; quantity: number }[]) => {
  // Calls /api/cart/bulk
  // Dispatches BULK_ADD_TO_CART action
  // Shows success/error toasts
  // Returns { success: boolean, data?, error? }
}
```

**Usage:**
```typescript
const { addBulkToCart } = useCart();

await addBulkToCart([
  { productId: 'clxxx123', quantity: 50 },
  { productId: 'clxxx456', quantity: 100 }
]);
```

---

### 4. Quick Quantity Grid 🆕

**Status:** Newly Implemented

**Description:**
Wholesale-friendly table view for rapid multi-product ordering with quantity inputs.

**File:** `src/components/wholesale/QuickQuantityGrid.tsx`

#### Features

1. **Product Table Layout**
   - Product image, name, price
   - MOQ display for wholesale users
   - In-stock indicator

2. **Quick Set Buttons**
   - Pre-set quantities: MOQ, MOQ×2, MOQ×5
   - One-click quantity input

3. **Quantity Controls**
   - Increment/decrement by MOQ
   - Direct input field
   - Min/max validation
   - Real-time subtotal calculation

4. **MOQ Validation**
   - Visual indicator for invalid quantities (red border)
   - Prevents submission if any quantity below MOQ
   - Respects user type (wholesale vs retail)

5. **Bulk Operations**
   - "Add Selected to Cart" button
   - Shows total items and total value
   - Clears quantities after successful add
   - Loading state during submission

6. **Summary Footer**
   - Total value across all products
   - Selected products count
   - "Clear All" button

#### Props

```typescript
interface QuickQuantityGridProps {
  products: Product[];
  onBulkAdd: (items: { productId: string; quantity: number }[]) => void;
  userType?: 'WHOLESALE' | 'RETAIL' | null;
}
```

#### Usage

```tsx
<QuickQuantityGrid 
  products={displayedProducts}
  onBulkAdd={addBulkToCart}
  userType={user?.userType}
/>
```

---

### 5. RFQ (Request for Quotation) System 🆕

**Status:** Integration Completed (Backend Existed, Frontend Integrated)

**Description:**
Wholesale buyers can request custom quotes for bulk orders or special pricing.

#### Backend (Pre-existing)

**Database Models:**
```prisma
model RFQ {
  id            String      @id @default(cuid())
  rfqNumber     String      @unique
  userId        String
  subject       String
  message       String?
  targetPrice   Float?
  status        RFQStatus   @default(PENDING)
  expiresAt     DateTime?
  items         RFQItem[]
  user          User        @relation(...)
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
}

model RFQItem {
  id          String   @id @default(cuid())
  rfqId       String
  productId   String
  quantity    Int
  notes       String?
  rfq         RFQ      @relation(...)
  product     Product  @relation(...)
  createdAt   DateTime @default(now())
}

enum RFQStatus {
  PENDING
  QUOTED
  ACCEPTED
  REJECTED
  EXPIRED
}
```

**API Endpoints:**
- `POST /api/rfq` - Create RFQ
- `GET /api/rfq` - List user's RFQs
- `POST /api/rfq/[id]/respond` - Admin responds to RFQ

#### Frontend Component (New)

**File:** `src/components/rfq/RFQButton.tsx`

**Features:**

1. **Button Variants**
   - `primary` - Full blue button with icon
   - `secondary` - Outlined button (default)
   - `icon` - Icon-only button for compact spaces

2. **Modal Form**
   - Product preview with image and current price
   - Quantity input (respects MOQ)
   - Target price input (optional)
   - Additional message textarea
   - Price comparison: Current vs Target

3. **User Type Restriction**
   - Only visible to WHOLESALE users
   - Returns null for RETAIL/GUEST users

4. **Submission**
   - Validates quantity meets MOQ
   - Sends RFQ to backend
   - Shows success/error toasts
   - Clears form on success

#### Integration Points

**ProductCard.tsx:**
```tsx
import RFQButton from '@/components/rfq/RFQButton';

// In stock products
<RFQButton 
  product={product} 
  userType={user?.userType}
  variant="icon"
  className="flex-shrink-0"
/>

// Out of stock products (wholesale only)
<RFQButton 
  product={product} 
  userType={user.userType}
  variant="secondary"
  className="w-full text-sm"
/>
```

**Usage Scenarios:**
1. **In Stock:** Icon button next to "Add to Cart" for custom pricing
2. **Out of Stock:** Full button for wholesale users to request availability
3. **Product Detail Page:** Can be added with primary variant

---

### 6. Wholesale View Toggle 🆕

**Status:** Newly Implemented

**Description:**
Product listing page view mode switcher for wholesale users.

**File:** `src/app/products/page.tsx`

#### Features

1. **View Modes**
   - **Grid View:** Standard product cards with individual add-to-cart
   - **Wholesale View:** Quick quantity grid for bulk ordering

2. **Toggle UI**
   - Two-button toggle: Grid | Wholesale
   - Icons for each mode
   - Highlighted active mode

3. **User Type Restriction**
   - Only visible to WHOLESALE users
   - Retail/guest users always see grid view

4. **Persistence**
   - Saves preference to localStorage
   - Loads saved preference on mount
   - Persists across sessions

#### Implementation

**State Management:**
```typescript
const [viewMode, setViewMode] = useState<'grid' | 'wholesale'>('grid');

// Load preference
useEffect(() => {
  const savedViewMode = localStorage.getItem('productsViewMode');
  if (savedViewMode === 'wholesale' && user?.userType === 'WHOLESALE') {
    setViewMode('wholesale');
  }
}, [user]);

// Save preference
const handleViewModeChange = (mode: 'grid' | 'wholesale') => {
  setViewMode(mode);
  localStorage.setItem('productsViewMode', mode);
};
```

**Conditional Rendering:**
```tsx
{viewMode === 'wholesale' && user?.userType === 'WHOLESALE' ? (
  <QuickQuantityGrid 
    products={displayedProducts}
    onBulkAdd={addBulkToCart}
    userType={user.userType}
  />
) : (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
    {displayedProducts.map(product => (
      <ProductCard product={product} />
    ))}
  </div>
)}
```

---

## User Type Matrix

| Feature | GUEST | RETAIL | WHOLESALE |
|---------|-------|--------|-----------|
| MOQ Enforcement | ❌ No (can order from 1) | ❌ No (can order from 1) | ✅ Yes (must meet MOQ) |
| Tiered Pricing Display | ✅ Yes | ✅ Yes | ✅ Yes |
| Tiered Pricing Application | ✅ Yes | ✅ Yes | ✅ Yes |
| Bulk Add to Cart | ✅ Yes | ✅ Yes | ✅ Yes |
| Quick Quantity Grid | ❌ No | ❌ No | ✅ Yes |
| Wholesale View Toggle | ❌ No | ❌ No | ✅ Yes |
| RFQ Button | ❌ No | ❌ No | ✅ Yes |
| RFQ Submission | ❌ No | ❌ No | ✅ Yes |

---

## File Structure

```
src/
├── app/
│   ├── api/
│   │   └── cart/
│   │       └── bulk/
│   │           └── route.ts              # NEW - Bulk add to cart API
│   ├── components/
│   │   └── ProductCard.tsx               # UPDATED - RFQ button integration
│   └── products/
│       └── page.tsx                      # UPDATED - Wholesale view toggle
├── components/
│   ├── rfq/
│   │   └── RFQButton.tsx                 # NEW - RFQ modal component
│   └── wholesale/
│       └── QuickQuantityGrid.tsx         # NEW - Quick order grid
├── contexts/
│   └── CartContext.tsx                   # UPDATED - addBulkToCart method
└── types/
    └── cart.ts                           # UPDATED - CartContextType
```

---

## Testing Checklist

### MOQ Testing
- [ ] Wholesale user cannot add quantity below MOQ
- [ ] Retail user can add quantity 1 regardless of MOQ
- [ ] Guest user can add quantity 1 regardless of MOQ
- [ ] MOQ validation on cart quantity update
- [ ] MOQ displayed correctly in product card
- [ ] MOQ validation in quick quantity grid

### Tiered Pricing Testing
- [ ] Price breaks display on product detail page
- [ ] Correct price calculated based on quantity
- [ ] Price updates dynamically as quantity changes
- [ ] Savings percentage shows correctly
- [ ] Works with wholesale-specific pricing

### Bulk Cart Testing
- [ ] API validates all products exist
- [ ] API checks product availability
- [ ] API validates stock quantity
- [ ] Partial success when some items fail
- [ ] Success toast shows correct totals
- [ ] Error messages display for failed items
- [ ] Cart state updates correctly

### Quick Quantity Grid Testing
- [ ] Grid displays all products correctly
- [ ] Quantity inputs respect MOQ for wholesale
- [ ] Quick set buttons work (MOQ, MOQ×2, MOQ×5)
- [ ] Increment/decrement by MOQ amount
- [ ] Invalid quantity shows red border
- [ ] Total value calculates correctly
- [ ] "Add Selected to Cart" adds all items
- [ ] "Clear All" resets all quantities
- [ ] Loading state during submission

### RFQ Testing
- [ ] RFQ button only visible to wholesale users
- [ ] Icon variant appears next to Add to Cart
- [ ] Secondary variant appears for out of stock
- [ ] Modal opens with product pre-filled
- [ ] Quantity respects MOQ
- [ ] Target price is optional
- [ ] Form validation works
- [ ] Success toast on submission
- [ ] Form clears after success
- [ ] API creates RFQ in database

### Wholesale View Testing
- [ ] Toggle only visible to wholesale users
- [ ] Grid view shows product cards
- [ ] Wholesale view shows quick quantity grid
- [ ] View preference saves to localStorage
- [ ] Saved preference loads on mount
- [ ] Works across page refreshes
- [ ] Retail/guest users always see grid view

---

## API Reference

### Bulk Add to Cart

**Endpoint:** `POST /api/cart/bulk`

**Authentication:** Optional (works for guests)

**Request:**
```json
{
  "items": [
    {
      "productId": "string",
      "quantity": number
    }
  ]
}
```

**Response (Success):**
```json
{
  "success": true,
  "cartItems": [
    {
      "product": {
        "id": "string",
        "name": "string",
        "price": number,
        "wholesalePrice": number,
        // ... full product object
      },
      "quantity": number
    }
  ],
  "errors": ["string"] | undefined,
  "summary": {
    "totalItems": number,
    "totalProducts": number,
    "totalPrice": number
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "string"
}
```

**Error Codes:**
- 400 - Invalid request body
- 404 - Product not found
- 400 - Product unavailable or insufficient stock

### Create RFQ

**Endpoint:** `POST /api/rfq`

**Authentication:** Required (wholesale users only)

**Request:**
```json
{
  "subject": "string",
  "message": "string (optional)",
  "targetPrice": number (optional),
  "items": [
    {
      "productId": "string",
      "quantity": number,
      "notes": "string (optional)"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "rfq": {
    "id": "string",
    "rfqNumber": "string",
    "status": "PENDING",
    // ... full RFQ object
  }
}
```

---

## Admin Features

### RFQ Management
- Admin can view all RFQs at `/admin/rfqs` (menu item exists)
- Admin can respond to RFQs with quotes
- RFQ status workflow: PENDING → QUOTED → ACCEPTED/REJECTED/EXPIRED

### Product Configuration
- Set `minOrderQuantity` per product
- Configure `bulkPricing` tiers
- Set `wholesalePrice` for B2B pricing

---

## Future Enhancements

### Potential Improvements
1. **Per-Variant Pricing:** Different prices for product variants (colors, sizes)
2. **Quantity Grid Presets:** Save favorite quantity combinations
3. **RFQ Templates:** Pre-filled RFQ forms for common requests
4. **Bulk CSV Upload:** Upload product IDs and quantities from CSV
5. **Price Negotiation:** Back-and-forth negotiation on RFQs
6. **Auto-Approve RFQs:** Automatic approval based on rules
7. **RFQ Expiry Notifications:** Email alerts for expiring RFQs
8. **Wholesale Dashboard:** Analytics for bulk orders and RFQs

---

## Troubleshooting

### MOQ Not Enforcing
- Check user type: `user.userType === 'WHOLESALE'`
- Verify `product.minOrderQuantity` is set
- Check component uses `effectiveMinQty` logic

### Bulk Cart Not Working
- Verify API route exists: `src/app/api/cart/bulk/route.ts`
- Check CartContext has `addBulkToCart` method
- Verify CartContextType includes method signature
- Check network tab for API errors

### RFQ Button Not Showing
- Verify user type is WHOLESALE
- Check component import in ProductCard
- Verify RFQButton component exists

### Wholesale View Not Available
- Check user is logged in
- Verify user type is WHOLESALE
- Check localStorage for saved preference
- Verify QuickQuantityGrid import

---

## Performance Considerations

### Bulk Cart API
- Validates all products in parallel
- Returns partial success to avoid all-or-nothing
- Limits batch size (consider adding max items validation)

### Quick Quantity Grid
- Re-renders on quantity changes (optimized with local state)
- Calculates totals in real-time
- Consider virtual scrolling for 100+ products

### RFQ Modal
- Lazy loaded only when button clicked
- Form state managed locally
- Clears on close to free memory

---

## Conclusion

The wholesale features implementation provides a complete B2B ordering experience with:
- ✅ MOQ enforcement for wholesale users only
- ✅ Tiered pricing with automatic price breaks
- ✅ Bulk add to cart operations
- ✅ Quick quantity grid for rapid ordering
- ✅ RFQ system for custom quotes
- ✅ Wholesale view toggle for optimal UX

All features respect user types (WHOLESALE/RETAIL/GUEST) and provide appropriate experiences for each.

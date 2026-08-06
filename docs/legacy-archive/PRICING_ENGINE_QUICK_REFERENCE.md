# Pricing Engine - Quick Reference Guide

**Version:** 1.0  
**Last Updated:** January 23, 2026

---

## 🎯 Quick Start

### Basic Price Calculation

```typescript
import { calculateItemPrice } from '@/utils/pricingEngine';

const priceInfo = calculateItemPrice({
  product: {
    id: 'prod-123',
    name: 'Widget',
    wholesalePrice: 100,
    moq: 10,
    wholesaleTiers: [
      { minQuantity: 10, maxQuantity: 49, price: 95, discount: 5 },
      { minQuantity: 50, maxQuantity: 99, price: 90, discount: 10 },
      { minQuantity: 100, maxQuantity: null, price: 85, discount: 15 }
    ]
  },
  quantity: 60,
  customerDiscount: 15,         // Customer's special discount %
  customerDiscountValid: true    // Is discount not expired?
});

// Returns:
// {
//   finalUnitPrice: 76.5,        // Price per unit after all discounts
//   finalTotal: 4590,            // Total price
//   tierApplied: {...},          // Which tier was used
//   customerDiscountAmount: 810, // Dollar amount of customer discount
//   totalSavings: 1410,          // Total saved vs base price
//   totalSavingsPercent: 23.5    // Percentage saved
// }
```

---

## 📋 Common Use Cases

### 1. Product Page - Show Pricing Table

```typescript
import { getTierPricingTable } from '@/utils/pricingEngine';

const tierTable = getTierPricingTable(product, customerDiscount, discountValid);

// Returns array like:
// [
//   { range: '10-49', unitPrice: '৳95', totalDiscount: '20%', finalUnitPrice: '৳80.75', savings: '৳285' },
//   { range: '50-99', unitPrice: '৳90', totalDiscount: '25%', finalUnitPrice: '৳76.50', savings: '৳675' },
//   { range: '100+', unitPrice: '৳85', totalDiscount: '30%', finalUnitPrice: '৳72.25', savings: '৳1,550' }
// ]

// Render in UI:
<table>
  <thead>
    <tr>
      <th>Quantity</th>
      <th>Unit Price</th>
      <th>Your Discount</th>
      <th>You Pay</th>
      <th>You Save</th>
    </tr>
  </thead>
  <tbody>
    {tierTable.map(tier => (
      <tr key={tier.range}>
        <td>{tier.range} units</td>
        <td>{tier.unitPrice}</td>
        <td className="text-green-600">{tier.totalDiscount}</td>
        <td className="font-bold">{tier.finalUnitPrice}/unit</td>
        <td className="text-green-600">{tier.savings}</td>
      </tr>
    ))}
  </tbody>
</table>
```

### 2. Cart - Calculate Total with Discounts

```typescript
import { calculateCartTotal } from '@/utils/pricingEngine';

const cartItems = [
  { product: product1, quantity: 30 },
  { product: product2, quantity: 50 }
];

const cartTotal = calculateCartTotal(
  cartItems,
  user.discountPercent,
  isDiscountValid(user.discountValidUntil)
);

// Returns:
// {
//   subtotal: 5000,              // Before customer discount
//   totalCustomerDiscount: 750,  // Customer discount amount
//   total: 4250,                 // Final total
//   totalSavings: 1250,          // Total savings (tier + customer)
//   itemDetails: [...]           // Per-item breakdown
// }

// Display in UI:
<div className="order-summary">
  <div>Subtotal: {formatPrice(cartTotal.subtotal)}</div>
  {cartTotal.totalCustomerDiscount > 0 && (
    <div className="text-green-600">
      Your Discount ({user.discountPercent}%): 
      -{formatPrice(cartTotal.totalCustomerDiscount)}
    </div>
  )}
  <div className="font-bold">Total: {formatPrice(cartTotal.total)}</div>
  {cartTotal.totalSavings > 0 && (
    <div className="text-green-600 text-sm">
      Total Savings: {formatPrice(cartTotal.totalSavings)}
    </div>
  )}
</div>
```

### 3. Product Card - Quick Price Display

```typescript
import { getPriceBreakdown } from '@/utils/pricingEngine';

const breakdown = getPriceBreakdown(
  product,
  selectedQuantity,
  user?.discountPercent,
  isDiscountValid(user?.discountValidUntil)
);

// Returns:
// {
//   basePrice: '৳100',
//   tierInfo: 'Tier 50+ units: 10% off',
//   customerDiscountInfo: 'Customer discount: 15% off',
//   finalPrice: '৳76.5',
//   savings: '৳1,410',
//   savingsPercent: '23.5%'
// }

// Display in UI:
<div className="product-price">
  <div className="text-sm line-through text-gray-500">{breakdown.basePrice}</div>
  <div className="text-2xl font-bold text-blue-600">{breakdown.finalPrice}</div>
  {breakdown.savings && (
    <div className="text-green-600 text-sm">
      Save {breakdown.savings} ({breakdown.savingsPercent})
    </div>
  )}
  {breakdown.tierInfo && (
    <div className="text-xs text-gray-600">{breakdown.tierInfo}</div>
  )}
  {breakdown.customerDiscountInfo && (
    <div className="text-xs text-green-600">{breakdown.customerDiscountInfo}</div>
  )}
</div>
```

### 4. Server-Side Order Creation

```typescript
import { calculateItemPrice, validateCustomerDiscount } from '@/utils/pricingEngine';

// In order API route:
export async function POST(request: NextRequest) {
  // ... auth & validation
  
  // Fetch user discount
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { discountPercent: true, discountValidUntil: true }
  });
  
  // Validate discount
  const discountValidation = validateCustomerDiscount(
    user?.discountPercent,
    user?.discountValidUntil
  );
  
  // Calculate prices for each item
  const pricingResults = [];
  for (const item of items) {
    const product = await prisma.product.findUnique({
      where: { id: item.productId },
      include: { wholesaleTiers: true }
    });
    
    const priceInfo = calculateItemPrice({
      product,
      quantity: item.quantity,
      customerDiscount: discountValidation.applicablePercent,
      customerDiscountValid: discountValidation.isValid
    });
    
    pricingResults.push(priceInfo);
  }
  
  // Calculate order totals
  const subtotal = pricingResults.reduce((sum, p) => sum + p.subtotalBeforeDiscount, 0);
  const totalDiscount = pricingResults.reduce((sum, p) => sum + p.customerDiscountAmount, 0);
  const total = pricingResults.reduce((sum, p) => sum + p.finalTotal, 0);
  
  // Create order with correct prices
  await prisma.order.create({
    data: {
      subtotal,
      discountAmount: totalDiscount,
      discountPercent: discountValidation.applicablePercent,
      total,
      // ... other fields
    }
  });
}
```

### 5. Validate Customer Discount

```typescript
import { validateCustomerDiscount } from '@/utils/pricingEngine';

// Check if discount is valid and not expired
const validation = validateCustomerDiscount(
  user.discountPercent,
  user.discountValidUntil
);

// Returns:
// {
//   isValid: true,
//   applicablePercent: 15,
//   reason: undefined  // or 'Discount expired', 'No discount set', etc.
// }

// Use in UI:
{validation.isValid ? (
  <div className="discount-badge">
    🎉 {validation.applicablePercent}% Discount Active
  </div>
) : validation.reason && (
  <div className="text-gray-500 text-sm">
    {validation.reason}
  </div>
)}
```

---

## 🛠️ Utility Functions

### Format Price
```typescript
import { formatPrice } from '@/utils/pricingEngine';

formatPrice(1234.56);        // '৳1,234.56'
formatPrice(1000);           // '৳1,000'
formatPrice(5.5);            // '৳5.5'
formatPrice(1234.56, '$');   // '$1,234.56'
```

### Round Price
```typescript
import { roundPrice } from '@/utils/pricingEngine';

roundPrice(10.12345);   // 10.12
roundPrice(10.126);     // 10.13
```

---

## 📊 Pricing Logic Explained

### Order of Operations

1. **Find Tier**
   - Check quantity against all tiers
   - Select highest tier where `quantity >= minQuantity`
   - If no tier matches, use base `wholesalePrice`

2. **Calculate Subtotal**
   - `subtotal = tierPrice * quantity`

3. **Apply Customer Discount**
   - Only if `customerDiscountValid === true`
   - `discountAmount = subtotal * (customerDiscount / 100)`
   - `finalTotal = subtotal - discountAmount`

4. **Calculate Savings**
   - `totalSavings = (basePrice * quantity) - finalTotal`
   - `savingsPercent = (totalSavings / (basePrice * quantity)) * 100`

### Example Calculation

```
Product: Widget
Base Price: ৳100/unit
Tiers:
  - 10-49 units: ৳95 (5% off)
  - 50-99 units: ৳90 (10% off)
  - 100+ units: ৳85 (15% off)

Customer: VIP (15% discount)
Order: 60 units

Step 1: Find Tier
  60 units → matches "50-99" tier
  Tier Price: ৳90

Step 2: Subtotal
  ৳90 × 60 = ৳5,400

Step 3: Customer Discount
  15% of ৳5,400 = ৳810
  Final: ৳5,400 - ৳810 = ৳4,590

Step 4: Savings
  Base: ৳100 × 60 = ৳6,000
  Paid: ৳4,590
  Saved: ৳1,410 (23.5%)

Result:
  Final Unit Price: ৳76.50
  Final Total: ৳4,590
  Tier Discount: ৳600 (10%)
  Customer Discount: ৳810 (15%)
  Total Savings: ৳1,410 (23.5%)
```

---

## 🔍 Common Scenarios

### Scenario 1: Guest Checkout (No Discount)
```typescript
const priceInfo = calculateItemPrice({
  product,
  quantity: 30,
  customerDiscount: 0,
  customerDiscountValid: false
});
// Result: Only tier pricing applied
```

### Scenario 2: Customer with Expired Discount
```typescript
const validation = validateCustomerDiscount(15, pastDate);
// validation.isValid = false
// validation.applicablePercent = 0
// validation.reason = 'Discount expired'

const priceInfo = calculateItemPrice({
  product,
  quantity: 30,
  customerDiscount: 15,
  customerDiscountValid: validation.isValid  // false
});
// Result: Discount NOT applied
```

### Scenario 3: Below MOQ
```typescript
const priceInfo = calculateItemPrice({
  product: { ...product, moq: 10 },
  quantity: 5
});
// Result:
// {
//   meetsMinimum: false,
//   finalTotal: 0,
//   minimumRequired: 10
// }
```

### Scenario 4: No Tiers (Simple Pricing)
```typescript
const product = {
  wholesalePrice: 100,
  moq: 1,
  wholesaleTiers: []
};

const priceInfo = calculateItemPrice({
  product,
  quantity: 50,
  customerDiscount: 10,
  customerDiscountValid: true
});
// Result:
// {
//   tierApplied: null,
//   tierPrice: 100,  // Base price
//   customerDiscountAmount: 500,
//   finalTotal: 4500
// }
```

---

## ⚠️ Important Notes

### 1. Server is Source of Truth
- **NEVER** trust client-calculated prices
- Always recalculate server-side in order API
- Client prices are for **preview only**

### 2. Discount Validation
- Check `discountValidUntil` before applying
- Expired discounts should NOT be applied
- Use `validateCustomerDiscount()` helper

### 3. MOQ Enforcement
- Check `meetsMinimum` before allowing checkout
- Display minimum requirement to user
- Enforce on both client and server

### 4. Rounding
- All prices rounded to 2 decimals
- Use `roundPrice()` for consistency
- Avoid floating-point precision issues

### 5. Performance
- Tier selection is O(n) where n = number of tiers (typically 3-5)
- Cache product data when calculating cart totals
- Consider memoization for repeated calculations

---

## 🧪 Testing Examples

```typescript
// Test tier selection
describe('Tier Pricing', () => {
  it('should select correct tier for 60 units', () => {
    const result = calculateItemPrice({
      product: mockProduct,
      quantity: 60
    });
    expect(result.tierApplied?.minQuantity).toBe(50);
    expect(result.tierPrice).toBe(90);
  });
});

// Test customer discount
describe('Customer Discount', () => {
  it('should apply 15% discount', () => {
    const result = calculateItemPrice({
      product: mockProduct,
      quantity: 30,
      customerDiscount: 15,
      customerDiscountValid: true
    });
    expect(result.customerDiscountPercent).toBe(15);
    expect(result.customerDiscountAmount).toBe(427.5); // 2850 * 0.15
  });
  
  it('should NOT apply expired discount', () => {
    const result = calculateItemPrice({
      product: mockProduct,
      quantity: 30,
      customerDiscount: 15,
      customerDiscountValid: false
    });
    expect(result.customerDiscountPercent).toBe(0);
    expect(result.customerDiscountAmount).toBe(0);
  });
});
```

---

## 📚 Additional Resources

- **Architecture Docs:** `CUSTOMER_JOURNEY_IMPLEMENTATION.md`
- **Full Implementation:** `CUSTOMER_JOURNEY_IMPLEMENTATION_SUMMARY.md`
- **Test Suite:** `__tests__/utils/pricingEngine.test.ts`
- **Source Code:** `src/utils/pricingEngine.ts`

---

**Questions?** Check the implementation summary or contact the development team.

# 🚀 Quick Reference: Wholesale-Only Platform

## 🎯 Key Changes Summary

| Feature | Before (B2B/B2C) | After (Wholesale-Only) |
|---------|------------------|------------------------|
| **Customer Type** | Retail + Wholesale | Wholesale Only |
| **Min Order** | 1 unit | 10+ units (MOQ) |
| **Pricing** | Retail + Wholesale | Wholesale Only |
| **Profit Tracking** | None | Full profit sharing system |
| **Business Verification** | Optional | Required |
| **Guest Orders** | Allowed | Not Allowed |
| **Inventory** | Basic | Advanced with alerts |

---

## 💰 Profit Calculation Formula

```
Given:
- Base Price (Cost): ৳100
- Wholesale Price: ৳150
- Platform Profit %: 15%
- Seller Commission %: 20%

Calculation:
Gross Profit = ৳150 - ৳100 = ৳50
Platform Profit = ৳50 × 15% = ৳7.50
Remaining = ৳50 - ৳7.50 = ৳42.50
Seller Profit = ৳42.50 × 20% = ৳8.50
Final Platform = ৳7.50 + (৳42.50 - ৳8.50) = ৳41.50

Result:
✅ Platform gets: ৳41.50 (83%)
✅ Seller gets: ৳8.50 (17%)
✅ Profit Margin: 33.33%
```

---

## 📦 MOQ (Minimum Order Quantity)

### Default MOQ: 10 units

```typescript
// Check if order meets MOQ
if (quantity >= product.moq) {
  // ✅ Can proceed
} else {
  // ❌ Show error: "Minimum order is 10 units"
}
```

### Setting MOQ per Product

```typescript
// In admin panel
product.moq = 50; // Set to 50 units
product.moq = 100; // Set to 100 units
```

---

## 💵 Tiered Pricing Example

```typescript
// Product: Industrial Supplies
wholesaleTiers: [
  { 
    minQty: 10, 
    maxQty: 49, 
    price: 145, 
    discount: 3% 
  },
  { 
    minQty: 50, 
    maxQty: 199, 
    price: 135, 
    discount: 10% 
  },
  { 
    minQty: 200, 
    maxQty: null, 
    price: 120, 
    discount: 20% 
  }
]

// Order 75 units → Get ৳135/unit (10% discount)
// Order 250 units → Get ৳120/unit (20% discount)
```

---

## 🔧 Quick API Usage

### 1. Calculate Profit

```typescript
import { calculateProductProfit } from '@/utils/profitCalculation';

const profit = calculateProductProfit(100, {
  basePrice: 80,
  wholesalePrice: 120,
  platformProfitPercentage: 15
});

// profit.platformProfit = 600
// profit.profitMargin = 33.33%
```

### 2. Check Wholesale Price

```typescript
import { calculateWholesalePrice } from '@/utils/wholesalePricing';

const calc = calculateWholesalePrice(product, 75);

// calc.unitPrice = 135
// calc.totalPrice = 10125
// calc.savings = 750
// calc.appliedTier = { minQty: 50, price: 135 }
```

### 3. Inventory Alert

```typescript
import { generateStockAlerts } from '@/utils/inventoryManagement';

const alerts = generateStockAlerts(inventory);

// alerts = [
//   {
//     severity: "critical",
//     message: "OUT OF STOCK",
//     suggestedAction: "Order 100 units immediately"
//   }
// ]
```

---

## 📊 Database Quick Reference

### Key Tables

```sql
-- Products (Wholesale)
SELECT 
  name,
  basePrice,              -- Cost
  wholesalePrice,         -- Selling price
  moq,                    -- Minimum order
  platformProfitPercentage,
  stockQuantity,
  reorderLevel
FROM products;

-- Profit Reports
SELECT 
  revenue,
  costOfGoods,
  grossProfit,
  platformProfit,
  sellerProfit,
  profitMargin
FROM profit_reports;

-- Inventory Logs
SELECT 
  action,                 -- PURCHASE, SALE, RETURN
  quantity,
  previousStock,
  newStock,
  reference               -- Order ID, PO number
FROM inventory_logs;
```

---

## 🎨 UI Components Quick Reference

### Product Card (Wholesale)

```tsx
<div className="product-card">
  <h3>{product.name}</h3>
  
  {/* Wholesale Price */}
  <div className="text-2xl font-bold">
    ৳{product.wholesalePrice}
    <span className="text-sm">/unit</span>
  </div>
  
  {/* MOQ Badge */}
  <div className="badge">
    MOQ: {product.moq} units
  </div>
  
  {/* Tier Pricing */}
  <div className="tiers">
    <h4>Volume Discounts:</h4>
    {product.wholesaleTiers.map(tier => (
      <div key={tier.minQuantity}>
        {tier.minQuantity}+ units: ৳{tier.price} 
        <span className="discount">({tier.discount}% OFF)</span>
      </div>
    ))}
  </div>
  
  {/* Stock Status */}
  <div className={`stock ${product.stockQuantity < 20 ? 'low' : ''}`}>
    {product.stockQuantity > 0 
      ? `${product.stockQuantity} in stock` 
      : 'Out of stock'}
  </div>
</div>
```

### Cart with MOQ Validation

```tsx
<button 
  onClick={addToCart}
  disabled={quantity < product.moq}
>
  {quantity < product.moq 
    ? `Minimum ${product.moq} units required`
    : `Add ${quantity} units to cart`
  }
</button>
```

---

## 📱 Business Verification Flow

```mermaid
User Registration
    ↓
Enter Company Info
    ↓
Upload Trade License ← Required
    ↓
Upload Tax Certificate
    ↓
Submit for Verification
    ↓
Admin Reviews (24-48hrs)
    ↓
[APPROVED] → Can Place Orders
[REJECTED] → Must Resubmit
[RESUBMIT] → Fix Issues & Resubmit
```

### Required Documents

1. ✅ **Trade License** (Required)
2. ✅ **Tax ID/TIN** (Required)
3. ✅ **Registration Number** (Required)
4. ⭕ **Tax Certificate** (Optional)
5. ⭕ **Company Website** (Optional)

---

## 🔐 Permission Levels

| Action | Admin | Seller | Buyer |
|--------|-------|--------|-------|
| View Profit Reports | ✅ | ✅ (Own) | ❌ |
| Set Profit % | ✅ | ❌ | ❌ |
| Add Products | ✅ | ✅ | ❌ |
| Verify Business | ✅ | ❌ | ❌ |
| Place Orders | ✅ | ❌ | ✅ |
| Manage Inventory | ✅ | ✅ (Own) | ❌ |
| View Wholesale Prices | ✅ | ✅ | ✅ (Verified) |

---

## 🚨 Common Issues & Solutions

### Issue 1: "Quantity below MOQ"
```typescript
// Solution: Enforce MOQ in frontend
if (quantity < product.moq) {
  alert(`Minimum order is ${product.moq} units`);
  setQuantity(product.moq);
}
```

### Issue 2: "Business not verified"
```typescript
// Solution: Check verification status
if (user.userType === 'WHOLESALE' && !user.isVerified) {
  redirect('/verify-business');
}
```

### Issue 3: "Profit not calculating"
```typescript
// Solution: Ensure all required fields set
product.basePrice = 100;           // ✅ Required
product.wholesalePrice = 150;      // ✅ Required
product.platformProfitPercentage = 15; // ✅ Required
```

### Issue 4: "Stock alert not showing"
```typescript
// Solution: Set reorder levels
product.reorderLevel = 20;         // Alert threshold
product.reorderQuantity = 100;     // Suggested reorder
```

---

## 📈 Profit Optimization Tips

### 1. Set Competitive Margins
- **10-15%**: Low margin, high volume
- **15-25%**: Standard margin
- **25-40%**: Premium products

### 2. Use Tiered Pricing
```typescript
// Example: Encourage bulk orders
Tier 1 (10-49): 3% discount
Tier 2 (50-199): 10% discount  ← Sweet spot
Tier 3 (200+): 20% discount
```

### 3. Monitor Costs
```typescript
// Track all costs
product.costPerUnit = basePrice;
product.shippingCost = 5;
product.handlingCost = 2;

// Total cost = 100 + 5 + 2 = 107
// Set wholesale price = 150 (40% margin)
```

---

## 📊 Key Metrics to Monitor

```typescript
// Daily Checks
- Total Orders
- Average Order Value (AOV)
- Profit Margin %
- Stock Alerts Count

// Weekly Checks
- Top Selling Products
- Low Stock Items
- Profit by Product
- Customer Acquisition

// Monthly Checks
- Revenue vs Cost Trends
- Inventory Turnover
- Profit Growth %
- Customer Retention
```

---

## 🔄 Automated Tasks

### 1. Daily Inventory Check
```bash
# Run at 9 AM daily
npm run check-inventory
# Sends email if stock < reorder level
```

### 2. Weekly Profit Report
```bash
# Run Monday 8 AM
npm run generate-profit-report --period=weekly
# Emails report to admin
```

### 3. Monthly Stock Forecast
```bash
# Run 1st of month
npm run forecast-stock --days=30
# Suggests reorder quantities
```

---

## 💡 Quick Tips

### For Admins
```typescript
// Set default profit percentage globally
POST /api/admin/profit-config
{ platformProfitPercentage: 15 }

// Generate profit report for order
POST /api/admin/profit-reports
{ orderId: "order_123" }

// Check low stock products
GET /api/admin/inventory?lowStock=true
```

### For Developers
```typescript
// Always use utils for calculations
import { calculatePrice } from '@/utils/pricing';
import { calculateProductProfit } from '@/utils/profitCalculation';
import { needsReorder } from '@/utils/inventoryManagement';

// Never hardcode profit calculations
// ❌ Don't do: profit = price - cost
// ✅ Do: profit = calculateProductProfit(...)
```

### For Sellers
```typescript
// Set competitive wholesale prices
// Research market rates
// Consider volume discounts
// Update costs regularly
// Monitor profit margins
```

---

## 📞 Quick Links

- [Full Documentation](./WHOLESALE_ONLY_IMPLEMENTATION.md)
- [Migration Guide](./MIGRATION_GUIDE_WHOLESALE.md)
- [API Reference](./API_REFERENCE.md)
- [Database Schema](./prisma/schema.prisma)

---

## 🎓 Training Resources

### Video Tutorials (To Create)
1. Setting up profit percentages (5 min)
2. Managing inventory alerts (8 min)
3. Creating tiered pricing (6 min)
4. Business verification process (10 min)
5. Generating profit reports (7 min)

### Documentation
- Admin Training Manual
- Seller Onboarding Guide
- Customer User Guide
- Technical API Documentation

---

**Need Help?** Check the full documentation or contact the development team.

---

Last Updated: 2026-01-01
Version: 2.0 (Wholesale-Only)

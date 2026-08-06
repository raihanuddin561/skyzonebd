# B2B & B2C Implementation Guide

## Overview
This document describes how SkyZone BD supports both B2C (Business-to-Consumer) and B2B (Business-to-Business) sales models, similar to Alibaba's approach.

## Customer Types

### 1. **B2C - Retail Customers (Direct/Individual Buyers)**
- Individual consumers buying for personal use
- Small quantity purchases (1 piece or retail packaging)
- Pay retail prices
- Standard shipping and checkout
- Quick ordering process
- No minimum order requirements (MOQ = 1)

### 2. **B2B - Wholesale Customers (Business Buyers)**
- Registered businesses with company information
- Bulk purchasing with tiered pricing
- Minimum Order Quantities (MOQ) apply
- Volume-based discounts
- Request for Quote (RFQ) capability
- Trade assurance and business verification
- Customization options

## User Roles

```typescript
enum UserType {
  GUEST          // Not logged in, B2C shopper
  RETAIL         // Logged in, B2C customer
  WHOLESALE      // Verified B2B buyer
  SELLER         // Business selling products
  ADMIN          // Platform administrator
}
```

## Key Features by Customer Type

### B2C Features (Retail)
✅ Browse products without login
✅ Single-unit purchases
✅ Retail pricing displayed prominently
✅ Quick add to cart
✅ Standard checkout flow
✅ Credit card, mobile payment, COD
✅ Home delivery options
✅ Product reviews and ratings
✅ Wishlist functionality
✅ Easy returns (15-30 days)

### B2B Features (Wholesale)
✅ Company registration required
✅ Business verification process
✅ Bulk pricing tiers visible after login
✅ MOQ (Minimum Order Quantity) enforcement
✅ Request for Quote (RFQ) system
✅ Sample ordering
✅ Custom branding/packaging options
✅ Trade terms (NET 30, NET 60)
✅ Invoice payment options
✅ Dedicated account manager
✅ Volume shipping discounts
✅ Extended return policies

## Product Pricing Structure

### Dual Pricing Model

Each product can have:

```typescript
interface ProductPricing {
  // B2C Pricing
  retailPrice: number;           // Standard price for individuals
  salePrice?: number;            // Promotional retail price
  
  // B2B Pricing
  wholesaleEnabled: boolean;     // Is wholesale available?
  wholesaleMinQty: number;       // Minimum quantity for wholesale
  
  // Tiered Wholesale Pricing
  wholesaleTiers: [
    { minQty: 50, maxQty: 99, price: 45, discount: 10 },
    { minQty: 100, maxQty: 499, price: 40, discount: 20 },
    { minQty: 500, maxQty: null, price: 35, discount: 30 }
  ];
  
  // MOQ for B2C vs B2B
  retailMOQ: 1;                  // Retail: 1 piece
  wholesaleMOQ: 50;              // Wholesale: 50 pieces minimum
}
```

## User Interface Differences

### B2C Product Page
```
┌─────────────────────────────────────┐
│ Product Name                         │
│ ⭐⭐⭐⭐⭐ (234 reviews)              │
│                                      │
│ Price: $50.00                        │
│ 🏷️ Sale: $39.99 (20% OFF)          │
│                                      │
│ Quantity: [ 1 ] [+]                 │
│ [Add to Cart] [Buy Now]             │
│                                      │
│ ℹ️ Want to buy in bulk?             │
│   [View Wholesale Prices] →         │
└─────────────────────────────────────┘
```

### B2B Product Page (After Login)
```
┌─────────────────────────────────────┐
│ Product Name                         │
│ ⭐⭐⭐⭐⭐ (234 reviews)              │
│                                      │
│ Retail Price: $50.00                │
│                                      │
│ 📦 WHOLESALE PRICING                │
│ ├─ 50-99 units:  $45.00 (10% off)  │
│ ├─ 100-499 units: $40.00 (20% off) │
│ └─ 500+ units:   $35.00 (30% off)  │
│                                      │
│ MOQ: 50 pieces                      │
│ Quantity: [ 50 ] [+]                │
│                                      │
│ [Add to Cart] [Request Quote]       │
│ [Contact Supplier] [Order Sample]   │
└─────────────────────────────────────┘
```

## Registration Flow

### B2C Registration (Simple)
1. Name
2. Email
3. Password
4. Phone (optional)
5. ✅ Create Account

### B2B Registration (Detailed)
1. Personal Information
   - Full Name
   - Email
   - Password
   - Phone

2. Business Information
   - Company Name *
   - Business Registration Number *
   - Tax ID / TIN *
   - Company Type (Retailer, Distributor, Manufacturer)
   - Website
   - Number of Employees
   - Annual Purchase Volume

3. Business Address
   - Street Address
   - City / District
   - Postal Code
   - Country

4. Verification Documents
   - Trade License Upload
   - Tax Certificate
   - Bank Statement

5. ✅ Submit for Verification

## Shopping Cart Behavior

### B2C Cart
- Shows retail prices
- Any quantity allowed (MOQ = 1)
- Shipping calculated per item/weight
- Standard payment methods

### B2B Cart
- Shows wholesale prices based on quantity
- Enforces MOQ per product
- Real-time pricing updates as quantity changes
- Displays potential savings
- Option to split order or request quote
- Business payment options (Invoice, NET terms)

## Checkout Process

### B2C Checkout
```
Cart → Shipping Address → Payment → Order Confirmation
```

### B2B Checkout
```
Cart → Quote Review → Company Details → 
Terms Agreement → Payment/Invoice → PO Upload → 
Order Confirmation → Account Manager Assignment
```

## Navigation & Discovery

### Homepage Segmentation
```
┌─────────────────────────────────────┐
│         SkyZone BD                   │
│  [🛍️ Shop Now] [🏢 Wholesale Center]│
└─────────────────────────────────────┘
```

### Separate Sections
1. **Retail Shop** (`/shop`)
   - Consumer-focused browsing
   - Retail prices
   - Featured products
   - Deals and promotions

2. **Wholesale Center** (`/wholesale`)
   - Category browsing
   - Industry solutions
   - Bulk deals
   - Supplier directory
   - RFQ management

## Implementation Strategy

### Phase 1: Database Schema Updates
- Add `userType` to User model (RETAIL, WHOLESALE)
- Add `retailPrice` and `wholesaleEnabled` to Product
- Create `WholesaleTier` model for tiered pricing
- Add `companyInfo` fields for B2B users

### Phase 2: Authentication & Authorization
- Extend user registration for B2B
- Add business verification workflow
- Create middleware to check user type
- Implement role-based pricing display

### Phase 3: Product & Pricing Display
- Dual pricing UI components
- Dynamic price calculation based on user type
- Wholesale tier table component
- MOQ enforcement logic

### Phase 4: Cart & Checkout
- Separate cart logic for B2C/B2B
- Quantity validation per user type
- B2B quote request system
- Invoice payment integration

### Phase 5: Additional Features
- RFQ management system
- Sample order workflow
- Supplier messaging
- Trade assurance

## Technical Implementation Files

### Files to Update:
1. `prisma/schema.prisma` - Database schema
2. `src/types/auth.ts` - User types
3. `src/types/product.ts` - Product pricing
4. `src/contexts/AuthContext.tsx` - User context
5. `src/contexts/CartContext.tsx` - Cart logic
6. `src/app/products/[id]/page.tsx` - Product display
7. `src/app/components/ProductCard.tsx` - Card display
8. `src/app/wholesale/` - New wholesale section

## Benefits of This Approach

### For the Business:
✅ **Larger Market**: Serve both retail AND wholesale customers
✅ **Higher Revenue**: Capture both small and large orders
✅ **Flexible Operations**: One platform, multiple business models
✅ **Competitive Edge**: Like Alibaba's model, proven successful

### For B2C Customers:
✅ **Simple Shopping**: Easy, quick purchases
✅ **No Barriers**: Shop without registration
✅ **Retail Pricing**: Clear, straightforward prices
✅ **Consumer Protection**: Standard return policies

### For B2B Customers:
✅ **Better Prices**: Volume discounts
✅ **Business Features**: RFQ, invoicing, terms
✅ **Verified Suppliers**: Trust and reliability
✅ **Customization**: Branding, packaging options

## Example: Alibaba's Approach

**Alibaba.com** (B2B) vs **AliExpress** (B2C)
- Same company, different platforms
- Different pricing structures
- Different user experiences
- We combine both in ONE platform!

## Conclusion

By implementing both B2C and B2B capabilities, SkyZone BD can:
- Maximize revenue potential
- Serve wider customer base
- Provide flexibility and choice
- Compete effectively in Bangladesh market

This hybrid model is ideal for growing ecommerce platforms!

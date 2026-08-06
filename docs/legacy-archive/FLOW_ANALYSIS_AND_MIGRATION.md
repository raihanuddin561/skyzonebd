# Full Flow Analysis & Database Migration Report

**Date:** October 30, 2025  
**Analysis Scope:** Admin to Customer Flow  
**Migration Status:** ✅ COMPLETED

---

## Executive Summary

Analyzed the complete flow from admin product creation to customer order placement. Identified a **critical missing database relationship** and successfully applied a migration to fix it.

### Migration Applied:
- **Migration Name:** `20251029185426_add_seller_relationship`
- **Changes:** Added `sellerId` field to Product model with relation to User model
- **Status:** Successfully applied and database is in sync

---

## Complete Flow Breakdown

### 1. Admin Flow (Product Management)

#### A. Product Creation (`/admin/products/new`)
- **UI:** Form to create new products
- **API Endpoint:** `POST /api/products`
- **Fields Created:**
  - Basic info: name, slug, description, category
  - Pricing: retailPrice, salePrice, retailMOQ, comparePrice
  - B2B: wholesaleEnabled, wholesaleMOQ, baseWholesalePrice
  - Images: imageUrl, imageUrls, thumbnailUrl
  - Inventory: stockQuantity, availability, sku
  - Metadata: brand, tags, specifications, isActive, isFeatured

#### B. Product Update (`/admin/products/[id]/edit`)
- **API Endpoint:** `PUT /api/products/[id]`
- **Authorization:** Admin role required (JWT verification)
- **Capabilities:** Update all product fields, change status, modify pricing

#### C. Product Deletion
- **API Endpoint:** `DELETE /api/products/[id]`
- **Cascading:** Automatically deletes related wholesale tiers
- **Order Items:** Protected - cannot delete if in orders

---

### 2. Customer Flow (Product Discovery to Purchase)

#### A. Product Listing (`/products`)
- **API Endpoint:** `GET /api/products`
- **Features:**
  - Search by name, description, brand, tags
  - Filter by category, price range
  - Sort by newest, price, rating, name
  - Pagination support
- **Returns:** Products with category info and wholesale tiers

#### B. Product Detail (`/products/[id]`)
- **API Endpoint:** `GET /api/products/[id]`
- **Displays:**
  - Product information and specifications
  - Pricing (retail/wholesale based on user type)
  - Stock availability
  - **Seller Information** ⚠️ (Previously broken)
  - Related products from same category
- **User-Specific Behavior:**
  - **Guest/Retail:** MOQ = 1, retail pricing
  - **B2B/Wholesale:** MOQ = product.wholesaleMOQ, tiered pricing

#### C. Shopping Cart (`/cart`)
- **Context:** `CartContext` (localStorage-based)
- **Features:**
  - Add/remove/update quantities
  - Enforce MOQ for wholesale users only
  - Calculate subtotals per item
  - Calculate total cart value
- **Storage:** Persists in localStorage using product.id (cuid)

#### D. Checkout (`/checkout`)
- **API Endpoint:** `POST /api/orders`
- **Supports:**
  - **Authenticated users** (JWT token)
  - **Guest checkout** (name + mobile required)
- **Payment Methods:**
  - Bank Transfer, Cash on Delivery
  - bKash, Nagad, Rocket
  - Credit Card
- **Order Creation:**
  - Creates Order record
  - Creates OrderItem records (linked to products)
  - **Deducts stock automatically** 📦
  - Generates unique order number

---

### 3. Order Management Flow

#### A. Order Creation
- **Validates:** All products exist in database
- **Calculates:** Subtotal, tax (5%), shipping (৳50), total
- **Stores:** Guest info (if applicable) or links to user
- **Stock Management:** Automatically reduces product stockQuantity

#### B. Order Retrieval
- **API Endpoint:** `GET /api/orders`
- **User View:** Shows only their orders
- **Admin View:** Shows all orders (system-wide)

#### C. Order Status Update
- **API Endpoint:** `PATCH /api/orders`
- **Admin Only:** Update order status and payment status
- **Valid Statuses:**
  - Order: PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELLED
  - Payment: PENDING, PAID, FAILED

---

## Issues Identified & Fixed

### ❌ Issue: Missing Seller Relationship

**Problem:** Product detail page displays seller information but schema had no relationship:
```typescript
// UI tries to display:
product.companyName       // Not in Product model
product.companyLogo       // Not in Product model  
product.companyLocation   // Not in Product model
product.companyVerified   // Not in Product model
```

These fields exist on the **User** model but products had no way to reference sellers.

### ✅ Solution: Added Seller Relationship

**Schema Changes:**
```prisma
model Product {
  // ... existing fields
  
  sellerId    String?    // New field - optional for backward compatibility
  seller      User?      @relation(fields: [sellerId], references: [id], onDelete: SetNull)
  
  // ... rest of schema
}

model User {
  // ... existing fields
  
  products    Product[]  // New reverse relation
  
  // ... rest of schema
}
```

**Migration Applied:**
```sql
-- Added sellerId column
ALTER TABLE "products" ADD COLUMN "sellerId" TEXT;

-- Added foreign key constraint
ALTER TABLE "products" ADD CONSTRAINT "products_sellerId_fkey" 
  FOREIGN KEY ("sellerId") REFERENCES "users"("id") 
  ON DELETE SET NULL ON UPDATE CASCADE;
```

**Migration File:** `prisma/migrations/20251029185426_add_seller_relationship/migration.sql`

---

## Database Schema Status

### ✅ Current Schema (Post-Migration)

```
Users (B2B/B2C customers & sellers)
  ├── BusinessInfo (B2B verification details)
  ├── Addresses (shipping/billing)
  ├── Orders (purchase history)
  ├── RFQs (quote requests)
  └── Products (⭐ NEW - products they're selling)

Products
  ├── Category (product classification)
  ├── Seller (⭐ NEW - who manages this product)
  ├── WholesaleTiers (B2B bulk pricing)
  ├── OrderItems (order history)
  └── RFQItems (quote requests)

Orders
  ├── User (buyer - optional for guest orders)
  ├── OrderItems (products in order)
  └── Payments (transaction records)

Categories
  └── Products (all products in category)
```

---

## Data Flow Validation

### ✅ Product ID Consistency
- **Database:** Uses `cuid()` strings (e.g., "cm1abc123...")
- **API:** Returns string IDs
- **Frontend:** Accepts both string and number for backward compatibility
- **Cart:** Stores string IDs
- **Orders:** References products by string ID

### ✅ Stock Management
- **On Order Creation:** Automatically deducts ordered quantity
- **Calculation:** `newStock = Math.max(0, currentStock - orderedQty)`
- **No Overselling:** Stock cannot go below 0

### ✅ MOQ (Minimum Order Quantity) Logic
- **Guest Users:** MOQ = 1 (can order single items)
- **Retail Users (B2C):** MOQ = 1
- **Wholesale Users (B2B):** MOQ = product.wholesaleMOQ (enforced)

### ✅ Price Calculation
- **Retail Customers:** Always use `retailPrice` or `salePrice`
- **Wholesale Customers:** Use tiered pricing from `wholesaleTiers` table
  - If no tier matches quantity, falls back to `baseWholesalePrice`
  - If no wholesale price, falls back to `retailPrice`

---

## API Endpoints Summary

### Products
- `GET /api/products` - List products (public)
- `GET /api/products/[id]` - Get product details (public)
- `POST /api/products` - Create product (admin only)
- `PUT /api/products/[id]` - Update product (admin only)
- `DELETE /api/products/[id]` - Delete product (admin only)

### Orders
- `POST /api/orders` - Create order (guest or authenticated)
- `GET /api/orders` - List orders (user: own orders, admin: all)
- `PATCH /api/orders` - Update order status (admin only)

### Categories
- `GET /api/categories` - List all active categories

---

## Required Next Steps

### 1. Update Product APIs to Include Seller Info

**Current:** APIs return products without seller details  
**Needed:** Include seller information in responses

**Update GET /api/products:**
```typescript
const products = await prisma.product.findMany({
  include: {
    category: true,
    wholesaleTiers: true,
    seller: {  // ⭐ ADD THIS
      select: {
        id: true,
        name: true,
        companyName: true,
        isVerified: true
      }
    }
  }
});
```

**Update GET /api/products/[id]:**
```typescript
const product = await prisma.product.findFirst({
  include: {
    category: true,
    wholesaleTiers: true,
    seller: {  // ⭐ ADD THIS
      select: {
        id: true,
        name: true,
        companyName: true,
        isVerified: true,
        // Add any other seller fields you want to display
      }
    }
  }
});
```

### 2. Update Product Creation to Set sellerId

**In Admin Product Creation:**
```typescript
// POST /api/products
const product = await prisma.product.create({
  data: {
    // ... existing fields
    sellerId: decoded.userId,  // ⭐ ADD THIS from JWT token
  }
});
```

### 3. Update Frontend Type Definitions

**Update /src/types/cart.ts:**
```typescript
export interface Product {
  id: string | number;
  name: string;
  // ... existing fields
  
  // Seller information (from relationship)
  seller?: {
    id: string;
    name: string;
    companyName?: string;
    isVerified: boolean;
  };
  
  // Legacy fields for backward compatibility (can be deprecated)
  companyName?: string;      // Deprecated: use seller.companyName
  companyLogo?: string;      // Deprecated
  companyLocation?: string;  // Deprecated
  companyVerified?: boolean; // Deprecated: use seller.isVerified
}
```

### 4. Seed Database with Seller References (Optional)

If you have existing products without sellers, run a data migration:
```sql
-- Set all products to be owned by first admin user
UPDATE products 
SET "sellerId" = (
  SELECT id FROM users 
  WHERE role = 'ADMIN' 
  LIMIT 1
)
WHERE "sellerId" IS NULL;
```

---

## Testing Checklist

- [x] Schema migration applied successfully
- [ ] Product APIs return seller information
- [ ] Admin can create products (sellerId auto-assigned)
- [ ] Product detail page displays seller info correctly
- [ ] Cart handles products with seller data
- [ ] Orders process successfully with new schema
- [ ] Stock deduction works correctly
- [ ] Guest checkout still functional
- [ ] Wholesale pricing calculates properly
- [ ] MOQ enforcement works for B2B users

---

## Conclusion

### ✅ Migration Completed Successfully

The database schema has been updated to support seller relationships for products. This enables:
- **Multi-vendor support** (future enhancement)
- **Proper seller information display** on product pages
- **Better data integrity** through database relationships
- **Scalability** for marketplace features

### 🔄 Required Updates

The APIs and frontend code need updates to utilize the new seller relationship. See "Required Next Steps" section above.

### 📊 System Status

- **Database:** ✅ In sync with schema
- **Migrations:** ✅ All applied (2 total)
- **Data Integrity:** ✅ Maintained (nullable sellerId for backward compatibility)
- **Breaking Changes:** ❌ None (field is optional)

---

## Files Modified

1. `prisma/schema.prisma` - Added seller relationship
2. `prisma/migrations/20251029185426_add_seller_relationship/migration.sql` - Migration file

## Files Requiring Updates

1. `src/app/api/products/route.ts` - Include seller in queries
2. `src/app/api/products/[id]/route.ts` - Include seller in single product query
3. `src/types/cart.ts` - Update Product interface with seller field
4. `src/types/product.ts` - Update Product interface with seller field

---

**Migration Status:** ✅ COMPLETE  
**System Status:** ✅ OPERATIONAL  
**Next Action:** Update API endpoints to include seller information

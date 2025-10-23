# System Architecture: B2C & B2B Platform

## 🏗️ Overall Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      SKYZONE BD PLATFORM                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ├─────────────────┬──────────────┐
                              ▼                 ▼              ▼
                    ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
                    │   B2C Path   │   │   B2B Path   │   │  Admin Path  │
                    │   (Retail)   │   │ (Wholesale)  │   │ (Management) │
                    └──────────────┘   └──────────────┘   └──────────────┘
```

## 🔄 User Journey Flow

### B2C (Retail Customer) Journey
```
START
  │
  ├─► Visit Homepage (Guest)
  │     │
  │     ├─► Browse Products (See Retail Prices)
  │     │     │
  │     │     ├─► View Product Details
  │     │     │     │
  │     │     │     └─► Add to Cart (Any Quantity ≥ 1)
  │     │     │
  │     │     └─► Continue Shopping
  │     │
  │     └─► Optional: Register as Retail Customer
  │           │
  │           └─► Fill Simple Form (2 min)
  │                 ├─ Name
  │                 ├─ Email
  │                 ├─ Password
  │                 └─ Phone
  │                       │
  │                       └─► ✅ Instant Access
  │
  ├─► Checkout
  │     │
  │     ├─► Enter Shipping Address
  │     ├─► Select Payment (Card/bKash/COD)
  │     └─► Place Order
  │           │
  │           └─► Order Confirmation
  │                 │
  │                 └─► Delivery in 2-5 days
  │
  └─► END (Happy Customer!)
```

### B2B (Wholesale Customer) Journey
```
START
  │
  ├─► Visit Wholesale Section
  │     │
  │     └─► See "Register for Wholesale" CTA
  │
  ├─► Register as Wholesale Customer
  │     │
  │     └─► Fill Detailed Form (10 min)
  │           ├─ Personal Info
  │           ├─ Company Information
  │           │   ├─ Company Name
  │           │   ├─ Registration Number
  │           │   ├─ Tax ID
  │           │   ├─ Business Type
  │           │   └─ Purchase Volume
  │           └─ Optional: Upload Documents
  │                 ├─ Trade License
  │                 ├─ Tax Certificate
  │                 └─ Bank Statement
  │                       │
  │                       └─► Submit for Verification
  │
  ├─► ⏳ Verification Process (2-3 days)
  │     │
  │     ├─► Admin Reviews Documents
  │     ├─► Admin Verifies Company
  │     └─► Admin Approves/Rejects
  │           │
  │           └─► ✅ APPROVED
  │
  ├─► Login & Browse Products
  │     │
  │     └─► See Wholesale Pricing Tiers
  │           │
  │           ├─► Select Product
  │           └─► View Tiered Pricing
  │                 │
  │                 ├─► Quantity < MOQ = Retail Price
  │                 └─► Quantity ≥ MOQ = Wholesale Price
  │                       │
  │                       └─► Calculate Savings
  │
  ├─► Add to Cart (MOQ Enforced)
  │     │
  │     └─► See Real-time Pricing
  │           │
  │           └─► See Total Savings
  │
  ├─► Options:
  │     │
  │     ├─► Regular Checkout
  │     │     └─► Select Payment (Bank/Invoice/bKash)
  │     │
  │     └─► Request for Quote (RFQ)
  │           └─► Negotiate Custom Terms
  │
  └─► Order Placed
        │
        └─► Bulk Shipment in 5-10 days
              │
              └─► END (Long-term Partner!)
```

## 💾 Database Schema Relationships

```
┌─────────────┐
│    User     │
│─────────────│
│ id          │◄────┐
│ email       │     │
│ userType    │     │ One-to-One
│ role        │     │
│ isVerified  │     │
└─────────────┘     │
       │            │
       │ One-to-One │
       │            │
       ▼            │
┌─────────────┐     │
│BusinessInfo │─────┘
│─────────────│
│ companyName │
│ taxId       │
│ verifyStatus│
└─────────────┘

┌─────────────┐
│   Product   │
│─────────────│
│ retailPrice │
│ salePrice   │
│ retailMOQ   │
│ wholesale   │
│   Enabled   │
└─────────────┘
       │
       │ One-to-Many
       │
       ▼
┌─────────────┐
│ Wholesale   │
│    Tier     │
│─────────────│
│ minQuantity │
│ price       │
│ discount    │
└─────────────┘
```

## 🎯 Pricing Logic Flow

```
User Requests Product Price
        │
        ▼
┌───────────────────────────┐
│ Check User Type           │
└───────────────────────────┘
        │
        ├────────────────┬─────────────────┐
        ▼                ▼                 ▼
   ┌─────────┐     ┌──────────┐     ┌──────────┐
   │  GUEST  │     │  RETAIL  │     │WHOLESALE │
   └─────────┘     └──────────┘     └──────────┘
        │                │                 │
        └────────┬───────┘                 │
                 │                         │
                 ▼                         ▼
        ┌─────────────────┐      ┌────────────────┐
        │  Retail Pricing │      │ Check Quantity │
        │                 │      └────────────────┘
        │ - Show Sale     │               │
        │   Price or      │               │
        │   Retail Price  │      ┌────────┴────────┐
        │                 │      │                 │
        │ - MOQ = 1       │      ▼                 ▼
        └─────────────────┘   Qty < MOQ      Qty ≥ MOQ
                 │               │                 │
                 │               ▼                 ▼
                 │        ┌────────────┐   ┌──────────────┐
                 │        │Show Retail │   │Find Best Tier│
                 │        │+ Upgrade   │   │              │
                 │        │Message     │   │Apply Discount│
                 │        └────────────┘   │              │
                 │               │         │Show Savings  │
                 │               │         └──────────────┘
                 └───────────────┴─────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │ Display Price   │
                        │ to User         │
                        └─────────────────┘
```

## 🛒 Cart Calculation Flow

```
Items in Cart
      │
      ▼
For Each Item:
      │
      ├─► Get Product
      ├─► Get Quantity
      ├─► Get User Type
      │
      ▼
Calculate Price(product, quantity, userType)
      │
      ├─► Retail User → retailPrice × quantity
      │
      └─► Wholesale User
            │
            ├─► Check if qty ≥ MOQ
            │     │
            │     ├─► YES → Find applicable tier
            │     │          │
            │     │          └─► tierPrice × quantity
            │     │
            │     └─► NO → retailPrice × quantity
            │
            ▼
      Sum All Items
            │
            ▼
      ┌───────────────┐
      │  Total Price  │
      └───────────────┘
```

## 🔐 Authorization Matrix

```
┌──────────────┬────────┬────────┬───────────┬───────┐
│   Feature    │ Guest  │ Retail │ Wholesale │ Admin │
├──────────────┼────────┼────────┼───────────┼───────┤
│ Browse       │   ✅   │   ✅   │    ✅     │  ✅   │
│ See Retail   │   ✅   │   ✅   │    ✅     │  ✅   │
│ See Wholesale│   ❌   │   ❌   │    ✅     │  ✅   │
│ Add to Cart  │   ✅   │   ✅   │    ✅     │  ✅   │
│ MOQ = 1      │   ✅   │   ✅   │    ❌     │  ✅   │
│ Bulk Pricing │   ❌   │   ❌   │    ✅     │  ✅   │
│ RFQ          │   ❌   │   ❌   │    ✅     │  ✅   │
│ Invoice Pay  │   ❌   │   ❌   │    ✅     │  ✅   │
│ Verify Users │   ❌   │   ❌   │    ❌     │  ✅   │
└──────────────┴────────┴────────┴───────────┴───────┘
```

## 📊 Component Hierarchy

```
App
├── Layout
│   ├── Header
│   │   ├── Logo
│   │   ├── Navigation
│   │   │   ├── Shop Link (B2C)
│   │   │   └── Wholesale Link (B2B)
│   │   ├── Search
│   │   ├── CartIcon
│   │   └── UserMenu
│   │       ├── If Guest: Login/Register
│   │       ├── If Retail: My Account
│   │       └── If Wholesale: Business Dashboard
│   │
│   └── Main Content
│       │
│       ├── B2C Routes (/shop)
│       │   ├── HomePage
│       │   ├── ProductList
│       │   │   └── ProductCard
│       │   │       └── PriceDisplay (Retail)
│       │   ├── ProductDetail
│       │   │   ├── PriceDisplay (Retail)
│       │   │   └── WholesaleUpgradeCTA
│       │   └── Checkout
│       │
│       └── B2B Routes (/wholesale)
│           ├── WholesaleHome
│           ├── ProductList
│           │   └── ProductCard
│           │       └── PriceDisplay (Wholesale)
│           ├── ProductDetail
│           │   ├── PriceDisplay (Wholesale Tiers)
│           │   ├── RFQButton
│           │   └── ContactSupplier
│           ├── RFQManagement
│           └── BusinessCheckout
│
└── Context Providers
    ├── AuthContext (User Type)
    ├── CartContext (Pricing Logic)
    └── WishlistContext
```

## 🎨 Component: PriceDisplay Logic

```
<PriceDisplay>
      │
      ├─► Props In:
      │   ├─ product
      │   ├─ quantity
      │   ├─ userType
      │   └─ showWholesaleTiers
      │
      ▼
┌────────────────────────┐
│ calculatePrice()       │
│ - product              │
│ - quantity             │
│ - userType             │
└────────────────────────┘
      │
      ▼
┌────────────────────────┐
│ PriceInfo Object       │
│ ├─ price               │
│ ├─ originalPrice       │
│ ├─ discount            │
│ ├─ tier                │
│ ├─ savings             │
│ └─ priceType           │
└────────────────────────┘
      │
      ▼
   Render:
      │
      ├─► Main Price (Large)
      ├─► Original Price (Strikethrough)
      ├─► Discount Badge
      ├─► Savings Amount
      │
      └─► If Wholesale:
            └─► Tiered Pricing Table
```

## 🔄 State Management

```
Global State (Context)
├── AuthContext
│   ├── user
│   │   ├─ userType (retail/wholesale)
│   │   ├─ isVerified
│   │   └─ businessInfo
│   ├── isRetailCustomer (computed)
│   └── isWholesaleCustomer (computed)
│
├── CartContext
│   ├── items[]
│   ├── addToCart(product, qty)
│   │   └─► Validates MOQ per userType
│   ├── getTotalPrice()
│   │   └─► Uses calculatePrice() per item
│   └── isLoaded
│
└── WishlistContext
    └── items[]
```

## 📱 Responsive Behavior

```
Desktop (>1024px)
├── Full Navigation
├── Side-by-side comparison
└── Full wholesale tier table

Tablet (768-1024px)
├── Collapsible navigation
├── Stacked layout
└── Scrollable tier table

Mobile (<768px)
├── Hamburger menu
├── Vertical stacking
└── Minimal tier display
    └── Tap to expand
```

---

This architecture provides a complete separation of concerns while sharing the same codebase! 🚀

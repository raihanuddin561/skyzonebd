# SkyzoneBD Wholesale E-commerce — Comprehensive Audit Report (Phase 1)

**Date**: November 2, 2026  
**Auditor**: Senior Full-Stack, Financial Systems & Product Architecture Team  
**Scope**: Read-only codebase discovery, financial calculation map, data model inspection, profit-sharing analysis, risk assessment, and UI/UX review.  
**Platform Currency**: Bangladeshi Taka (BDT ৳)

---

## 1. Executive Summary

SkyzoneBD is a wholesale B2B e-commerce platform targeted at the Bangladesh market (specifically electrical hardware, LED lighting, wiring, switches, and components). The codebase possesses a strong foundational implementation of volume-based wholesale tier pricing, Weighted Average Cost (WAC) inventory lot tracking, and double-entry financial ledger accounting.

However, the audit reveals **critical financial architecture gaps, hardcoded business values, missing delivery/coupon engines, disconnected admin settings, and floating-point money math risks**:
1. **Financial Disconnect**: Customer checkout pricing, order creation in `POST /api/orders`, and admin settings in `siteSettings.ts` are completely disconnected. Delivery charges and taxes in `POST /api/orders` read from `process.env` rather than the database, and ignore settings such as `freeShippingThreshold` or `minimumOrderAmount`.
2. **Coupons Do Not Exist**: There is no coupon or discount model in the database, no coupon calculation engine, and no checkout coupon input.
3. **Floating-Point Storage**: All currency and financial amounts (unit prices, subtotals, grand totals, cost of goods, ledger entries, distributions) are stored as IEEE-754 `Float` (`DOUBLE PRECISION` in Postgres), causing inherent binary rounding and precision drift.
4. **Profit-Sharing Deficiencies**: Profit distributions are computed via ad-hoc percentage multiplication without versioned rules, without 100% total validation, without largest-remainder poisha balancing, without reserve/retained earnings deduction, and without loss carry-forward mechanics.
5. **No Dynamic Delivery Engine**: There are no delivery zones (Inside Dhaka, Suburbs, Outside Dhaka), weight/carton rules, or conditional charges configured in the system.
6. **Design & Brand Identity**: The interface relies on generic Tailwind classes with inconsistent styling, low visual hierarchy, missing Bangla localization, and no cohesive wholesale brand identity.

---

## 2. Tech Stack & Infrastructure

| Layer | Technology | Version | Purpose / Configuration Notes |
| :--- | :--- | :--- | :--- |
| **Framework** | Next.js (App Router) | `16.0.7` | Turbopack dev, Node.js runtime, standalone builds |
| **UI Library** | React | `19.0.0` | React 19 Concurrent Features, Client & Server Components |
| **Styling** | Tailwind CSS | `^4.0.0` | Modern `@tailwindcss/postcss` v4 compiler with custom CSS in `globals.css` |
| **Database** | PostgreSQL | Neon Serverless | Hosted PostgreSQL instance with connection pooling |
| **ORM** | Prisma ORM | `6.16.3` | Schema definition, migrations, client generator (`@prisma/client`) |
| **Authentication** | Custom JWT + Bcrypt | `jsonwebtoken 9.0.2`, `bcryptjs 3.0.2` | 7-day tokens, HTTP Authorization header, password hashing |
| **Validation** | Zod | `4.3.5` | Request body validation schemas |
| **File Storage** | Vercel Blob | `@vercel/blob 2.0.0` | Product images, receipts, trade licenses |
| **Email Service** | Resend / Custom Provider | Modular | Order confirmations, password reset, stock alerts, verification |
| **State Management** | React Context API | Custom | `AuthContext`, `CartContext`, `WishlistContext` |
| **Date Utilities** | date-fns | `4.1.0` | Date manipulation and period bucketing |
| **Notifications** | React-Toastify | `11.0.5` | Client-side feedback toasts |
| **Testing** | Jest + React Testing Library | `Jest 30.2.0`, `ts-jest 29.4.6` | 96 test suites, 718 automated unit and integration tests |
| **Deployment** | Vercel | Production | `vercel.json`, `scripts/migrate.js` on build |

---

## 3. Project Structure & API Surface

### 3.1 Folder Organization
```
skyzonebd/
├── prisma/
│   ├── schema.prisma           # Complete data model definition (45+ models/enums)
│   ├── seed.ts                 # Database seeding script
│   └── migrations/             # Historical Prisma migration files
├── src/
│   ├── app/                    # Next.js App Router (Pages & API endpoints)
│   │   ├── (storefront)/       # Customer pages: /, /products, /cart, /checkout, /orders, /rfq
│   │   ├── admin/              # Admin pages: dashboard, inventory, orders, financial, payouts, settings
│   │   ├── partner/            # Partner portal: dashboard, payouts, reviews
│   │   └── api/                # REST API route handlers
│   ├── components/             # Reusable UI widgets, tables, modals, cards, SEO schemas
│   ├── config/                 # SEO and API URL configuration
│   ├── contexts/               # Client-side React contexts (Auth, Cart, Wishlist)
│   ├── hooks/                  # Custom React hooks (useProducts, useCategories, useSearch)
│   ├── lib/                    # Core utilities: prisma, auth, permissions, financialLedger, siteSettings
│   ├── services/               # Domain services: inventoryService, invoiceService, paymentService
│   ├── types/                  # TypeScript interface and enum declarations
│   └── utils/                  # Calculation engines: pricingEngine, cartPricing, profitCalculation
├── docs/                       # Architecture decisions, operational runbooks, changelogs
└── __tests__/                  # Comprehensive test suites
```

### 3.2 Complete API Surface Inventory

| Method | Endpoint Path | Primary Purpose | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | User / Customer Registration | Public |
| `POST` | `/api/auth/login` | Authentication & JWT issuance | Public |
| `POST` | `/api/auth/forgot-password` | Single-use hashed password reset token generation | Public |
| `POST` | `/api/auth/reset-password` | Validate token and set new password | Public |
| `GET, POST` | `/api/products` | Browse catalog (GET) / Create product (POST) | GET: Public; POST: Admin |
| `GET, PUT, DELETE` | `/api/products/[id]` | Product detail (GET) / Update / Delete | GET: Public; PUT/DEL: Admin |
| `GET` | `/api/products/[id]/related` | Related products by category & tags | Public |
| `GET` | `/api/products/[id]/frequently-bought-together` | Association analysis products | Public |
| `GET, POST` | `/api/categories` | List categories (GET) / Create category (POST) | GET: Public; POST: Admin |
| `GET, PUT, DELETE` | `/api/categories/[id]` | Category operations | GET: Public; PUT/DEL: Admin |
| `GET, POST, PATCH` | `/api/orders` | List orders (GET) / Place order (POST) / Status update (PATCH) | POST: Public/Auth; GET/PATCH: Auth/Admin |
| `GET, PUT, DELETE` | `/api/orders/[id]` | Single order lookup & status management | Authenticated / Admin |
| `POST` | `/api/orders/[id]/return` | Customer initiate return request | Authenticated Customer |
| `GET` | `/api/orders/[id]/invoice` | Generate/view printable order invoice | Authenticated Customer / Admin |
| `POST` | `/api/orders/cancel` | Cancel order before shipment | Authenticated Customer / Admin |
| `POST` | `/api/admin/orders/create` | Admin manual order creation for offline/call orders | Admin |
| `POST` | `/api/admin/orders/[id]/items` | Edit order line items and recalculate totals | Admin |
| `POST` | `/api/admin/orders/[id]/verify-payment` | Admin verify manual payment submission | Admin |
| `GET` | `/api/payment-config` | Public active manual payment configurations (bKash/Bank) | Public |
| `GET, POST` | `/api/admin/payment-config` | Admin manage payment accounts | Admin |
| `GET, PUT, DELETE` | `/api/admin/payment-config/[id]` | Single payment configuration CRUD | Admin |
| `GET, POST` | `/api/admin/partners` | List and create partner/investor profiles | Admin |
| `GET, PUT, DELETE` | `/api/admin/partners/[id]` | Partner profile and profit share settings | Admin |
| `GET, POST` | `/api/admin/partners/[id]/contributions` | Capital contributions ledger | Admin |
| `GET, POST` | `/api/admin/partners/[id]/settlement` | Partner final exit and payout settlement | Admin |
| `POST` | `/api/admin/payouts/generate` | Generate period payout statement for partner | Admin |
| `GET, PATCH` | `/api/admin/payouts/[id]` | Payout statement detail and status transition (Approve/Pay) | Admin (Maker-Checker) |
| `GET` | `/api/admin/financial/ledger` | Query append-only financial ledger | Admin |
| `POST` | `/api/admin/financial/ledger/reconcile` | Mark ledger entries reconciled | Admin |
| `GET` | `/api/admin/financial/profit-loss` | Platform P&L calculation report | Admin |
| `GET` | `/api/admin/financial/outstanding-payouts` | Aging & summary of partner distributions | Admin |
| `GET` | `/api/admin/financial/cost-breakdown` | Categorized expense breakdown | Admin |
| `GET` | `/api/admin/financial/revenue-analytics` | Revenue and volume trends | Admin |
| `GET` | `/api/admin/financial/partner-comparison` | Multi-partner distribution comparison | Admin |
| `GET, POST` | `/api/admin/costs` | Operational expense management | Public / Admin (Needs auth fix) |
| `GET, POST` | `/api/admin/manual-sales` | Record offline/direct sales entries | Admin |
| `GET, PUT, DELETE` | `/api/admin/manual-sales/[id]` | Manage manual sales entry | Admin |
| `GET, POST` | `/api/admin/purchase-orders` | Supplier PO management | Admin |
| `POST` | `/api/admin/purchase-orders/[id]/receive` | Receive stock from PO into StockLots | Admin |
| `GET, POST` | `/api/admin/suppliers` | Supplier master records | Admin |
| `GET, POST` | `/api/admin/returns` | Return request administration | Admin |
| `PATCH` | `/api/admin/returns/[id]` | Approve/reject customer return | Admin |
| `POST` | `/api/admin/returns/[id]/refund` | Issue financial refund for approved return | Admin |
| `GET, PUT` | `/api/admin/settings` | Read and write site/order settings | Admin |
| `GET, POST` | `/api/rfq` | Request for Quote submission & listing | Authenticated User |
| `POST` | `/api/rfq/[id]/respond` | Admin quote response to RFQ | Admin |
| `GET, POST` | `/api/wishlist` | Manage persistent user wishlist | Authenticated User |
| `DELETE` | `/api/wishlist/[productId]` | Remove item from wishlist | Authenticated User |
| `GET, POST` | `/api/reviews` | Submit product review | Authenticated Buyer |
| `PATCH` | `/api/reviews/[id]` | Helpful voting on reviews | Authenticated User |
| `GET, POST` | `/api/user/addresses` | Customer address book | Authenticated User |
| `GET, PUT` | `/api/user/profile` | Customer profile and verification details | Authenticated User |

---

## 4. Data Model Audit (Prisma Schema)

The current schema in `prisma/schema.prisma` contains 45+ models and enums. Below is the structural evaluation of core domain models:

### 4.1 Product & Pricing Models
- **`Product`**:
  - `id` (String cuid), `name`, `slug` (unique), `description`, `brand`, `sku` (unique), `unit`.
  - `basePrice` (`Float`): Purchase/cost price baseline.
  - `wholesalePrice` (`Float`): Standard wholesale selling price.
  - `moq` (`Int?`): Minimum order quantity.
  - `platformProfitPercentage` (`Float`, default 15): Target profit margin for the platform.
  - `calculatedProfit` (`Float?`), `sellerProfit` (`Float?`).
  - `stockQuantity` (`Int`), `reorderLevel` (`Int`, default 20), `reorderQuantity` (`Int`, default 100).
  - `taxRate` (`Float?`), `taxInclusive` (`Boolean`, default false), `taxCategory` (`String?`).
  - *Risk*: All money fields are `Float`.
- **`WholesaleTier`**:
  - `id` (String cuid), `productId`, `minQuantity` (`Int`), `maxQuantity` (`Int?`), `price` (`Float`), `discount` (`Float`), `profitMargin` (`Float?`).
  - *Constraint*: `@@unique([productId, minQuantity])`.
  - *Missing*: Pack size / step quantity constraint; overlap/gap validation at DB level.

### 4.2 Order & Transaction Models
- **`Order`**:
  - `id`, `orderNumber` (unique), `userId` (nullable for guests), `guestName`, `guestPhone`, `guestEmail`.
  - `subtotal` (`Float`), `tax` (`Float`, default 0), `shipping` (`Float`, default 0), `total` (`Float`).
  - `totalCost` (`Float?`), `grossProfit` (`Float?`), `platformProfit` (`Float?`), `sellerProfit` (`Float?`), `profitMargin` (`Float?`).
  - `status` (`OrderStatus`: PENDING, CONFIRMED, PROCESSING, PACKED, SHIPPED, IN_TRANSIT, DELIVERED, CANCELLED, RETURNED, REFUNDED).
  - `paymentStatus` (`PaymentStatus`: PENDING, PENDING_VERIFICATION, PAID, PARTIAL, FAILED, REFUNDED).
  - `paymentMethod` (`String`), `paymentReference` (`String?`), `paymentTerms` (`PaymentTermsType?`: NET30, NET60, NET90).
  - *Missing*: Coupon code reference, discount breakdown, delivery zone snapshot, setting snapshots (e.g. VAT rate snapshot at order time).
- **`OrderItem`**:
  - `id`, `orderId`, `productId`, `quantity` (`Int`), `price` (`Float`), `total` (`Float`).
  - `costPerUnit` (`Float?`), `profitPerUnit` (`Float?`), `totalProfit` (`Float?`), `profitMargin` (`Float?`).
  - *Missing*: Allocated coupon discount, VAT amount per line item, unit cost snapshot guarantee.

### 4.3 Missing Models
- **Coupon / Discount System**: ❌ **Zero models exist.** No `Coupon`, `CouponUsage`, `CouponProduct`, or `CouponCategory`.
- **Delivery Configuration**: ❌ **Zero models exist.** No `DeliveryZone`, `DeliveryChargeRule`, or `DistrictRate`.
- **Versioned Profit Share Rules**: ❌ **Zero models exist.** `Partner.profitSharePercentage` is a raw mutable field on the `Partner` model with no historical audit trail or versioning.
- **Profit Periods / Distribution Master**: ❌ Current `ProfitDistribution` records are created per partner without a parent `ProfitPeriod` entity, making period-level locking, reserve calculation, and largest-remainder balancing impossible.

---

## 5. Feature Inventory & Current State

| Feature Area | Customer Experience | Admin Experience | Status |
| :--- | :--- | :--- | :--- |
| **Product Browsing** | Grid/category view, search suggestions, brand/tag filtering | List view, category management, image upload | 🟢 **Working** |
| **Tiered Pricing Display** | Tier table on product page shows price per volume band | Tier creator on product edit form | 🟢 **Working** |
| **Cart & Quantity Stepper** | Updates quantity, respects MOQ for wholesale customers | N/A | 🟢 **Working** |
| **Coupon Codes** | No input field exists in cart or checkout | No coupon management screen in admin | 🔴 **Missing** |
| **Delivery Zones & Charges** | No zone selection (Dhaka vs. Outside Dhaka). Shipping shows ৳0 | Static `freeShippingThreshold` in settings (ignored by API) | 🔴 **Broken / Missing** |
| **Checkout Flow** | Submits guest or user order; records transaction reference | Order detail view, status transitions, manual order creation | 🟡 **Partial** (Charges not dynamically applied) |
| **Order Confirmation** | Confirmation page with items and order number | Activity log entry, email notification | 🟢 **Working** |
| **Invoicing & NET Terms** | Printable invoice page for NET30/60/90 orders | Accounts receivable aging table | 🟢 **Working** |
| **Inventory & WAC Costing** | Real-time stock decrement inside DB transaction | Stock lots, FIFO/WAC depletion, restock tracking | 🟢 **Working** |
| **Customer Discounts** | User profile special discount applied at checkout | Admin assigns special discount % to customer profile | 🟢 **Working** |
| **Profit Sharing** | Partner portal displays summary and distribution history | Payout generation, maker-checker approval, ledger posting | 🟡 **Flawed Logic** (No reserve, no 100% check, no loss carryover) |
| **Expense Tracking** | N/A | Operational cost entry with categories and receipts | 🟢 **Working** |
| **Admin Settings** | General, orders, and carousel settings form | Form exists but settings are NOT wired to checkout/orders | 🔴 **Broken Disconnect** |

---

## 6. Hardcoded Values & Magic Numbers

A comprehensive search of the repository reveals static values that must be made dynamic:

| Category | File Path | Line | Code / Magic Value | Impact / Problem |
| :--- | :--- | :--- | :--- | :--- |
| **Charges / Shipping** | `src/app/api/orders/route.ts` | 253 | `process.env.SHIPPING_CHARGE ? parseFloat(...) : 0` | Falls back to 0; ignores delivery zones and admin settings |
| **Tax / VAT Rate** | `src/app/api/orders/route.ts` | 254 | `process.env.TAX_RATE ? parseFloat(...) : 0` | Defaults to 0; ignores database tax configuration |
| **Tax in Payouts** | `src/app/api/admin/payouts/generate/route.ts` | 167 | `const taxRate = 0; // Set to 0.15 for 15% VAT` | Hardcoded zero tax rate inside payout generation |
| **Minimum Order Amount** | `src/lib/siteSettings.ts` | 15 | `minimumOrderAmount: 500` | Hardcoded default; never enforced in `POST /api/orders` |
| **Free Shipping Threshold** | `src/lib/siteSettings.ts` | 16 | `freeShippingThreshold: 2000` | Hardcoded default; never enforced during checkout |
| **Site Settings Tax Rate** | `src/lib/siteSettings.ts` | 17 | `taxRate: 0` | Hardcoded default; disconnected from order engine |
| **Platform Profit %** | `prisma/schema.prisma` | 271 | `platformProfitPercentage Float @default(15)` | Default 15% baked into database schema definition |
| **Default MOQ** | `src/utils/pricing.ts` | 52 | `moq = 10` | Hardcoded fallback MOQ of 10 units |
| **Default Sample MOQ** | `prisma/schema.prisma` | 302 | `sampleMOQ Int @default(1)` | Default sample MOQ baked into schema |
| **Currency Symbol** | `src/utils/pricingEngine.ts` | 225 | `currency: string = '৳'` | Hardcoded fallback symbol |
| **Currency Symbol** | `src/utils/pricing.ts` | 484 | `currency: string = 'BDT'` | Inconsistent currency code (`BDT` vs `৳`) |
| **Currency in Components** | `src/app/cart/page.tsx` | 140, 176 | `৳{...}` hardcoded in JSX | Cannot be altered by admin settings |
| **Contact Phone Placeholder**| `src/lib/siteSettings.ts` | 9 | `phone: '+880 1234-567890'` | Static placeholder |
| **Checkout Phone Placeholder**| `src/app/checkout/page.tsx` | 460 | `placeholder="+880-1711-123456"` | Hardcoded test phone placeholder |
| **Confirmation Phone** | `src/app/order-confirmation/page.tsx` | 393 | `Phone: +880-1711-123456` | Static phone displayed to real customers |
| **Inventory Reorder Alerts** | `prisma/schema.prisma` | 277-278 | `@default(20)`, `@default(100)` | Hardcoded reorder level and quantity defaults |

---

## 7. Calculation Map & Flow Trace

```
========================================================================================
CURRENT VALUE           COMPUTED WHERE       FORMULA / IMPLEMENTATION            SERVER TRUSTS
                                                                                 CLIENT INPUT?
========================================================================================
Unit Tier Price         Client & Server      findApplicableTier(wholesaleTiers)  NO (Server recalculates)
Line Total              Client & Server      tierPrice * qty * (1 - custDiscount)NO (Server recalculates)
Customer Discount       Client & Server      (subtotalBeforeDiscount * disc%)    NO (Server validates user)
Order Subtotal          Client & Server      Σ (Line Totals)                     NO (Server recalculates)
Coupon Discount         NOWHERE              Not implemented                     N/A
Delivery Charge         Server Only          process.env.SHIPPING_CHARGE || 0    IGNORES CLIENT & SETTINGS
VAT / Tax               Server Only          subtotalAfterDiscount * env.TAX_RATEIGNORES CLIENT & SETTINGS
Grand Total             Server Only          subtotal + shipping + tax           SERVER-GENERATED
Line Cost (COGS)        Server Only          WAC from StockLots || basePrice     NO (Server calculates)
Line Profit             Server Only          Line Revenue - Line Total Cost      NO (Server calculates)
Gross Order Profit      Server Only          Σ (Line Profits) on DELIVERED       NO (Server calculates)
Partner Payout Share    Server Only          netProfit * (partnerShare% / 100)   NO (Server calculates)
========================================================================================
```

### Analysis of the Calculation Pipeline:
1. **Server Pricing Integrity**: The server currently rejects client-tampered product prices. `POST /api/orders` re-reads product records and wholesale tiers, re-verifies customer discounts, and computes line totals from scratch.
2. **Missing Delivery Calculation**: Neither client nor server evaluates delivery destination. A delivery to Sylhet or Chittagong charges the exact same default (৳0) as a delivery across the street in Motijheel.
3. **Missing Tax Integration**: Products have `taxRate` and `taxInclusive` columns in `Product`, but `POST /api/orders` completely ignores them, applying a single global `process.env.TAX_RATE` to the whole subtotal.
4. **Order-Level Discount Allocation**: When customer discounts apply, they are calculated per line item. However, there is no mechanism to proportionally allocate an order-level coupon discount across lines to keep line profit accurate.

---

## 8. Existing Profit-Sharing & Partner Logic Audit

### 8.1 How It Works Today
- **Stakeholder Registry**: `Partner` model tracks name, email, phone, `profitSharePercentage` (`Float`), `initialInvestment`, `totalProfitReceived`, and optional `userId`.
- **Payout Generation**: Triggered by admin in `POST /api/admin/payouts/generate` for a given `partnerId` and date range (`startDate`, `endDate`).
- **Revenue & COGS Source**: Reads `getFinancialSummary(start, end)` from `FinancialLedger` (recognizing only DELIVERED orders).
- **Expense Deductions**: Reads `summary.operationalCosts` + `summary.salaryExpenses`.
- **Calculation Formula**:
  $$\text{grossProfit} = \text{totalRevenue} - \text{totalCOGS}$$
  $$\text{operatingProfit} = \text{grossProfit} - \text{totalOperationalCosts}$$
  $$\text{netProfit} = \text{operatingProfit} - \text{totalReturns} - \text{netShippingImpact} - \text{taxAmount}$$
  $$\text{partnerShare} = \text{netProfit} \times \left(\frac{\text{partnerSharePercentage}}{100}\right)$$
  $$\text{distributionAmount} = \max(0, \text{partnerShare})$$
- **Maker-Checker Workflow**: Payouts are generated in `PENDING` state, approved by an admin in `APPROVED` state, and recorded as `PAID` with payment reference and ledger posting.

### 8.2 Deficiencies & Mathematical Errors
1. **No 100% Total Validation**: The system calculates payouts partner-by-partner. Nothing validates that active partners' percentages sum to 100%. If Partner A is 40% and Partner B is 35%, 25% of net profit is unallocated and lost from view.
2. **No Versioning of Share Rules**: `Partner.profitSharePercentage` is a single scalar column. If a partner's share changes from 30% to 35% on June 15, regenerating a report for May will use 35%, corrupting historical statements.
3. **Floating-Point Rounding & Leftover Poisha**: A net profit of ৳100,000.01 split 50/50 gives ৳50,000.005 each. With standard rounding, both round up to ৳50,000.01 (totaling ৳100,000.02) or both round down (totaling ৳100,000.00). The **Largest Remainder Method** is not implemented.
4. **Zero Reserve / Retained Earnings**: The system does not deduct an admin-configured reserve percentage before distributing profit.
5. **Loss Period Mishandling**: When `netProfit < 0`, `distributionAmount` is capped at 0 (`Math.max(0, partnerShare)`). The loss is simply discarded. In the next period, if the company makes a profit, partners receive distributions without having absorbed the previous period's operating loss.
6. **No Sub-period Segmentation**: If a partner joins or leaves mid-month, or percentages change mid-month, the system cannot apportion profit based on order completion timestamps within sub-periods.

---

## 9. Security, Concurrency & Code Risks

1. **Floating Point Currency (High)**: Storing money as `Float` in Prisma leads to IEEE-754 precision issues (e.g. `0.1 + 0.2 === 0.30000000000000004`). In high-volume wholesale orders, fractional poisha errors accumulate into noticeable discrepancies.
2. **Missing Rate Limiting on Order Creation (Medium)**: `POST /api/orders` lacks an idempotency key header (`Idempotency-Key`). A double-click on "Place Order" under network lag can create duplicate orders before the first transaction finishes.
3. **Operational Cost Endpoint Auth Gap (High)**: `src/app/api/admin/costs/route.ts` does not call `requireAdmin()` on `POST` or `GET`. Any unauthenticated HTTP client can read or insert company expense records.
4. **Employee Endpoint Auth Gap (High)**: `src/app/api/admin/employees/route.ts` and `[id]/route.ts` do not enforce `requireAdmin()`. Employee salaries, NID, and bank account numbers are exposed.
5. **No Database Migration for Unique Constraints (Medium)**: Advisory locks are used in application code to prevent race conditions on payouts and profit reports because unique constraints (`@@unique([partnerId, startDate, endDate])` and `@@unique([orderId])`) exist in schema.prisma but were never applied via a Prisma migration to the PostgreSQL database.
6. **Cost & Margin Leak in Product API (Medium)**: `GET /api/products` and `/api/products/[id]` filter out `basePrice` and `costPerUnit` for non-admins, but variant/specification JSON fields must be audited to ensure supplier costs are never leaked.

---

## 10. UI/UX Assessment (Storefront & Admin)

### 10.1 Storefront Quality & Inconsistencies
- **Visual Polish**: The current storefront uses default Tailwind blues (`#3B82F6`, `#1D4ED8`) and basic cards. It looks like an engineering prototype rather than an authoritative, premier B2B trading portal.
- **Mobile Experience**: While functional on mobile, touch targets for quantity steppers and table scrollbars on mobile (360px) are cramped.
- **Bangla Language Support**: The site is 100% English. B2B wholesale buyers across Dhaka (e.g. Nawabpur electrical market) and regional districts heavily prefer Bangla typography (Hind Siliguri / Noto Sans Bengali) or bilingual labels.
- **Checkout Summary Deficit**: The checkout page does not display a transparent cost breakdown (subtotal, delivery fee by zone, VAT, total). It only shows a single raw number.
- **Trust Elements**: Lacks prominent supplier verification badges, trade license verification stamps, VAT receipt indicators, and clear wholesale MOQ savings callouts.

### 10.2 Admin Panel Assessment
- **Navigation & IA**: The admin panel has extensive sub-pages (accounts-receivable, cost-breakdown, ledger, manual-sales, payouts, etc.), but navigation is fragmented across disconnected menu items.
- **Settings Disconnect**: The Admin Settings UI provides input fields for minimum order amount, free shipping threshold, and tax rate, but saving them has zero effect on customer orders, giving administrators a false sense of control.
- **Finance UI**: The Partner Payouts UI operates on individual partners rather than coherent accounting periods, preventing holistic reconciliation of total company profit.

---

## 11. Prioritized Problem List

### 🔴 Critical Priority (Must Fix in Phase 2 & 3)
1. **Unify Calculation Service on Server**: Replace disparate pricing logic (`pricingEngine.ts`, `cartPricing.ts`, `pricing.ts`, `orders/route.ts`) with a single authoritative server calculation engine.
2. **Wire Dynamic Settings to Checkout & Orders**: Connect database settings (delivery charges, free shipping threshold, minimum order amount, VAT) directly into order calculation.
3. **Precision Money Math**: Convert all money calculations to fixed-precision integer poisha (1 ৳ = 100 poisha) or exact Decimal math to eliminate floating-point drift.
4. **Implement Missing Coupon Engine**: Build the complete Coupon data model, validation rules, usage capping, and order-level discount proportional allocation.
5. **Fix Profit Sharing Mathematics**: Implement versioned share rules, strict 100% sum validation, largest-remainder poisha distribution, reserve deduction, and loss carry-forward.
6. **Secure Open Admin Endpoints**: Enforce `requireAdmin()` on `api/admin/costs` and `api/admin/employees`.

### 🟠 High Priority (Phases 3 & 4)
7. **Idempotent Checkout**: Add idempotency key handling to prevent duplicate order submission on double-click.
8. **Delivery Zones Engine**: Implement admin-configurable delivery zones (Inside Dhaka, Suburbs, Outside Dhaka) with flat/weight-based rates.
9. **Real Database Migrations**: Deploy the missing unique constraints to PostgreSQL to provide hardware-level concurrency guarantees.
10. **Period-Based Profit Distribution**: Create a first-class `ProfitPeriod` model with states (`OPEN` → `CALCULATED` → `APPROVED` → `LOCKED` → `PAID`).

### 🟡 Medium Priority (Phases 4 & 5)
11. **Bilingual / Bangla Typography**: Integrate Google Fonts for Bangla (`Hind Siliguri`) and establish bilingual UI labels.
12. **Complete Admin Settings Redesign**: Group settings into clear categories (General, Delivery, Tax, Charges & Fees, Coupons, Profit Sharing) with instant cache invalidation.
13. **Wholesale Pack Size & Step Validation**: Support carton/dozen step sizing on product volume tiers.

### 🟢 Low Priority (Phase 5 Polish)
14. **Design System & Dark Mode**: Refine color tokens, shadows, radius, and elevation scales with WCAG AA accessibility compliance.
15. **Performance & Lighthouse Optimization**: Optimize image delivery, code splitting, and cache headers for 90+ Lighthouse mobile performance.

---

## 12. Questions for Business Owner (Clarifications Needed)

To ensure Phase 2, Phase 3, and Phase 4 match your exact operational model, please confirm or provide the details for the blank items from the brief:

1. **Brand Identity & Colors**:
   - What are the official brand hex colors (Primary, Accent, Dark Neutral)?
   - Do you have an official SVG/high-res logo to replace the current placeholder?
2. **Languages**:
   - Should the platform support English only, Bangla only, or a toggle for both?
3. **Delivery Zones & Charges**:
   - What are your current delivery zones (e.g. Inside Dhaka: ৳80, Dhaka Suburbs: ৳120, Outside Dhaka: ৳150)?
   - What is the target Free Delivery order threshold (e.g. ৳5,000 or ৳10,000)?
4. **Payment Methods & Fees**:
   - Do you charge a fee for Cash on Delivery (COD)?
   - Are bKash / Nagad gateway surcharge fees absorbed by SkyzoneBD or passed to the customer?
5. **VAT / Tax Policy**:
   - Is VAT currently active? If so, what is the standard rate (e.g. 5%, 7.5%, or 15%)?
   - Are catalog prices considered **inclusive** of VAT, or should VAT be added **on top** at checkout?
6. **Coupon Business Rules**:
   - Can coupons discount delivery fees, or only the product subtotal?
   - Do coupons apply before VAT calculation or after VAT calculation?
7. **Profit Sharing Stakeholders**:
   - Who are the current partners/stakeholders and what are their respective percentage stakes?
   - What percentage of net profit should be held in Reserve / Retained Earnings (e.g., 0%, 5%, 10%)?
   - What is the formal distribution frequency (Monthly or Quarterly)?
   - In the event of a net loss in a month, should the loss **carry forward** to reduce the next month's distributable profit, or is it absorbed separately?


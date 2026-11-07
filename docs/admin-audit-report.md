# SkyzoneBD Admin Panel — Full Functional & Architectural Audit Report
**Date:** November 2026  
**Auditor:** Senior Full-Stack Engineer, QA Lead & System Architect  
**Platform:** SkyzoneBD (B2B Wholesale Electrical & Electronics E-Commerce)  
**Currency:** Bangladeshi Taka (BDT ৳ / poisha)  
**Timezone Standard:** Asia/Dhaka (UTC+6)  
**Status:** Phase 1 Complete — Pending User Review & Approval  

---

## 1. Executive Summary

A comprehensive, read-only architectural and functional audit of the SkyzoneBD Admin Panel was executed across **40+ admin frontend views**, **45+ administrative API endpoints**, **40 Prisma schema models**, and **98 test suites (746 automated tests)**.

SkyzoneBD possesses strong foundations in wholesale business logic (wholesale tier pricing, carton quantity rules, multi-partner profit-sharing, partner payout workflows, and RFQ quoting). However, the current admin ecosystem suffers from:
1. **Critical UI routing & nesting leaks** where customer storefront headers and footers render inside the admin console layout.
2. **Severe financial calculation & reconciliation discrepancies** in dashboard and analytics endpoints (e.g. summing cancelled/pending orders into revenue, hardcoding period metrics, and executing floating-point aggregations on raw JavaScript arrays instead of database-level atomic operations).
3. **Orphaned modules and placeholder pages** (`/admin/banners` and `/admin/notifications` are non-functional stubs; `/admin/manual-sales` is completely omitted from sidebar navigation).
4. **Performance bottlenecks** caused by loading unpaginated datasets into server memory (e.g., pulling every order in company history into Node.js memory on every dashboard visit).
5. **Absence of granular Role-Based Access Control (RBAC)** enforcement at the API level despite existing database tables.

---

## 2. Module-by-Module Test Matrix

| # | Module | Route(s) | Status | CRUD | Validation | Search / Filter / Paging | Bulk Actions | Import / Export | API RBAC | Empty / Error States | Performance |
|---|--------|----------|--------|------|------------|--------------------------|--------------|-----------------|----------|----------------------|-------------|
| 1 | **Overview / Dashboard** | `/admin`, `/api/admin/stats` | **Fail** | R only | N/A | Partial (date presets) | N/A | N/A | Pass (Admin) | Pass | **Critical** (Loads entire DB order table in RAM) |
| 2 | **Analytics & Visualizations** | `/admin/analytics`, `/api/admin/analytics` | **Fail** | R only | N/A | Fail (Dummy metrics) | N/A | N/A | Pass (Admin) | Fail (Stub SVG text) | Moderate |
| 3 | **Products & Tier Pricing** | `/admin/products`, `/admin/products/*`, `/api/products` | **Partial** | C, R, U, D | Pass | Partial (Client search) | Partial | Missing (No CSV) | Pass | Pass | Moderate |
| 4 | **Categories** | `/admin/categories`, `/api/categories` | **Pass** | C, R, U, D | Pass | Pass | Partial | N/A | Pass | Pass | Fast |
| 5 | **Units (Measurement)** | `/admin/units`, `/api/units` | **Pass** | C, R, U, D | Pass | Pass | N/A | N/A | Pass | Pass | Fast |
| 6 | **Orders Management** | `/admin/orders`, `/admin/orders/[id]`, `/api/orders` | **Critical Fail** | C, R, U | Pass | Partial (Client-side page) | Missing | Partial (Print receipt) | Pass | Partial | **Slow** (Fetches all orders unpaginated) |
| 7 | **Order Manual Creation** | `/admin/orders/create` | **Fail** | C | Pass | N/A | N/A | N/A | Pass | Partial | Nested storefront header bug |
| 8 | **Manual Sales (Phone/WhatsApp)** | `/admin/manual-sales/*`, `/api/admin/manual-sales` | **Partial** | C, R, U | Pass | Pass | Missing | Partial | Pass | Pass | Orphaned (Not in sidebar) |
| 9 | **Coupons & Discounts** | `/admin/coupons`, `/api/admin/coupons` | **Pass** | C, R, U, D | Pass | Pass | Missing | N/A | Pass | Pass | Fast |
| 10 | **Returns & Refunds (RMA)** | `/admin/returns/*`, `/api/admin/returns/*` | **Pass** | C, R, U | Pass | Pass | Missing | N/A | Pass | Pass | Fast |
| 11 | **Inventory & Adjustments** | `/admin/inventory`, `/api/admin/inventory` | **Pass** | R, U | Pass | Pass | Partial | Export CSV | Pass | Pass | Fast |
| 12 | **Purchase Orders (PO)** | `/admin/purchase-orders/*`, `/api/admin/purchase-orders` | **Pass** | C, R, U | Pass | Pass | Missing | Print PDF/HTML | Pass | Pass | Fast |
| 13 | **Suppliers** | `/admin/suppliers`, `/api/admin/suppliers` | **Pass** | C, R, U, D | Pass | Pass | Missing | N/A | Pass | Pass | Fast |
| 14 | **Customers & B2B Verification** | `/admin/users`, `/admin/verification`, `/api/admin/users` | **Partial** | R, U | Pass | Pass | Missing | Missing | Pass | Pass | Moderate |
| 15 | **RFQ Management** | `/admin/rfq`, `/api/rfq/*` | **Partial** | R, U | Pass | Pass | Missing | Missing | Pass | Pass | Fast (No 1-click convert to order) |
| 16 | **Financials & Profit Dashboard** | `/admin/profit-dashboard`, `/profit-loss`, `/profit-reports` | **Partial** | R | Pass | Pass | N/A | Partial | Pass | Pass | Inconsistent period reconciliation |
| 17 | **Invoices & Receivables** | `/admin/invoices`, `/admin/accounts-receivable` | **Pass** | R, U | Pass | Pass | Missing | PDF/Print | Pass | Pass | Fast |
| 18 | **Partner Payouts & Reserves** | `/admin/payouts`, `/api/admin/payouts` | **Pass** | C, R, U | Pass | Pass | Missing | N/A | Pass | Pass | Fast |
| 19 | **Shipping & Delivery Charges** | `/admin/shipping`, `/api/admin/settings` | **Partial** | R, U | Pass | N/A | N/A | N/A | Pass | Pass | Flat rate only; no weight/tier |
| 20 | **Payment Configuration** | `/admin/payments`, `/admin/payment-settings` | **Fail** | R, U | Pass | N/A | N/A | N/A | Pass | Pass | Duplicate conflicting pages |
| 21 | **Content: Banners** | `/admin/banners` | **Missing** | Missing | N/A | N/A | N/A | N/A | N/A | Fail | 35-line "Coming Soon" stub |
| 22 | **Content: Hero Slides** | `/admin/hero-slides`, `/api/admin/hero-slides` | **Pass** | C, R, U, D | Pass | Pass | Missing | N/A | Pass | Pass | Fast |
| 23 | **Notifications Center** | `/admin/notifications` | **Missing** | Missing | N/A | N/A | N/A | N/A | N/A | Fail | 26-line "Coming Soon" stub |
| 24 | **Activity Logs** | `/admin/activity-logs`, `/api/admin/activity-logs` | **Pass** | R | N/A | Pass | Missing | Export CSV | Pass | Pass | Fast |
| 25 | **Staff Roles & Permissions** | `/api/admin/staff`, `middleware/permissionMiddleware` | **Partial** | C, R, U | Pass | Pass | Missing | N/A | Partial | Pass | RBAC middleware not wired to API |

---

## 3. High-Impact Defect Catalog

### Category A: Critical Severity (Broke UI / Wrong Financials / OOM Vulnerability)

#### DEFECT-01: Admin Order Detail Re-Exports Customer Storefront Page With Header & Footer
- **File:** `src/app/admin/orders/[id]/page.tsx`
- **Line:** `export { default } from '@/app/orders/[id]/page';`
- **Impact:** When an administrator opens an order at `/admin/orders/cm123...`, the view renders inside the Admin Sidebar/Topbar shell, but simultaneously injects the consumer storefront navbar (with category menus, cart drawer icon, home search bar) and consumer footer at the bottom. Administrator controls (mark paid, courier dispatch, fulfill) are completely absent.
- **Reproduction:** Navigate to `/admin/orders`, click any order row. Observe dual search bars and consumer footer inside the administrative panel.

#### DEFECT-02: Admin Order Create View Injects Storefront Header
- **File:** `src/app/admin/orders/create/page.tsx`
- **Line 9:** `import Header from '@/components/Header';`
- **Line 245:** `<Header />` inside the admin wrapper.
- **Impact:** Nested double headers clutter the screen, confusing administrative navigation.

#### DEFECT-03: Dashboard Memory Leak & Total Order Table Fetch
- **File:** `src/app/api/admin/stats/route.ts`
- **Lines 15–20:** `const orders = await prisma.order.findMany({ select: { total: true, status: true, createdAt: true } });`
- **Impact:** As order volume scales to tens of thousands of B2B transactions, this unpaginated, unbounded query will cause high Node.js memory consumption and database IOPS spikes, ultimately crashing the Vercel serverless function or container with Out Of Memory (OOM).
- **Required Fix:** Use atomic Prisma aggregations (`prisma.order.aggregate({ _sum: { total: true }, _count: true, where: { status: { in: [...] } } })`).

#### DEFECT-04: Gross Revenue Counts Cancelled & Refunded Orders
- **File:** `src/app/api/admin/stats/route.ts`
- **Lines 22–24:** `const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);`
- **Impact:** Every cancelled order, rejected fake order, or refunded order is added directly to `totalRevenue`. The dashboard displays an artificially inflated gross revenue figure.
- **Required Fix:** Filter exclusively by realized statuses: `DELIVERED`, `SHIPPED`, `PROCESSING`, `CONFIRMED`, `PAID`. Exclude `CANCELLED`, `RETURNED`, `REFUNDED`, and pending abandoned transactions.

---

### Category B: High Severity (Orphaned Features / Broken UX)

#### DEFECT-05: Manual Sales Module Is Completely Missing from Admin Navigation
- **Files:** `src/app/admin/manual-sales/*`, `src/app/admin/layout.tsx`
- **Impact:** SkyzoneBD has an entire module built for logging wholesale orders taken over Phone, WhatsApp, and Walk-in counters (`/admin/manual-sales`), but `src/app/admin/layout.tsx` does NOT include a link for it in the sidebar. Staff cannot discover or navigate to this feature without typing the URL manually.

#### DEFECT-06: Disconnected & Hardcoded Analytics Cards
- **File:** `src/app/admin/analytics/page.tsx`
- **Lines 140–160:**
  ```tsx
  <div>Today: ৳{(result.overview?.gmv || 0).toLocaleString()}</div>
  <div>This Week: ৳{(result.overview?.gmv || 0).toLocaleString()}</div>
  <div>This Month: ৳{(result.overview?.gmv || 0).toLocaleString()}</div>
  <div>This Year: ৳{(result.overview?.gmv || 0).toLocaleString()}</div>
  ```
- **Impact:** Today, This Week, This Month, and This Year cards all display the exact same number (`gmv` all-time).

#### DEFECT-07: Chart Visualizations Missing (Empty Placeholder SVGs)
- **File:** `src/app/admin/analytics/page.tsx`
- **Lines 280–310:** Renders a grey SVG rectangle with the text: *"Chart visualization available with chart library"*.
- **Impact:** No charting library (`recharts`, `echarts`, or `chart.js`) is installed in `package.json`. No time-series trends can be visualized.

#### DEFECT-08: Dual Payment Settings Pages & Navigation Confusion
- **Files:**
  - `src/app/admin/payments/page.tsx` (Contains static/mock on/off toggles with no gateway keys).
  - `src/app/admin/payment-settings/page.tsx` (Contains live database configuration for bKash, Nagad, Rocket, Upay, Bank transfers).
  - `src/app/admin/layout.tsx` lines 145–150 links to `/admin/payments` instead of `/admin/payment-settings`.
- **Impact:** Admins toggle methods on `/admin/payments` and wonder why checkout configurations did not update.

#### DEFECT-09: Non-Functional Placeholder Stubs for Banners & Notifications
- **File:** `src/app/admin/banners/page.tsx` (35 lines: *"Banner Management Coming Soon"*).
- **File:** `src/app/admin/notifications/page.tsx` (26 lines: *"Notifications Coming Soon"*).
- **Impact:** Staff attempting to change promotional banners or review admin alerts hit dead-end pages.

---

### Category C: Medium Severity (Timezone / Client-Side Sorting / Math Precision)

#### DEFECT-10: Timezone Inconsistencies (Server UTC vs Asia/Dhaka UTC+6)
- **Files:** `src/app/api/admin/stats/route.ts`, `src/app/api/admin/profit-dashboard/route.ts`
- **Code:** Uses `new Date().setHours(0,0,0,0)` on UTC server clocks.
- **Impact:** Bangladesh is UTC+6. Orders placed between 12:00 AM and 06:00 AM BST are credited to the previous calendar day in daily revenue reports.
- **Required Fix:** Enforce `date-fns-tz` or atomic ISO string conversion pinned to `Asia/Dhaka`.

#### DEFECT-11: Client-Side Orders Pagination
- **File:** `src/app/admin/orders/page.tsx`, `src/app/api/orders/route.ts`
- **Impact:** `/api/orders` fetches all orders in one JSON array. Client-side JavaScript paginates and filters. As order volume increases, initial page load degrades.
- **Required Fix:** Server-side pagination (`skip`, `take`, `where: { status, search }`, `totalCount`).

#### DEFECT-12: Unlinked RFQ-to-Order Conversion
- **File:** `src/app/admin/rfq/page.tsx`, `src/app/api/rfq/[id]/route.ts`
- **Impact:** Admins can accept and quote RFQs, but there is no 1-click button to generate a validated B2B Order or Invoice with the negotiated tiered pricing.

#### DEFECT-13: Regex String Scraping in Reports Page
- **File:** `src/app/admin/reports/page.tsx`
- **Code:** Extracts numeric metrics by regex-stripping currency symbols from formatted strings (`.replace(/[^0-9]/g, '')`).
- **Impact:** Fragile code susceptible to breaking if number formatting changes.

---

### Category D: Low Severity (Polish & Ergonomics)

#### DEFECT-14: Lack of Command Palette (Ctrl+K)
- No global search to instantly find orders, products, customers, or settings.

#### DEFECT-15: Missing Dark-First Futuristic Design System
- Standard Tailwind white cards; lacks dark-mode toggle, glassmorphism, or modern aesthetic matching SkyzoneBD's high-tech electrical brand identity.

---

## 4. Calculation & Financial Reconciliation Audit

### 4.1 Precision Standard
- **Current State:** The database uses `Float` for price, discount, cost, and totals across `Order`, `OrderItem`, and `Product`. JavaScript math is performed using standard floating-point numbers (`order.total * 0.15`), introducing potential IEEE-754 rounding errors.
- **Target Standard:** Server-side calculation engine operating on **integer poisha** (1 BDT = 100 poisha) or `Prisma.Decimal` with round-half-up rules.

### 4.2 Reconciliation Equations Required
1. **Order Total Equation:**
   $$\text{Grand Total} = \sum (\text{Item Price} \times \text{Qty}) - \text{Coupon Discount} + \text{Delivery Charge} + \text{Packaging Fee} + \text{VAT}$$
2. **Gross Margin & Net Profit Equation:**
   $$\text{Gross Profit} = \text{Revenue (Realized)} - \sum (\text{COGS}) - \text{Discounts}$$
   $$\text{Net Profit} = \text{Gross Profit} - \text{Operating Expenses} - \text{Packaging/Courier Loss}$$
3. **Profit Sharing Distribution Equation:**
   $$\text{Distributable Profit} = \text{Net Profit} \times (1 - \text{Reserve Ratio})$$
   $$\sum (\text{Partner Payout Shares}) + \text{Company Reserve} = \text{Net Profit}$$
4. **Inventory Valuation Reconciliation:**
   $$\text{Total Asset Value} = \sum (\text{Available Stock} \times \text{Unit Cost Price})$$

---

## 5. Prioritized Fix List (Phase 1 Output)

| Priority | Defect / Task | Affected Files | Expected Outcome |
|----------|---------------|----------------|------------------|
| **P0 - Critical** | Fix Admin Order Detail View | `src/app/admin/orders/[id]/page.tsx` | Dedicated admin order management interface without storefront header/footer. |
| **P0 - Critical** | Fix Admin Order Create View | `src/app/admin/orders/create/page.tsx` | Clean admin order creation form without storefront header. |
| **P0 - Critical** | Database-Level Aggregations & Status Filters | `src/app/api/admin/stats/route.ts` | Exclude cancelled/refunded orders; use Prisma aggregations to prevent OOM. |
| **P1 - High** | Restore Manual Sales Navigation | `src/app/admin/layout.tsx` | Add link for `/admin/manual-sales` in sidebar under Orders section. |
| **P1 - High** | Fix Navigation Link for Payment Settings | `src/app/admin/layout.tsx` | Point sidebar directly to `/admin/payment-settings`. |
| **P1 - High** | Replace Dummy Analytics Metrics | `src/app/admin/analytics/page.tsx` | Connect period cards (Today, Week, Month, Year) to real date-bounded queries. |
| **P1 - High** | Implement Banners & Notifications Stubs | `src/app/admin/banners/*`, `notifications/*` | Working banner manager and alert notification center. |
| **P2 - Medium** | Standardize Calculation Service & Poisha Math | `src/lib/calculations.ts` | Single source of truth for pricing, VAT, delivery, and profit math. |
| **P2 - Medium** | Asia/Dhaka Timezone Boundary Enforcement | All financial & stats API routes | Exact 12:00 AM BST day boundaries across all metrics. |
| **P2 - Medium** | Server-Side Order Pagination | `src/app/api/orders/route.ts`, `/admin/orders/page.tsx` | Sub-200ms page load regardless of total order count. |
| **P3 - Low** | Command Palette & Modern Dark-First Design | Phase 5 Execution | Premium futuristic design system, Lucide icons, glassmorphism, Recharts. |

---

## 6. Checkpoint & Next Steps

Audit Phase 1 is **COMPLETE**. No production code has been modified during this phase.

To proceed with:
- **Phase 2:** Central Calculation Engine & Reconciliation Verification (integer poisha, Asia/Dhaka timezone, automated reconciliation script)
- **Phase 3:** Flexible Settings Architecture
- **Phase 4:** Wholesale Feature Gap Implementation
- **Phase 5 & 6:** Premium Futuristic Theme & Analytics Dashboard

Please approve these findings and authorize the start of Phase 2.


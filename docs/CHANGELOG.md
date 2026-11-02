# Changelog — SkyzoneBD Wholesale Platform

All notable changes to the SkyzoneBD wholesale platform architecture, pricing calculations, profit sharing, and redesign are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Phase 5] - 2026-11-03

### Added
- **Design System & Component Tokens (`docs/design-system.md`)**:
  - Full B2B wholesale design token specification for the Bangladesh electrical hardware market.
  - Deep Navy primary palette (`#0B192C`, `#1E3E62`, `#1D4ED8`), Vivid Emerald profit accents (`#059669`, `#10B981`), Radiant Amber bulk highlights (`#D97706`, `#F59E0B`), and clean neutral Slate scale.
  - Standardized wholesale typography, micro-interactions, responsive breakpoints (360px to 1920px), and WCAG 2.1 AA accessibility guidelines.
- **Interactive Wholesale Tier Pricing Matrix (`src/components/wholesale/TierPricingTable.tsx`)**:
  - Reusable volume pricing table with live quantity tracking, interactive tier selection, automated savings calculation, and active tier highlights.
  - Embedded directly into Product Detail Page (`src/app/products/[id]/page.tsx`).
- **Storefront & Admin Aesthetic Redesign**:
  - **Product Card (`src/app/components/ProductCard.tsx`)**: Upgraded to clean modern card structure with emerald live-stock indicator, amber bulk pricing tag (`Bulk from ৳XX`), MOQ pill, and interactive quantity stepper.
  - **Product Detail Page (`src/app/products/[id]/page.tsx`)**: Added `TierPricingTable` and wholesale `RFQButton` for direct bulk inquiries.
  - **Homepage (`src/app/page.tsx`)**: Re-engineered fallback hero banner with factory-direct electrical hardware positioning, and redesigned Trust Bar with Bangladesh B2B credentials (TIN & Trade License verified, dynamic volume tiers, NBR compliant tax invoicing, nationwide courier dispatch).
  - **Admin Panel Polish (`src/app/admin/page.tsx`, `src/app/admin/layout.tsx`, `src/app/admin/components/AdminIcons.tsx`)**: Added custom coupon SVG icon to navigation and quick actions, modernized executive banner to deep navy slate theme, and added direct shortcut buttons to Coupons and Settings.

---

## [Phase 4] - 2026-11-03

### Added
- **Centralized Site Settings & Schema (`src/lib/siteSettings.ts`)**:
  - Expanded `SiteSettings` with complete dynamic configurations: General Store Branding, Delivery Zones & Courier Rules, VAT & Tax Policy, Extra Charges & Gateway Fees, Order Rules & Minimums, Profit Sharing Policy, System Controls, and Homepage Carousel.
  - Database-backed storage via `PlatformConfig` with in-memory caching and immediate invalidation on write (`invalidateSettingsCache`).
  - Dynamic coupon storage engine (`readCoupons`, `writeCoupons`, `incrementCouponUsage`) persisted safely in `PlatformConfig`.
- **Public & Admin Configuration APIs**:
  - `GET /api/config`: Exposes safe, active business settings (delivery zones, VAT policy, minimum order amount, free delivery thresholds, allowed payment methods) to storefront visitors.
  - `GET / PUT /api/admin/settings`: Full settings read and update endpoint for admins with audit activity logging.
  - `GET / POST / PUT / DELETE /api/admin/coupons`: Complete administrative CRUD API for promotional coupons and vouchers.
  - `POST /api/coupons/validate`: Client coupon validation endpoint for cart and checkout previews.
- **Dynamic Order Processing (`src/app/api/orders/route.ts`)**:
  - Removed hardcoded `process.env.SHIPPING_CHARGE` and `process.env.TAX_RATE`.
  - Wired dynamic delivery zone selection (`deliveryZoneId`) with zone charges and free delivery threshold enforcement.
  - Wired dynamic coupon validation and application with atomic usage incrementation on order creation.
  - Wired dynamic extra charges (COD fee, packaging fee) and dynamic VAT calculation (exclusive and inclusive modes).
  - Enforced dynamic minimum order amount validation.
- **Storefront Checkout & Cart Enhancements**:
  - **Checkout Page (`src/app/checkout/page.tsx`)**: Added Delivery Zone selector, Coupon Code input with real-time validation, transparent itemized financial breakdown (Subtotal, Coupon Discount, Delivery Charge, VAT, Grand Total), and minimum order amount enforcement.
  - **Cart Page (`src/app/cart/page.tsx`)**: Added Free Delivery Goal progress bar and minimum order threshold check.
- **Admin Panel UI**:
  - **Admin Settings Page (`src/app/admin/settings/page.tsx`)**: Comprehensive tabbed settings manager covering Store Info, Delivery Zones, Tax & VAT, Charges & Fees, Profit Sharing, Order Rules, Carousel, and System DB migrations.
  - **Admin Coupons Page (`src/app/admin/coupons/page.tsx`)**: Full coupon dashboard with KPIs, coupon table, active toggle, and creation modal.
  - **Admin Navigation (`src/app/admin/layout.tsx`)**: Added Coupons link to Admin navigation.

---

## [Phase 3] - 2026-11-03

### Added
- **Profit Sharing & Distribution Engine (`src/services/profitSharingService.ts`)**:
  - Implemented percentage-based profit sharing using integer poisha math.
  - Strict 100.00% validation on active stakeholder share rules with unassigned / over-assigned detection.
  - Largest Remainder Method distribution ensuring exact poisha balancing with zero leakage.
  - Retained earnings reserve percentage deduction.
  - Loss carry-forward tracking across accounting periods with automatic offset in profitable periods.
  - Stakeholder statement generator with complete financial transparency (gross profit, returns, delivery, gateway fees, operational expenses, net profit, reserve, distributable, share %).
- **Profit Sharing Test Suite (`__tests__/services/profitSharingService.test.ts`)**:
  - 10 automated unit and integration tests covering equal split, unequal split, 100% validation rejection, negative percentages, loss carry-forward, prior loss offset, reserve deduction, and statement generation.
  - Enforced strict invariant: `sum(shares) + reserve === netProfitAfterLossOffset` to the exact poisha across all tests.

---

## [Phase 2] - 2026-11-03

### Added
- **Central Calculation Service (`src/services/calculationService.ts`)**:
  - Pure integer poisha money handling (`1 BDT = 100 poisha`).
  - Documented Round Half Up rule for fractional poisha.
  - Largest Remainder Method (Hare-Niemeyer) for proportional discount and remainder allocation with zero leakage.
  - Wholesale volume tier price resolution with boundary validation (boundary checks at 49, 50, 199, 200).
  - Minimum Order Quantity (MOQ) and carton pack size (step) validation.
  - Coupon evaluation engine supporting `PERCENTAGE` (with max cap), `FIXED_AMOUNT`, and `FREE_DELIVERY`.
  - Comprehensive coupon validation (dates, total usage limits, per-customer limits, minimum order amounts, product/category whitelists/blacklists, first-order restriction).
  - Proportional allocation of order-level coupon discounts to line items using largest-remainder poisha balancing.
  - VAT calculation supporting both exclusive (added at checkout) and inclusive (contained in price) modes.
  - Zone-based delivery calculation with free delivery threshold waiver.
  - Extra charges calculation (COD fee, packaging fee, payment gateway fee, custom fees).
  - Grand total calculation and order profit/gross margin reporting.
- **Formulas Specification (`docs/calculations.md`)**:
  - Plain language documentation of the order of operations, tier rules, coupon scenarios, tax modes, and profit formulas for staff and auditors.
- **Automated Test Suite (`__tests__/services/calculationService.test.ts`)**:
  - 18 comprehensive unit and integration tests covering all mandatory Phase 2 scenarios, including boundary tests, coupon failures, VAT modes, large orders, and client price tampering rejection.

---

## [Phase 1] - 2026-11-02

### Added
- **Comprehensive Audit Report (`docs/01-audit-report.md`)**:
  - Detailed discovery and analysis of tech stack, project structure, data models, feature inventory, hardcoded values, calculation map, existing profit-sharing logic, risks, and UI/UX quality bar.
  - Prioritized problem list (Critical, High, Medium, Low).


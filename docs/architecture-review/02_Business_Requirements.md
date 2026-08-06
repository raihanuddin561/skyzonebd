# 02 — Business Requirements (Reverse-Engineered)

All requirements below are reverse-engineered from current source code (schema, pricing engine, order flow, permission tables) and cross-checked against the documentation corpus. Where a requirement is only asserted in documentation and not enforced in code, it is explicitly marked **[DOCUMENTED, NOT ENFORCED]**. Where the analysis could not determine intent, it is marked **[ASSUMPTION]** or **[UNKNOWN — requires stakeholder input]**. Nothing here is invented business logic beyond what code or docs actually state.

## 1. Business problem

SkyZoneBD digitizes a wholesale distribution business: it lets business buyers discover a catalog of goods, receive volume-based pricing, place bulk orders (online or entered manually on their behalf by staff), and lets the operating business track inventory, cost of goods, profit, payroll, and profit-sharing payouts to business partners/co-owners in one system, replacing what would otherwise be spreadsheets and manual bookkeeping.

## 2. Core business model — resolved contradiction

**Current, code-verified state: wholesale (B2B) only.** `prisma/schema.prisma`'s `Product` model contains only `basePrice` (cost), `wholesalePrice` (sell price), and `moq` (minimum order quantity) — no retail/consumer price field exists. `src/utils/pricing.ts` and `src/utils/pricingEngine.ts` are explicitly banner-commented `WHOLESALE ONLY — No retail pricing` and contain no retail/B2C branch. The `src/utils/wholesalePricing.ts` module is a deprecated re-export shim pointing at the consolidated wholesale-only module.

**History, reconstructed from migrations and docs:**
1. At initial schema (`20251022191212_init`), `Product` genuinely had a **dual retail+wholesale** design (`retailPrice`, `salePrice`, `retailMOQ`, `comparePrice`, `wholesaleEnabled`, `wholesaleMOQ`, plus generic `price`/`wholesalePrice`/`minOrderQuantity` — nine pricing-adjacent columns).
2. Migration `20260103175348_migrate_product_pricing_schema` explicitly dropped every retail-facing column and consolidated to `basePrice`/`wholesalePrice`/`moq`. Documentation from this date (`WHOLESALE_ONLY_IMPLEMENTATION.md`) describes this as "all B2C functionality disabled."
3. A later document (`RETAIL_PRICING_TOGGLE.md`, 2026-01-07) partially walks this back for a *different, earlier* change — clarifying that some retail *UI* toggles were feature-flagged off in the frontend without removing the (then-still-present) schema fields — but this document predates and is superseded by the 2026-01-03 schema migration's actual column drops.
4. `README.md` (unrevised) still describes the product as "B2B & B2C" and the `ARCHITECTURE_DIAGRAM.md` still diagrams a full retail customer journey. Both are stale as of the current schema.

**Conclusion for planning purposes: treat this as a wholesale-only B2B platform.** Any retail/B2C references remaining in the frontend, copy, or documentation should be treated as latent inconsistency to clean up, not as a currently-supported second channel.

## 3. Primary users & roles

Verified from `src/types/roles.ts` (`UserRole` enum) and `UserType` enum in the Prisma schema — **these are two separate, overlapping classification axes, not one**:

**`UserRole`** (access-level hierarchy, `ROLE_HIERARCHY` values in parentheses): `SUPER_ADMIN` (5) → `ADMIN` (4) → `PARTNER` (3) → `MANAGER`/`SELLER` (2, tied) → `BUYER` (1) → `GUEST` (0).

**`UserType`** (customer/account segment, mostly vestigial post-wholesale-only pivot): `RETAIL`, `WHOLESALE` (schema default), `SELLER`, `ADMIN`, `GUEST`.

Human-facing roles this implies:
- **Buyer / wholesale customer** — the primary external user. Registers, optionally submits business-verification documents, browses the catalog, places orders, submits RFQs, leaves reviews on delivered orders, can request GDPR-style account/data deletion.
- **Guest buyer** — can complete checkout without an account (name + phone required; email/company optional), per the guest-order fields on `Order` (`guestName`, `guestPhone`, `guestEmail`) and the explicit guest branch in the order-creation API.
- **Seller / Partner (product-supplier side)** — `Product.sellerId` links a product to a `User`; sellers earn a `sellerCommissionPercentage`. Distinct and disconnected from...
- **Partner (profit-sharing co-owner)** — the standalone `Partner` model (not linked to `User` at all), with a `profitSharePercentage` and periodic `ProfitDistribution` payouts. **Three separate, uncoordinated representations of "who shares in profit" exist simultaneously** — `User.isProfitPartner`/`profitSharePercentage`, `Product.sellerId`/`sellerCommissionPercentage`, and the standalone `Partner` model. This is flagged as a domain-modeling gap in `05_Domain_Model.md` and `10_Gap_Analysis.md`, not resolved here — **[UNKNOWN — requires stakeholder input]** on whether these are meant to be the same business relationship or genuinely three different ones (e.g., product-supplier vs. company-equity-holder vs. legacy field).
- **Admin** — full operational control (products, orders, users, financials, permissions).
- **Super Admin** — everything Admin can do, plus role assignment, permission-hierarchy overrides (e.g., allowing total partner profit-share to exceed 100%), and access to a dedicated super-admin dashboard.
- **Manager** — a role tier that exists in the hierarchy and permission map but has no dedicated UI/workflow found distinct from Admin — **[ASSUMPTION]** this is intended as a scoped-down admin (e.g., store manager), not yet built out.
- **Employee** (HR/payroll) — a fully separate `Employee` model with no relation to `User` at all. An admin who is also on payroll has two disconnected identity records. **[GAP]**

There is also a 30+ value granular `PermissionModule` system (`UserPermission` table) layered on top of `UserRole`, intended to let specific users be granted per-module view/create/edit/delete/approve/export rights independent of their base role — see `05_Domain_Model.md` and `08_Security_Assessment.md` for how (in)consistently this is actually enforced.

## 4. Core business workflows

### 4.1 Customer/buyer journey
1. Discover catalog (public, unauthenticated) → view product with wholesale tiered pricing and MOQ.
2. Register (name/email/password required; phone/company optional per the actual route — this **contradicts** the zod schema in `src/lib/validation.ts`, which the route doesn't even use) or continue as guest.
3. Optionally submit business verification (`BusinessInfo`: company registration, tax ID, trade license/tax-certificate document URLs) → `PENDING` → admin reviews → `APPROVED`/`REJECTED`/`RESUBMIT`.
4. Add to cart (client-side only, `localStorage`, no server-side MOQ/stock check at this stage — see `05_Domain_Model.md` for why this is a UX gap, not a security hole, since checkout re-derives everything server-side).
5. Optionally submit an RFQ instead of/alongside a cart order, for negotiated pricing on larger orders.
6. Checkout: select/enter shipping+billing address, choose a manual payment method (bank transfer, bKash/Nagad/Rocket, invoice NET30/60/90 for approved B2B accounts, or COD-style), place order.
7. Server re-validates stock and re-computes price via the pricing engine (tier + any active customer-specific discount) — the client's submitted price is **not** trusted for the persisted order.
8. Order lifecycle: `PENDING → CONFIRMED → PROCESSING → PACKED → SHIPPED → IN_TRANSIT → DELIVERED` (or `CANCELLED`/`RETURNED`/`REFUNDED`). Admin manually verifies proof-of-payment for manual payment methods.
9. On delivery, customer may leave one review per (product, order) pair — moderated (`PENDING → APPROVED/HIDDEN/REJECTED`) before becoming public.
10. Customer may request account/data deletion (GDPR/Google-Play-policy-driven — see §4.5).

### 4.2 Order lifecycle & payment lifecycle
- **Order statuses** (`OrderStatus`, 10 values): `PENDING, CONFIRMED, PROCESSING, PACKED, SHIPPED, IN_TRANSIT, DELIVERED, CANCELLED, RETURNED, REFUNDED`.
- **Payment statuses** (`PaymentStatus`, 6 values): `PENDING, PENDING_VERIFICATION, PAID, PARTIAL, FAILED, REFUNDED`.
- **Payment methods** (`PaymentMethod` enum, 9 values): `BANK_TRANSFER, BKASH, NAGAD, ROCKET, CREDIT_CARD, INVOICE_NET30, INVOICE_NET60, INVOICE_NET90, LC` (Letter of Credit — a B2B international-trade instrument, confirming a serious wholesale/import-export orientation). **No live payment gateway integration exists** — `POST /api/payment` is an explicit mock (random success/failure, fabricated transaction IDs). Real payment collection today is entirely manual/offline (bank transfer confirmation, mobile-banking reference numbers), verified by an admin against submitted proof (`paymentProofUrl`, `paymentVerifiedAt/By`).
- **Return/refund workflow: [DOCUMENTED, NOT ENFORCED].** `OrderStatus` includes `RETURNED`/`REFUNDED` and `PaymentStatus` includes `REFUNDED`, and policy pages describe a 15–30 day return window, but no `Refund`/`Return` model, API, or admin workflow exists anywhere in the codebase. This is a real, user-facing gap, not just an internal one — see `10_Gap_Analysis.md` (Critical).

### 4.3 Sales & inventory flow
- Stock is decremented atomically inside the same DB transaction as order creation; restored (non-atomically — see `05_Domain_Model.md`) on cancellation.
- Three parallel mechanisms exist for "a sale happened," each with independent cost/profit snapshot fields: (1) online `Order`+`OrderItem`; (2) `Sale` (type `DIRECT` for admin-entered walk-in/offline sales, or `ORDER_BASED`, meant to be generated from a delivered `Order`); (3) `ManualSalesEntry`+`ManualSalesItem`, a second, independently-built offline-sale system with its own inventory-adjustment and ledger-posting logic. **[GAP]** — no single "Sale" domain concept unifies these; see `05_Domain_Model.md` §4 and `14_Technical_Debt.md`.
- A FIFO/WAC lot-based costing system (`StockLot`/`StockAllocation`) exists and is used for **stock replenishment records only** — the more accurate lot-based COGS calculation it enables (`src/services/orderFulfillmentService.ts`) is fully built and transactionally correct but is **never invoked by any route** (dead code); production profit figures instead use a simpler `product.costPerUnit || product.basePrice` snapshot at order time.
- Warehouse: a `Warehouse` model exists (multi-location fields, primary-warehouse flag) but has **no relation to any other model and no API/UI** — single-location operation is the de facto current requirement, multi-warehouse is unimplemented aspiration.

### 4.4 Vendor/partner/profit-sharing flow
- Partners (business co-owners, standalone `Partner` model) have a configured `profitSharePercentage`; total across all active partners is validated to not exceed 100% unless a `SUPER_ADMIN` explicitly overrides it.
- Profit distribution is computed over an admin-chosen date range from `Sale` records minus `OperationalCost` for the same window, split proportionally across partners, and created as `PENDING` `ProfitDistribution` rows requiring separate admin approval (`APPROVED`) and payout (`PAID`) actions.
- This is **manually triggered** (`POST /api/admin/profits` with `action=distribute`), not scheduled — despite the data model supporting `DAILY/WEEKLY/MONTHLY/YEARLY` cadences, no cron/scheduled job invokes it. **[GAP]**
- Sellers (product-supplying side, `Product.sellerId`) earn a per-product `sellerCommissionPercentage` on top of the platform's `platformProfitPercentage` (schema default 15%) — computed at order-delivery time in the (single, live) `autoGenerateProfitReport` flow.

### 4.5 Compliance / data-deletion flow
- A formal, well-built `DataDeletionRequest` workflow exists: user submits (with confirmation email match) → `PENDING` → admin reviews → `PROCESSING`/`REJECTED` → (if approved) `execute` endpoint anonymizes the user record (name/email → `deleted_{id}@anonymous.local`-style placeholders, password → sentinel), retains `Order`/`ActivityLog` records for legal/financial record-keeping, deletes `Address`/`BusinessInfo`, and writes a `DataDeletionAuditLog` entry at every transition. This exists specifically to satisfy **Google Play Store data-safety policy** requirements per internal docs — implying an Android app (native or wrapped) is a real or planned distribution channel. In-memory rate limiting (3 requests/hour) protects the submission endpoint from abuse, though it resets on every serverless cold start.

## 5. Business rules confirmed by code and/or tests

- **MOQ**: order quantity below a product's configured `moq` is rejected (server-side, hard 400 on the order API); no fallback to per-unit pricing below MOQ.
- **Tiered pricing**: the highest `WholesaleTier` whose `[minQuantity, maxQuantity]` range contains the order quantity applies; ranges are validated non-overlapping and monotonically decreasing in price as quantity increases (test-enforced in `wholesaleValidation.test.ts`).
- **Customer discount stacking**: a per-customer flat `discountPercent` (with optional `discountValidUntil` expiry) is applied **after** tier pricing, multiplicatively on the tier-priced subtotal — not on the base price (test-confirmed in `pricingEngine.test.ts`).
- **Platform profit percentage**: defaults to 15% (`Product.platformProfitPercentage`, schema default), computed against gross margin at order-delivery time.
- **Self-role-change / self-deactivation prevention**: an admin cannot change their own role or deactivate their own account (enforced in the *correctly-built* `users/[id]/role` and `users/[id]/status` routes — though a separate, unauthenticated `users` route can achieve the same state changes with **no** such protection; see `08_Security_Assessment.md`).

## 6. Explicitly unresolved / requires stakeholder input

- ✅ **RESOLVED (ADR-008, 2026-07-18)** — ~~Whether "Partner" (profit-sharing co-owner), "Seller" (product supplier, `Product.sellerId`), and "Profit Partner" (`User.isProfitPartner`) are meant to converge into one business-relationship concept or genuinely represent three distinct relationships.~~ A domain investigation (seed data, a previously-unexamined business-context document, migration/git history, and every related schema concept) found: `User.isProfitPartner` was dead code (deleted); "Partner" and "Seller" are genuinely distinct, separately-evolved business relationships (net-company-profit-share vs. per-product commission), not one concept that fractured; and no third "external supplier" relationship exists in this system at all — inventory is modeled as platform-owned throughout. `Partner` gained an optional link to `User` so the same person can hold both roles without the two payment types ever merging. See `13_ADRs.md` ADR-008 for the full evidence trail.
- **[UNKNOWN]** The actual, authoritative tax rate and shipping-cost policy — the documentation corpus states 5%, 15%, and an unvalidated `TAX_RATE` env var with no documented default across three different documents; the live route silently defaults both to 0 if the env var is absent, with no warning.
- **[UNKNOWN]** Whether a real payment gateway integration (bKash/Nagad/SSLCommerz APIs) is planned/committed, given `POST /api/payment` is an explicit, acknowledged mock.
- **[UNKNOWN]** Whether returns/refunds, courier/shipping-carrier integration, and customer notifications (email/SMS) are near-term requirements or explicitly deferred — all three are policy-documented as customer-facing promises (return window, delivery tracking, order confirmations) but have zero backing implementation.
- **[UNKNOWN]** Whether an Android app is a real, currently-shipping distribution channel (the GDPR/data-deletion flow's stated purpose is Google Play policy compliance) or forward-looking preparation only.

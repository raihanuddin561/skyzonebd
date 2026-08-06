# 05 — Domain Model (DDD Analysis)

This is a descriptive DDD analysis of the *current* codebase — it identifies what patterns exist today (mostly implicitly, since the code was not built DDD-first), not a prescriptive target model. A prescriptive target is proposed separately in `11_Target_Architecture.md`.

## 1. Bounded contexts (inferred)

No bounded contexts are formally declared anywhere (no module boundaries enforce this), but the data model and code organization imply the following natural contexts, several of which overlap or leak into each other:

1. **Catalog** — Product, Category, Unit, WholesaleTier, HeroSlide
2. **Identity & Access** — User, BusinessInfo, Address, UserPermission
3. **Ordering** — Order, OrderItem, Payment
4. **Inventory** — InventoryLog, StockLot, StockAllocation
5. **Sales Recording** — Sale, ManualSalesEntry/ManualSalesItem (should logically be part of Ordering, but is architecturally separate — see §4)
6. **B2B Negotiation** — RFQ, RFQItem
7. **Financial Reporting** — ProfitReport, ProfitLossReport, FinancialLedger, OperationalCost, PlatformConfig
8. **Partner/Profit-Sharing** — Partner, ProfitDistribution
9. **HR/Payroll** — Employee, Salary, Attendance (fully isolated — no relation to Identity & Access context at all)
10. **Reviews** — Review (uniquely, cascade-owned by three different parent aggregates simultaneously: Product, User, and Order)
11. **Compliance** — DataDeletionRequest, DataDeletionAuditLog
12. **Content/CMS** — HeroSlide, PaymentConfig
13. **Audit** — ActivityLog

Context mapping between these is almost entirely implicit foreign keys with no anti-corruption layer, translation, or explicit contract — i.e., every context is directly, tightly coupled to every other context's schema. This is acceptable in a monolith at this scale but means any schema change in one context (e.g., renaming an `Order` field) has no insulation before it ripples into Financial Reporting, Sales Recording, and Partner contexts that all read `Order`/`OrderItem` fields directly.

## 2. Aggregates (as currently enforced by cascade/FK behavior)

An aggregate root, for this analysis, is inferred from which models are `onDelete: Cascade`-owned by which parent (i.e., cannot outlive their parent) versus which are independently addressable.

| Aggregate root | Owned members (cascade) | Notes |
|---|---|---|
| **User** | BusinessInfo (1:1), Address[], UserPermission[] | `Order`, `RFQ`, `Sale`, `Review`, `ActivityLog`, `DataDeletionRequest` reference `User` but are protected by `Restrict`/`SetNull`, not owned — correctly modeled as separate aggregates referencing an actor, not as part of the User aggregate. |
| **Product** | WholesaleTier[], StockLot[] (→ StockAllocation[] cascade from StockLot), InventoryLog[] | `OrderItem`, `RFQItem`, `Sale`, `Review`, `ManualSalesItem` reference Product via `Restrict`/`SetNull` — correctly independent. |
| **Order** | OrderItem[], Payment[], ProfitReport[] | `Sale`, `Review`, `FinancialLedger` optionally reference Order via `SetNull` — an Order can be deleted independently of them, confirming they are not part of this aggregate despite being conceptually close. |
| **RFQ** | RFQItem[] | Clean, self-contained. |
| **Employee** | Salary[], Attendance[] | Isolated HR bounded context; no path back to `User` even when the same human is also a platform admin. |
| **Partner** | ProfitDistribution[] | Optionally linked to `User` via `Partner.userId` (ADR-008, 2026-07-18) — the link is nullable/unenforced-population, so most `Partner` rows may still have no linked `User`. Remains disconnected from `Product.sellerId`; see §4. |
| **DataDeletionRequest** | DataDeletionAuditLog[] | Clean compliance aggregate. |
| **ManualSalesEntry** | ManualSalesItem[] | A parallel, lighter "order" — candidate for consolidation with Order (see §4). |
| **StockLot** | StockAllocation[] | `StockAllocation.orderId`/`orderItemId` are indexed but have **no enforced `@relation`** to Order/OrderItem — a leaky aggregate boundary; the link to the Order aggregate exists only by convention. |

**Reviews are an anomaly**: `Review` is simultaneously cascade-owned by three separate parents (`Product`, `User`, `Order`) via a composite unique constraint — it does not cleanly belong to a single aggregate root. This is defensible (a review is genuinely a fact about all three relationships at once) but should be treated as a domain event/fact record rather than force-fit into one aggregate.

## 3. Entities vs. value objects

Almost everything in the schema is modeled as an **entity** (has an `id`, is independently persisted and queried) — there are effectively **no value objects** in the Prisma sense. Concepts that are conceptually value objects but are implemented as free-standing entities or, worse, loose strings:
- **Money/Address** — `Order.shippingAddress`/`billingAddress` are plain strings, not a structured `Address` value object embedded on the order (even though a proper `Address` *entity* exists elsewhere, linked to `User`, not to `Order` — a guest order's address is unstructured free text with no reuse of the `Address` shape).
- **Price/Discount** — pricing calculations return well-structured objects in `pricingEngine.ts` (`PriceInfo`-shaped return values) but these are TypeScript-only in-memory shapes, never persisted as such — the persisted `OrderItem` flattens them back into loose float columns.
- **Period/DateRange** — `ProfitDistribution.periodType` is a free string (`DAILY`/`WEEKLY`/...) rather than a value object or even an enum, despite an enum (`SaleType`, similarly-shaped) existing elsewhere in the same schema for a near-identical concept.

## 4. The three unresolved "same concept, multiple models" problems (highest-priority target-model decisions)

These recur across `02`, `03`, `04`, and are consolidated here because they are fundamentally **domain-modeling** decisions, not implementation bugs:

1. **"A sale/order happened"**: `Order` (online), `Sale` (direct or order-derived), `ManualSalesEntry` (offline). None share a common supertype, interface, or event. A target domain model needs one `Sale`/`Transaction` concept with a `channel` (ONLINE/DIRECT/MANUAL) discriminator, or an explicit decision that these are genuinely different bounded contexts that should stay separate but be reconciled by a shared reporting projection.
2. **"Who shares in profit"** — ✅ **RESOLVED, ADR-008 (2026-07-18)**. `User.isProfitPartner`/`profitSharePercentage` were confirmed dead (zero real usage beyond a GDPR-anonymization reset) and deleted. `Partner` (net-company-profit-share, investor/co-owner) and `Product.sellerId`/`sellerCommissionPercentage` (per-product commission, a "who supplies this product" relationship) are **not the same concept** and remain separately modeled — a multi-source investigation (seed data, a previously-unexamined business-context doc, migration/git history, and every related domain concept in the schema) found they evolved as genuinely distinct features, not one design that fractured, and that SkyZoneBD's real inventory-ownership model has no third "external supplier" concept at all (only vestigial, unenforced free-text fields). `Partner` gained an optional, nullable `userId` FK to `User` so the same real person *can* hold both roles without the two payment computations ever merging. See `13_ADRs.md` ADR-008 for the full evidence trail.
3. **"Compute profit"**: four independent calculators (`profitCalculation.ts`, `comprehensiveProfitCalculation.ts`, `partnerProfitDistribution.ts`, `orderFulfillmentService.ts`) with different formulas and different revenue sources (`Order.total` vs. `Sale.totalAmount` vs. FIFO-lot COGS) that are not guaranteed to reconcile against each other. This is the single most consequential domain-modeling gap for a business that depends on this system for real profit/payout figures — see `10_Gap_Analysis.md` (Critical).

## 5. Domain services vs. application services (as currently split)

- **Genuine domain services** (pure or near-pure business logic, no HTTP/Prisma concerns baked in): `pricingEngine.ts`, `pricing.ts`, `wholesaleValidation.ts`, `stockCalculations.ts` — these are the codebase's best examples of proper domain-service isolation, and are correctly unit-tested in isolation.
- **Application services** (orchestrate domain logic + persistence + cross-cutting concerns): `services/inventoryService.ts`, `services/orderFulfillmentService.ts`, `services/paymentService.ts`, `services/dataService.ts` — well-shaped in principle, but see `03_Current_Architecture.md` §2 for the finding that the best of these (`orderFulfillmentService.ts`) is not actually invoked by any route.
- **Logic embedded directly in route handlers** (no service layer at all): the majority of `src/app/api/admin/*` — profit math, stock math, and discount math are computed inline in the HTTP handler in most admin routes, meaning the "service layer" for these operations is the route handler itself.

## 6. Repositories

No repository abstraction exists — every consumer calls the Prisma client directly (`prisma.order.findMany(...)`), with two different global Prisma client instances in circulation (`lib/db.ts`, `lib/prisma.ts`). This is a defensible choice at this scale (Prisma's query builder is already a reasonably good repository substitute), but it does mean there is no single seam at which to add cross-cutting concerns (soft-delete filtering, tenant scoping, query logging) without touching every call site.

## 7. Domain events / integration events

**None exist.** There is no event bus, no domain-event dispatch, no outbox pattern, nothing resembling `OrderDelivered`, `StockDepleted`, or `ProfitDistributionApproved` as a first-class concept. Side effects that conceptually *are* events (e.g., "when an order is delivered, generate a sale record and a profit report and post ledger entries") are instead implemented as sequential, hand-written imperative steps inside a single route handler — which is exactly why one of those steps (ledger posting) can silently fail without rolling back or even flagging the others (see `03_Current_Architecture.md` §4). Introducing even a lightweight internal event/hook mechanism (not necessarily a message queue) is one of the more valuable target-architecture moves available — see `11_Target_Architecture.md`.

## 8. Policies & specifications

The clearest examples of the Specification pattern in spirit (if not in named form) are `validateWholesalePricing`/`validateBasicPricing` (`wholesaleValidation.ts`) and `validateWholesaleOrder`/`validateCustomerDiscount` (`pricing.ts`/`pricingEngine.ts`) — pure predicate functions over a candidate object, well-tested, reused correctly. These are a template for how the rest of the domain's validation *should* look (see `08_Security_Assessment.md`'s finding that most other input validation is inline, ad hoc, and does not use the zod schemas that exist for this exact purpose).

## 9. Factories

No explicit factory pattern exists; entity construction is inline at each Prisma `create()` call site, which is one reason the same construction logic (e.g., cost/profit snapshot calculation at order-item creation) ends up copy-pasted rather than centralized.

## 10. Shared kernel

The closest thing to a shared kernel is `src/types/` (auth, cart, product, profile, profit, rfq, roles) and `src/lib/` (auth, db/prisma, validation, error-handler, permissions) — but as documented throughout, several of these "shared" modules are not actually used by the code that should share them (the zod schemas in `validation.ts`, the error classes in `error-handler.ts`, and the rate limiter in `rate-limiter.ts` are all defined once and then bypassed by hand-rolled equivalents at most call sites).

## 11. Anti-corruption layers

None are needed today (no external system integrations of consequence exist — payment and shipping are both unintegrated stubs), but this will become necessary the moment a real payment gateway (bKash/Nagad/SSLCommerz) or courier API (Pathao/RedX/Steadfast) is integrated — see `11_Target_Architecture.md` for where an ACL should be introduced ahead of that work, rather than let gateway-specific shapes leak into `Order`/`Payment` directly as has happened with the current mock.

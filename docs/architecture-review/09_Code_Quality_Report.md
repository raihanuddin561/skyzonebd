# 09 — Code Quality Report

## 1. SOLID

- **Single Responsibility**: violated most visibly by admin route handlers that mix HTTP concerns, validation, business math, and Prisma access in one function body (no service-layer delegation) — see `03_Current_Architecture.md` §2.
- **Open/Closed**: the pricing engine (`pricingEngine.ts`) is a good counter-example — extending pricing rules doesn't require modifying call sites. The four parallel profit calculators are the opposite — adding a new profit rule requires deciding which of four places to add it to, and there's no abstraction that would let you add it once.
- **Liskov/Interface Segregation**: not strongly applicable — there's minimal use of interfaces/abstract contracts in this codebase at all (see "Factories"/"Repositories" in `05_Domain_Model.md`).
- **Dependency Inversion**: routes depend directly on the Prisma client (two different singleton instances, no interface between them) rather than on an abstraction — acceptable at this scale, but it means the two dead-but-fully-built alternate implementations (`orderFulfillmentService.ts`, `salesGeneration.ts`'s auto-trigger) couldn't be swapped in without touching every call site that would need to start using them.

## 2. DRY — the codebase's central quality problem

This is not scattered code duplication; it's **structural, whole-subsystem duplication**, documented throughout this review and consolidated here:

| Duplicated concept | Instances | Where documented |
|---|---|---|
| Auth/authorization check | `lib/auth.ts` helpers, inline `verifyAdminToken`, per-file bespoke `verifyPartner()`, unauthenticated `checkPermission()` | `08_Security_Assessment.md` §3 |
| Profit calculation | `profitCalculation.ts`, `comprehensiveProfitCalculation.ts`, `partnerProfitDistribution.ts`, `orderFulfillmentService.ts` | `05_Domain_Model.md` §4 |
| "A sale happened" | `Order`, `Sale`, `ManualSalesEntry` | `05_Domain_Model.md` §4 |
| Order-based sale generation | `utils/salesGeneration.ts::autoGenerateSalesFromOrder` (dead) vs. inline logic in `admin/sales/generate/route.ts` (live) — near-verbatim copy-paste | `04_Module_Analysis.md` #19 |
| `findApplicableTier` | Defined once in `pricing.ts`, copy-pasted (not imported) a second time in `pricingEngine.ts`, with a comment falsely claiming it was imported | direct code read |
| Admin panel UI | `src/app/admin/*` and `src/app/dashboard/*` — a second, largely redundant admin surface with independent fetch logic per page | `03_Current_Architecture.md` §2, `04_Module_Analysis.md` #34 |
| "Get products/orders/users" fetch logic | Reimplemented 2–3× per resource across `admin/`, `dashboard/`, `customer/`, `partner/` pages instead of a shared hook | frontend agent findings |
| Prisma client singleton | `lib/db.ts` and `lib/prisma.ts` | `03_Current_Architecture.md` §3 |
| Password-change endpoint | `PATCH /api/user/profile` and `PUT /api/user/profile/password` — identical logic, one at a path its own comment says is wrong | `07_API_Analysis.md` §5 |
| Financial/analytics dashboards | `profit-dashboard`, `profit-loss`, `profit-reports`, `reports`, `sales` admin pages each independently fetch/compute overlapping figures | `04_Module_Analysis.md` #35 |

## 3. KISS

Where the codebase is simple, it's simple well (the pricing engine, the stock-status calculator). Where it isn't, the complexity is usually *accidental* rather than essential — e.g., two separate PATCH-status implementations for orders with two different, non-matching status whitelists is more complex than one implementation would be, for no functional benefit.

## 4. YAGNI — evidence of both over- and under-building

- **Over-built-then-abandoned**: `orderFulfillmentService.ts`'s FIFO/WAC-based delivery/return flow is fully, correctly implemented (including proper `$transaction` usage) but never called — real engineering effort that isn't earning its keep because it was never wired in.
- **Under-built relative to what's promised**: refunds, notifications, and shipping-carrier integration all have policy pages and/or partial UI promising functionality that has zero backing implementation (`04_Module_Analysis.md` #22–24).

## 5. Clean Architecture / Hexagonal readiness

Directionally reasonable (routes → utils/services → Prisma, no reverse imports found), but not actually hexagonal — there's no port/adapter boundary around Prisma or around the (currently mocked) payment/shipping integrations, so introducing a real payment gateway or courier API will, without intervention, leak gateway-specific shapes directly into `Order`/`Payment` the same way the mock already does. See `11_Target_Architecture.md` for where to introduce this boundary before that integration work starts.

## 6. Modular-monolith / microservice readiness

**Not microservice-ready, and shouldn't be attempted yet** — bounded contexts are not enforced by any module boundary today (see `05_Domain_Model.md` §1: everything reads everything else's Prisma models directly), so splitting into services now would just distribute the current coupling problems over a network. The correct next step is enforcing clean internal module boundaries first (a proper modular monolith), which is exactly the target state in `11_Target_Architecture.md` — microservice decomposition, if ever warranted by genuine independent-scaling needs, should be considered only after that.

## 7. CQRS / event-driven opportunities

- The delivery-triggered cascade (generate sale → generate profit report → post ledger entries) is the clearest, lowest-risk candidate for an internal event/hook pattern (`OrderDelivered` → subscribed handlers), which would also fix the "ledger posting failure is silently swallowed" atomicity gap noted in `03_Current_Architecture.md` §4 by making the failure visible/retryable rather than hidden inside a `try/catch`.
- Read-heavy, computation-heavy admin dashboards (profit-dashboard, profit-loss, reports) recomputing aggregates from raw `Order`/`Sale` rows on every request are a reasonable candidate for a CQRS-style read model (a periodically-refreshed summary table) once traffic/data volume justifies it — not urgent at current scale, but worth keeping in mind given `03_Current_Architecture.md` §8's N+1/sequential-query findings in exactly these dashboards.

## 8. Dead code inventory

- `src/services/dataService.ts.bak` — leftover backup file alongside the live `dataService.ts`.
- `src/lib/ordersStore.ts` — a fully dead, in-memory pre-Prisma prototype, imported by nothing.
- `src/services/orderFulfillmentService.ts` — fully built, unreferenced (see §4).
- `src/utils/salesGeneration.ts::autoGenerateSalesFromOrder`/`batchGenerateSalesFromDeliveredOrders` — unreferenced.
- `src/components/seo/ProductSchema.tsx`, `BreadcrumbSchema.tsx` — fully written, never imported.
- `src/app/admin/verification/page.tsx.backup` — committed backup file with unfinished TODO stubs.
- `src/app/components/ToastTest.tsx` — an empty (0-byte) file.
- `src/app/admin/dashboard/page.tsx` — an orphaned second dashboard, unlinked from admin nav.
- `pg` npm dependency — unused anywhere in application code.
- `src/app/test-upload/page.tsx` — a dev/debug page shipped to and reachable in production (blocked from indexing via `robots.ts`, but not blocked from being loaded/executed).
- 18 `TODO` comments across 10 files (no `FIXME`s), most consequentially the auth-related TODOs already covered in `08_Security_Assessment.md`.
- 120 `console.log` statements across 30 files, concentrated in `admin/products/page.tsx` (21), `MultiImageUpload.tsx` (16), `test-upload/page.tsx` (7), `admin/hero-slides/page.tsx` (7), `lib/email.ts` (7).

## 9. Test-suite quality (see also `01_Project_Overview.md` for the coverage map)

The suite is smaller and less representative than it appears: two of nine files (`profit-calculations.test.ts`, `deletion-transitions.test.ts` — nearly 100 combined `it()` blocks) **import no application code at all** — they assert hand-written literal arithmetic/state-machine logic against itself, so they would stay green even if the real API routes they're named after were broken or deleted. `order-creation.test.ts` validates a Zod schema (`createOrderSchema`) that the real order-creation route doesn't even import. The four genuinely high-quality files (`pricing.test.ts`, `pricingEngine.test.ts`, `stockCalculations.test.ts`, `wholesaleValidation.test.ts`) exercise real, exported functions thoroughly and are a good template for what the rest of the suite should look like. Zero coverage exists for: payment processing, the admin financial ledger, the granular permission system, partner distribution as an end-to-end flow, sales tracking, RFQ, search, cart context, and — most importantly given `03_Current_Architecture.md` §4 — the non-transactional cancellation and profit-finalization code paths, which are exactly where atomicity bugs are most likely to live.

## 10. Positive findings worth preserving

- `src/utils/pricingEngine.ts` / `pricing.ts` / `stockCalculations.ts` / `wholesaleValidation.ts` — well-isolated, pure, thoroughly tested domain logic. This is the template for how the rest of the domain should be written.
- `src/lib/error-handler.ts` — a well-designed, production-aware error-masking module (just not adopted — see `08_Security_Assessment.md` §3).
- `src/lib/paginationHelper.ts` — a clean, reusable pagination utility (same adoption gap).
- `src/components/ui/` (EmptyState/ErrorState/Skeleton variants) — a genuine, well-factored status/feedback design system, consistently reused.
- Server-side price/stock re-validation at order creation — see `08_Security_Assessment.md` §5.

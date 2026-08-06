# 15 — Module Ownership

## 1. What this document is, and isn't

This maps SkyZoneBD's code to the bounded contexts in `docs/architecture-review/05_Domain_Model.md` and states which review authority (per `01_AI_Team_Roles.md`) is expected to weigh in on a change to each area. **It does not assign named human owners** — this project has operated as a single-owner/AI-assisted effort without a multi-person team structure documented anywhere in the repository, and inventing named ownership would be exactly the kind of unsourced claim `docs/engineering-workflow/05_Documentation_Standards.md` §4 prohibits. When a human team forms around specific modules, fill in the "Human owner" column — that's a roster decision for the project owner, not something derivable from code.

## 2. Ownership map

| Module (path) | Bounded context (`05_Domain_Model.md`) | Primary review authority | Human owner |
|---|---|---|---|
| `src/app/api/auth/*`, `src/lib/auth.ts` | Identity & Access | Security Engineer Agent | _unassigned_ |
| `src/app/api/products/*`, `src/app/api/categories/*`, `src/utils/pricingEngine.ts` | Catalog & Pricing | Domain Architect Agent (pricing is this project's most-praised module — extend, don't parallel-implement) | _unassigned_ |
| `src/app/api/orders/*`, `src/app/cart`, `src/app/checkout` | Ordering | Domain Architect Agent + Security Engineer Agent (financial correctness + IDOR-sensitive) | _unassigned_ |
| `src/app/api/rfq/*` | RFQ / Negotiated Pricing | Domain Architect Agent | _unassigned_ |
| `src/utils/profitCalculation.ts`, `profitReportGeneration.ts`, `comprehensiveProfitCalculation.ts`, `partnerProfitDistribution.ts`, `src/lib/financialLedger.ts` | Profit & Financial Reporting | Domain Architect Agent (this is the historically most duplicated area — see `docs/architecture-review/14_Technical_Debt.md` §2; any new file here is a red flag until proven otherwise) | _unassigned_ |
| `src/app/api/admin/partners*`, `src/app/api/admin/distributions*`, `src/app/api/partner/*` | Partner (investor/co-owner) | Domain Architect Agent (ADR-008-governed — `Partner` is deliberately distinct from `Product.sellerId`) | _unassigned_ |
| `src/app/api/admin/inventory*`, `src/services/inventoryService.ts` | Inventory | Domain Architect Agent | _unassigned_ |
| `src/app/api/admin/users*`, `src/middleware/permissionMiddleware.ts`, `src/types/roles.ts` | Identity, Roles & Permissions | Security Engineer Agent | _unassigned_ |
| `src/app/api/admin/employees*`, `admin/salaries*`, `admin/costs*` | HR / Operational Cost (backend built, no admin UI yet — `docs/architecture-review/14_Technical_Debt.md` §11) | Domain Architect Agent | _unassigned_ |
| `src/app/api/data-deletion-requests/*` | GDPR / Data Rights | Security Engineer Agent (P1-6's history — this area has already had one live IDOR) | _unassigned_ |
| `src/app/admin/*` (frontend) | Admin surface (single, canonical — `/dashboard` retired, P2-8) | Frontend Engineer Agent | _unassigned_ |
| `src/app/(storefront pages)` | Customer-facing storefront | Frontend Engineer Agent | _unassigned_ |
| `prisma/schema.prisma`, `prisma/migrations/` | Persistence | Database Architect Agent | _unassigned_ |
| `.github/workflows/ci.yml`, `scripts/migrate.js` | Build & Deploy | DevOps Agent | _unassigned_ |
| `docs/` (all) | Documentation | Documentation Agent | _unassigned_ |

## 3. Cross-cutting modules (no single owner — everyone using them follows the same contract)

`src/lib/auth.ts`, `src/lib/validation.ts`, `src/lib/error-handler.ts`, `src/lib/paginationHelper.ts`, `src/lib/prisma.ts`, `src/lib/logger.ts`, `src/lib/rate-limiter.ts` — these are the canonical shared infrastructure per `06_Coding_Standards.md` §8. A change to any of them is Tier 3 by default (cross-cutting, affects every consumer) regardless of how small the diff looks.

## 4. Areas with no current owner and a known gap

Per `docs/architecture-review/14_Technical_Debt.md`: `src/services/orderFulfillmentService.ts` and `src/services/paymentService.ts` (both dead code, both representing real unwired work — FIFO/WAC costing and refund/payment scaffolding respectively) have no owner because no decision has been made on whether to build on them. Whoever picks up P3-1/P3-2 becomes their de facto owner at that point.

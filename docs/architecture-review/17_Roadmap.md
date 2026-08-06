# 17 — Roadmap

Produced as part of the Principal Engineer Transition (2026-07-18), Phase 6. This organizes everything already tracked in `14_Technical_Debt.md` and `15_Implementation_Backlog.md`, plus this transition's own findings, into forward-looking tracks. It does not re-derive effort estimates already stated elsewhere — see those two documents for detail; this is the synthesis view.

## 1. How to read this roadmap

- **Quick wins**: low effort, real value, no dependency on a business decision. Do these first, in idle capacity, regardless of what else is prioritized.
- **Sequenced engineering work**: ordered, dependency-aware queue for genuinely engineering-decidable items.
- **Business-gated**: cannot proceed until the human project owner (or legal/finance, where noted) makes a call. Listed so they're visible, not to imply they're low priority.
- **High-risk initiatives**: flagged explicitly wherever effort or blast radius is materially larger than everything around it.

## 2. Quick wins (do next, any order, no dependencies)

| Item | Track | Source |
|---|---|---|
| Apply the pending schema migrations (`PasswordResetToken`, indexes, `Partner.userId`, and — new, found in the Production Readiness Audit — `ProfitReport.orderId @unique` to close a duplicate-report race, P-AUDIT-3) | Infrastructure | `14_Technical_Debt.md` §12–13, §23, Triage Matrix #1 |
| Fix ESLint config (`FlatCompat`/`next/core-web-vitals` circular-structure crash) | DX / Testing | `14_Technical_Debt.md` §9, Triage Matrix #2 |
| Add missing `POST /api/admin/users` handler | Engineering Improvements | Triage Matrix #3 |
| Fix `admin/inventory` stock field-name mismatch | Engineering Improvements | Triage Matrix #4 |
| Fix `admin/profit-dashboard`'s broken partner list/create/edit calls | Engineering Improvements | Triage Matrix #5 |
| Enable branch protection on `main` (CI required, review required) | Infrastructure | `docs/engineering-workflow/11_Branching_Strategy.md` §7 |

## 3. Sequenced engineering work (dependency-aware queue)

1. ✅ **DONE (2026-07-18)** — ~~Complete the authorization consolidation (P2-9)~~ — 8 of 17 hand-rolled-JWT routes had confirmed live bugs (SUPER_ADMIN lockout/misrouting, and a `products/[id]` auth-bypass); all 8 fixed and tested. Remaining 9 files are correct-but-hand-rolled (consistency-only, see below).
1b. **Migrate the remaining 9 hand-rolled-but-correct auth checks to the canonical pattern** — Engineering Improvements / DX. No bug, no dependency; pure DRY consistency work (`14_Technical_Debt.md` §22 follow-up). Opportunistic priority.
2. **Maker-checker on payout approval** (`admin/distributions`, `admin/payouts/[id]` PATCH) — Security/Architecture. No dependency; highest-severity *financial-control* item in the debt register (Triage Matrix #6).
3. **Rewrite the third and fourth tautological test files** (`order-creation.test.ts`'s Stock Validation block, `review-permissions.test.ts`) — Testing. Same pattern as the already-completed P2-7; no dependency.
3b. **Manual-sales ledger COGS debit, payment-verification race guard, order-creation idempotency key, inventory-PATCH optimistic lock** (P-AUDIT-4/5/6/7, found in the Production Readiness Audit) — Data Integrity / Security. Each independently small and schema-free; no dependency between them.
4. **Observability baseline**: wire an external error-tracking service (the `logger.ts` code already has a commented-out Sentry hook) and at least one alert (error-rate spike, deploy failure) — Observability. No dependency. See `18_Production_Readiness.md` for why this is more urgent than its "nice infrastructure" framing suggests.
5. **`lib/validation.ts` adoption** into the remaining ~104 routes, paced in batches — Engineering Improvements / Testing. Prioritize the specific client-facing `error.message`-leak routes found in Phase 4's audit (`products`, `upload`, `admin/analytics`, `seed`, `admin/payouts/generate` — `14_Technical_Debt.md` §21) as the first batch. No hard dependency otherwise.
6. **ADR-007 (sale-recording consolidation)**: write and ratify the ADR, then scope the `Order`/`Sale`/`ManualSalesEntry` migration as its own dedicated wave. — Architecture Improvements. **High-risk initiative** (see §5). Depends on nothing further (ADR-008 already unblocked it) but should not be bundled into any other work.
7. **`Product.unit` → `Unit` FK migration** — Architecture Improvements / Future Scalability. No hard dependency; sequence after #6 since both are schema-migration-risk items and doing them independently (not simultaneously) keeps each one's blast radius reviewable.

## 4. Business-gated (blocked on a human decision, not engineering capacity)

| Decision needed | Gates | Owner |
|---|---|---|
| ADR-010: JWT storage (localStorage vs. httpOnly cookie) | P3-5 (SEO/JSON-LD wiring), any XSS-surface-increasing change | Human project owner + Security |
| ADR-011: payment gateway + courier selection | P3-2 (payment integration), P3-3 (shipping integration) | Human project owner (vendor/contract decision) |
| FIFO/WAC costing methodology (`14_Technical_Debt.md` §16) | Whether `orderFulfillmentService.ts` gets wired in or deleted | Business/finance/accounting |
| Refunds/returns policy (P3-1) | Whether `paymentService.ts`'s `PaymentMethod` scaffold gets built out or deleted | Product |
| Out-of-band ("lost access") data-deletion request flow (`14_Technical_Debt.md` §14) | A real GDPR/data-rights gap, not hypothetical | Product/legal |
| Discount/coupon system | Whether this is a wanted feature at all (schema fiction removed in P2-5; no product decision has been made either way) | Product |
| GDPR erasure scope: must "delete my data" reach `DataDeletionRequest.email/phone`, `Sale`/`ManualSalesEntry` customer snapshots, and `Review.comment`, or is account/profile-level anonymization legally sufficient given these are historical transaction records? (found Phase 8, `14_Technical_Debt.md` §22) | Whether the existing anonymization transaction needs extending, or is already compliant by design | Legal/Product |
| `Payment` model: build out (bundle with P3-2 payment gateway work) or delete as unused scaffolding? (found Phase 8, `14_Technical_Debt.md` §22) | Same decision as the `PaymentMethod` enum/`paymentService.ts` item above — recommend deciding both together | Product |

## 5. High-risk initiatives (flag explicitly, don't understate)

- **ADR-007 / sale-recording consolidation**: three live tables, real production data migration, the single largest remaining schema-risk item in the entire backlog. Deserves its own dedicated wave with a written rollback plan reviewed before any migration is applied — not something to fold into a sprint alongside unrelated work.
- **`Product.unit` FK migration**: smaller blast radius than the above but still a real data-backfill risk (string-matching existing `Product.unit` values against `Unit.symbol`, with no guarantee every value matches cleanly).
- **JWT storage migration** (if ADR-010 resolves toward httpOnly cookies): touches every authenticated request path and introduces CSRF-protection scope that doesn't exist today — larger than it looks from the ADR's one-line framing.

## 6. Track summaries

**Business Features**: refunds/returns, real payment gateway, courier integration, discount system — all business-gated (§4), none technically started.
**Engineering Improvements**: quick wins (§2) + validation adoption (§3.3) + admin panel bug fixes.
**Architecture Improvements**: sale-recording consolidation (§3.4, high-risk), `Product.unit` FK (§3.5, high-risk).
**Infrastructure**: migrations (§2), branch protection (§2), observability (§3.2).
**Security**: maker-checker (§3.1), JWT storage decision (§4) once made.
**Performance**: no open items beyond what's already resolved (P1-3 indexes) pending their migration (§2) — no new performance work is currently queued; this itself is worth re-assessing once real production traffic/data-volume figures exist (see `18_Production_Readiness.md`).
**Observability**: error tracking + alerting (§3.2) — currently the single biggest gap between "code is correct" and "we'd know if it wasn't," per `18_Production_Readiness.md`.
**Developer Experience**: ESLint fix (§2), `validation.ts` adoption (§3.3) doubling as a DX improvement (consistent, discoverable validation across routes).
**Testing**: no dedicated new testing-infrastructure work is queued beyond what's already resolved (P2-7, CI) — coverage of newly-added tests should be periodically re-audited using the same "would reverting this fail the test" check (`docs/engineering-workflow/09_Definition_of_Done.md`) rather than assumed durable.
**Documentation**: resolved by this transition (Phase 1–3) — ongoing discipline is now `docs/engineering-workflow/05_Documentation_Standards.md`'s job, not a roadmap item.
**Future Scalability**: `Product.unit` FK (§3.5), and re-evaluating the flat `src/utils/` structure (`docs/engineering-workflow/06_Coding_Standards.md` §7) once it grows further — not urgent today, explicitly not recommended to restructure preemptively.

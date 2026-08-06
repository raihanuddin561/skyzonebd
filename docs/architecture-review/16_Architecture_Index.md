# 16 — Architecture Index

A one-page map of every architectural decision and where the rest of the document set covers it in depth. Produced as part of the Principal Engineer Transition (2026-07-18), Phase 3 (Architecture Governance): every ADR below was re-checked against the current, actual implementation — not assumed current from its own text — before being listed here as accurate.

## 1. ADR status at a glance

| ADR | Decision | Status | Contradicts current implementation? |
|---|---|---|---|
| ADR-001 | Next.js App Router monolith + Prisma/PostgreSQL | Accepted (retrospective) | No — still the architecture today |
| ADR-002 | Custom JWT auth, Bearer header, `localStorage` storage | Accepted, enforcement now consolidated (ADR-009) | No, but storage location is the subject of open ADR-010 |
| ADR-003 | Wholesale-only pricing (retail dropped) | Accepted and current | No — verified: no retail pricing field exists anywhere in `prisma/schema.prisma` or the pricing engine |
| ADR-004 | (Retrospective norm) don't bundle unrelated schema concerns in one migration | Accepted as a going-forward norm | No — no migration since has repeated this pattern |
| ADR-005 | No API versioning | Accepted for now | No — still a single first-party frontend consumer |
| ADR-006 | No CI/CD; build-time migration was the only gate | **Superseded** by P1-5 (CI stood up) and P2-0 (build-time migration strategy fixed) | N/A — historical record only |
| ADR-007 | Consolidate sale-recording into one model | Unblocked (by ADR-008), **not started** | No contradiction — `Order`/`Sale`/`ManualSalesEntry` remain three separate live tables, consistent with "not yet started" |
| ADR-008 | Profit-sharing party representation | **Ratified, implemented** (P2-1b) | No — verified: `Partner.userId` exists in schema, dead `User.isProfitPartner`/`profitSharePercentage` fields removed |
| ADR-009 | Authorization model consolidation | **Ratified, implemented** (P2-4) | No — verified: `verifyAdminToken`, both bespoke `verifyPartner()` copies, and `types/roles.ts`'s dead `checkPermission` are all deleted; `grep` confirms zero remaining references outside this ADR's own historical text |
| ADR-010 | JWT storage location (localStorage vs. httpOnly cookie) | **Proposed, unratified** — genuine business/security trade-off requiring explicit sign-off | N/A — nothing has changed storage location, so nothing contradicts the still-open question |
| ADR-011 | Payment gateway / courier selection | **Proposed, unratified** — vendor/business decision | N/A — no gateway/courier integration exists yet, consistent with "not decided" |
| ADR-012 | Documentation discipline (archive legacy docs, one canonical set) | **Ratified, implemented** (2026-07-18) | No — verified: 143 files now under `docs/legacy-archive/`, zero legacy `.md` files remain at repo root |

## 2. Decisions made during implementation that did *not* require a new ADR, and why

Per `docs/engineering-workflow/04_Decision_Framework.md` §1, an ADR is required for cross-context schema changes, genuine multi-alternative technical choices, security-mechanism changes, third-party integration selection, or ADR overrides — not for applying an already-decided pattern. Recorded here so a future reader doesn't wonder why these lack their own ADR:

- **P0-1 through P0-9** (security patches): all applied the *already-decided* canonical auth pattern (`lib/auth.ts`) to routes that were missing it — not a new decision, a consistency fix.
- **P1-1 through P1-6** (correctness fixes): transaction wrapping, index addition, Prisma client consolidation, CI standup, data-deletion endpoint consolidation — each is a local-implementation-detail or pure-consistency fix within already-accepted architecture (ADR-001/002/005).
- **P2-0** (stop `db push` in production builds): a pure risk-reduction fix restoring the already-intended safe path; no alternative was genuinely viable (nothing justifies auto-applying unreviewed schema changes to a live database).
- **P2-2** (profit calculation consolidation): investigation found the premise (four duplicate implementations) was wrong — the actual fix (extracting one shared `splitGrossProfit()` function) is a refactor within existing architecture, not a new cross-cutting decision.
- **P2-5** (validation schema audit): corrected schemas to match already-existing, already-decided models/routes — not a new validation strategy.

## 3. Reading order for a new engineer

1. `01_Project_Overview.md` — what this system is
2. This document (Architecture Index) — every decision and its current status, at a glance
3. `13_ADRs.md` — full text and evidence for any ADR that matters to the task at hand
4. `05_Domain_Model.md` — the business concepts each ADR governs
5. `11_Target_Architecture.md` — where the system is headed
6. `docs/engineering-workflow/15_Module_Ownership.md` — which code maps to which of the above

## 4. Gaps this index surfaces (not previously called out this explicitly)

- **ADR-010 and ADR-011 are the only two decisions currently blocking further product work** (SEO wiring per P3-5, and any real payment/courier integration per P3-2/P3-3) — both are genuine business/security decisions requiring the human project owner, not engineering-resolvable like ADR-008 turned out to be. See `17_Roadmap.md` and `19_Principal_Engineer_Transition_Report.md`'s "Remaining Business Decisions" section.
- **No ADR exists yet for the FIFO/WAC costing decision** (`docs/architecture-review/14_Technical_Debt.md` §16) — it's tracked as a technical debt item, not an ADR, because no decision has been made either way yet. Once decided, it should be written up as ADR-013 (the next number in sequence, per `04_Decision_Framework.md` §3), not folded into an existing ADR.

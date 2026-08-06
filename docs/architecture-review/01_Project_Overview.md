# 01 — Project Overview

**Document set:** Architecture Discovery & Requirement Analysis
**Subject:** SkyZoneBD (`d:\partnershipbusinesses\skyzone\skyzonebd`)
**Analysis date:** 2026-07-17
**Method:** Full read of the Prisma schema and all 17 migrations, the entire API surface (~105 route files), all frontend routes and shared components, all authentication/authorization/security-relevant source, all core pricing/order/profit business logic, the full automated test suite, and a targeted deep-read of the ~150-file internal documentation corpus — each claim below is verified against current source code, not against prior documentation, which is demonstrably unreliable (see §6).

---

## 1. What this document set is

This is a from-scratch architecture and requirements audit performed as if a new Staff/Principal engineer had just joined the team, with no code changes made. It exists because the project's own internal documentation (150+ markdown files at the repository root) contains direct, dated contradictions about what the system currently does — including its core business model — and cannot be trusted as a source of truth. Every finding in this 15-document set is grounded in the current state of the source tree, cross-checked in several cases against git/migration history to explain *how* the contradictions arose.

Read order recommendation: this document → `02_Business_Requirements.md` → `04_Module_Analysis.md` → `10_Gap_Analysis.md` for a fast orientation; the remaining documents are reference material to consult per topic.

## 2. One-paragraph summary

SkyZoneBD is a single-tenant, single-region **B2B wholesale e-commerce platform** for the Bangladesh market, built as a Next.js App Router monolith with a PostgreSQL (Neon) database via Prisma. It began life as a conventional dual-channel (B2C retail + B2B wholesale) storefront and was deliberately migrated to a **wholesale-only pricing model** in January 2026, while accumulating — in the same period — a large, only loosely-integrated back-office/ERP layer (HR/payroll, operational cost tracking, a financial ledger, partner profit-sharing, manual/offline sales entry, GDPR-style data deletion). The system was built incrementally, largely through AI-assisted, prompt-by-prompt development sessions, without an architecture-first process, a single canonical design document, or ADRs. This shows up structurally as parallel, non-unified implementations of the same concept (three ways to record a sale, four independent profit-calculation engines, four incompatible authorization mechanisms) and, more urgently, as a set of confirmed unauthenticated/under-authenticated admin endpoints that constitute active security risk if the system is internet-reachable today (see `08_Security_Assessment.md`).

## 3. Verified technology stack

| Layer | Technology | Verified version/detail |
|---|---|---|
| Framework | Next.js, App Router | `^16.0.7` (package.json) — prior docs variously claim 14, 15, 15.3.2; all are stale. Turbopack enabled in dev. |
| UI runtime | React / React DOM | `^19.0.0` |
| Language | TypeScript | `^5`, `strict: true` |
| Styling | Tailwind CSS | `^4` (CSS-first config, `postcss.config.mjs`) |
| ORM | Prisma | `^6.16.3`, `prisma-client-js` generator, no preview features |
| Database | PostgreSQL | Neon (pooled connection via `DATABASE_URL`; `directUrl`/unpooled connection is **not** wired into `schema.prisma` despite an unpooled URL being available — an operational gap) |
| Auth | Custom JWT (`jsonwebtoken`) + `bcryptjs` | 7-day token expiry, Bearer header only, no refresh tokens, token stored in `localStorage` (not httpOnly cookies) |
| File storage | Vercel Blob (`@vercel/blob`) | product/category/hero-slide images |
| Validation | `zod` (`^4.3.5`) | present as a dependency but **not actually used** by the real registration/login/order-creation routes — see `08_Security_Assessment.md` |
| Testing | Jest (`^30`) + `ts-jest` + Testing Library | jsdom environment, Prisma always mocked — no integration/e2e tests exist despite Playwright being referenced as "planned" in internal docs |
| Deployment | Vercel | `vercel.json` runs `prisma migrate deploy && prisma generate && next build` on every deploy |
| CI/CD | **None** | no `.github/workflows` or any other CI pipeline exists; the 70%-coverage Jest threshold in `jest.config.js` is configured but not enforced anywhere |
| Direct DB driver | `pg` (`^8.16.3`) | listed as a dependency but **unused** — a repo-wide search found no `new Pool`/`new Client` calls; likely leftover from an earlier prototype |

## 4. Scale snapshot (as read)

- **~71,000 lines** of TypeScript/TSX across **317 files** under `src/`
- **~105 API route files** under `src/app/api/` (roughly 50 customer/public-facing, 55 admin)
- **1,545-line** Prisma schema — **40 models, 19 enums**, zero many-to-many relations
- **17 migrations**, spanning 2025-10-22 to 2026-01-24
- **9 Jest test files**, no CI to run them automatically
- **150+ root-level markdown files** — more documentation files than there are database models

## 5. Business identity (short form — full detail in `02_Business_Requirements.md`)

SkyZoneBD sells goods to **wholesale/B2B buyers only** at present. Retail (B2C) pricing existed at the schema level from project inception through early January 2026 and was explicitly and completely removed from the database schema and pricing engine on 2026-01-03 (migration `migrate_product_pricing_schema`). Buyers register, are optionally verified as a business (trade license, tax ID, 2–3 day manual review), browse a wholesale catalog with quantity-tiered pricing and a Minimum Order Quantity (MOQ) per product, negotiate custom terms via an RFQ (Request for Quote) flow, and check out as a guest or registered account with manual payment methods (bank transfer, bKash/Nagad/Rocket mobile banking, invoice terms). Behind the storefront sits a substantial internal operations layer: inventory/stock management, employee and payroll records, operational cost tracking, a double-entry-style financial ledger, and a partner profit-sharing/payout system for the business's co-owners.

## 6. Why prior documentation cannot be trusted (methodological note)

The 150+ markdown files at the repository root are not engineering documentation in the conventional sense — no ADR log, no single canonical architecture doc, no changelog discipline. They read as a session-by-session diary of AI-assisted development, and several make claims that are directly falsified by later documents in the same corpus or by the actual code:

- Five different documents describe the platform's core B2C/B2B identity five different, mutually contradictory ways (see `02_Business_Requirements.md` §2 for the full resolution).
- `IMPLEMENTATION_COMPLETION_REPORT.md` and `PROJECT_COMPLETION_SUMMARY.md` (both dated 2026-01-03) claim **"All API routes secured," Grade A+ (98–100%,) Production Ready**. Sixteen days later, `AUTH_AUTHORIZATION_AUDIT_2026.md` (dated 2026-01-19) finds **24 admin endpoints completely unprotected**. This session's independent code read confirms the January 19 audit's direction was correct and, if anything, understated the problem (see `08_Security_Assessment.md`).
- `SENIOR_ENGINEER_ANALYSIS_REPORT.md` scores the application **95/100**, "superior to Amazon and Daraz," with no stated rubric or measurement methodology — self-congratulatory language of this kind recurs across the corpus (`"10/10"`, `"PERFECT"`, `"460x ROI"`) and should be disregarded as evidence of anything.
- The Next.js version is stated as 14, 15/15.3.2, and 16/16.0.7 in different documents; only the last matches `package.json`.

**The three exceptions**, which read as genuinely rigorous, self-critical, code-referenced audits and were treated as leads (then independently re-verified in this analysis) rather than accepted at face value: `AUTH_AUTHORIZATION_AUDIT_2026.md`, `PRISMA_SCHEMA_AUDIT_2026.md`, and `ORDER_PROFITABILITY_AUDIT_2026.md`. Where this document set's own code-level findings differ from even these three, the code-level finding is authoritative and the difference is noted.

## 7. How to use this document set

Each of the following 14 documents targets one analytical dimension (business requirements, architecture, modules, domain model, database, API, security, code quality, gaps, target state, roadmap, decisions, debt, backlog). Findings are cross-referenced rather than repeated in full — e.g., `08_Security_Assessment.md` is the canonical source for every auth/authz finding; other documents point to it rather than restating detail. No code has been changed as part of producing this set, per the engagement's explicit scope. `10_Gap_Analysis.md` and `15_Implementation_Backlog.md` are the action-oriented documents; everything before them is descriptive/diagnostic.

# 12 — Checklists (Code Review, Release, Deployment, Security, Performance)

These are the compact, actionable checklists referenced by `.github/PULL_REQUEST_TEMPLATE.md` and by `07_Quality_Gates.md`'s gates. `07_Quality_Gates.md` defines *what must pass and who can block*; this document is *the concrete list a reviewer or release owner works through*. Keep both in sync — a new gate added to `07_Quality_Gates.md` should get a corresponding line here.

---

## 1. Code Review Checklist

- [ ] **Duplication**: does this reimplement logic that already exists elsewhere? Grep for the concept before approving new business logic (`06_Coding_Standards.md` §2's binding DRY rule — this project's specific, repeated failure mode).
- [ ] **Canonical modules used**: `lib/auth.ts` for identity/role, `lib/validation.ts` (Zod) for input, `lib/error-handler.ts` for error responses, `lib/paginationHelper.ts` for lists, the single `lib/prisma.ts` client — no bespoke equivalents.
- [ ] **Auth check present and correct**: every new/changed route explicitly verified, not assumed. Confirm it's the right level (`requireAuth` vs `requireAdmin` vs `requirePartner`) and, where relevant, ownership (`isOwner || isAdmin`) rather than just "any authenticated user."
- [ ] **No secrets, no fallback defaults for required config** (`JWT_SECRET` and equivalents must throw loudly if unset, never silently default).
- [ ] **Error handling**: no bare `catch` returning raw `error.message`; no swallowed errors that should be visible (best-effort side effects like email/report generation are the sanctioned exception — see `06_Coding_Standards.md` §12).
- [ ] **Naming is unambiguous** given this project's history (`UserRole` vs `UserType`, enum-backed fields named after their enum) — `06_Coding_Standards.md` §9.
- [ ] **Tests exist and are real**: would reverting the implementation fail the new/changed test? A test that can't fail is worse than no test (`06_Coding_Standards.md`, `09_Definition_of_Done.md`).
- [ ] **No new parallel implementation of an existing domain concept** without an ADR justifying the exception.
- [ ] **Logging uses `lib/logger.ts`**, not raw `console.log`, for anything beyond a caught-error's `console.error`.

## 2. Security Checklist

(Every item below is Security Engineer Agent's unconditional-veto territory per `01_AI_Team_Roles.md` §9 — a "looks fine" is not sufficient, each must be explicitly confirmed.)

- [ ] Every new/changed API route requires authentication unless it is a deliberately public, read-only, non-sensitive endpoint (catalog/search/health) — and that exception is stated, not assumed.
- [ ] Ownership/authorization is checked, not just authentication (a logged-in user ≠ the right user) — the exact class of bug closed in P0-4/P0-5.
- [ ] No user-controlled input reaches a Prisma query, file path, or shell command without validation.
- [ ] No response includes `password`, a token hash, or another sensitive field via an un-scoped `include`/spread — use an explicit `select` (P0-8's finding).
- [ ] No client-submitted price, quantity, or total is trusted for a financial calculation — server re-derives it (the existing, correct pattern in order creation).
- [ ] Rate limiting applied to auth-adjacent and abuse-prone endpoints (login, register, password reset, and any new endpoint that sends email/SMS or performs a costly operation) — `lib/rate-limiter.ts`'s existing presets.
- [ ] No new hardcoded secret or fallback secret literal.
- [ ] If this touches JWT storage, XSS-adjacent rendering (raw HTML/JSON-LD), or CORS — confirm against ADR-010's still-open decision and `next.config.ts`'s existing scoped CORS blocks (P0-6) before changing either.
- [ ] Dependency added/updated: no known critical/high CVE (`npm audit` — not currently automated in CI; run manually until it is, see `docs/architecture-review/18_Production_Readiness.md`).

## 3. Performance Checklist

- [ ] No new unbounded list query — every list endpoint paginates (`lib/paginationHelper.ts`).
- [ ] No N+1 query pattern — a loop issuing one query per iteration where a single `include`/`findMany` with a `where: { in: [...] }` would do.
- [ ] New hot filter/sort column has a matching `@@index` in `prisma/schema.prisma` (and the migration is committed — see `11_Branching_Strategy.md` §6).
- [ ] Any new admin/report query touching `Order`/`Product`/`FinancialLedger` at scale is checked against expected row-count growth, not just today's dev-database size.
- [ ] Client bundle: no new large dependency added to a client component when a server component or a lighter alternative would do.

## 4. Release Checklist

Owned by whoever is acting as Release Manager for this release (`01_AI_Team_Roles.md` §13).

- [ ] Every included PR passed CI (`typecheck`, `test`) and code review.
- [ ] No unresolved Security Engineer veto on anything in this release.
- [ ] `docs/releases/CHANGELOG.md`'s `## Unreleased` section accurately reflects everything in this release; cut a dated version heading above it.
- [ ] Any pending database migration this release depends on has been reviewed and is ready to apply (see Deployment Checklist below) — check `docs/architecture-review/14_Technical_Debt.md` for the current list of not-yet-applied migrations before assuming the schema in code matches the live database.
- [ ] Rollback plan recorded for anything non-trivial (`08_Work_Item_Template.md`'s Rollback Plan field, aggregated for the release).
- [ ] If this release includes a Tier 3 change: human project-owner go/no-go obtained (`10_Project_Governance.md` §2).

## 5. Deployment Checklist

SkyZoneBD deploys to Vercel, triggered by a push/merge to `main` (see `docs/DEPLOYMENT_GUIDE.md` for the full procedure).

- [ ] `.env`/Vercel project environment variables are current for every variable a new change introduced (check `DEVELOPER_GUIDE.md`'s required-variables list against what's actually configured in Vercel — a mismatch fails at runtime, not at build).
- [ ] Any pending Prisma migration has been applied via `npx prisma migrate deploy` against the target database **before** or as part of this deploy — `scripts/migrate.js` runs this automatically on build (P2-0 fixed it to be the sole non-dev path), but a migration that was never committed still won't apply itself; confirm the migration file exists in the branch being deployed.
- [ ] `npm run build` succeeds locally (or in a preview deploy) before merging to `main`.
- [ ] Post-deploy smoke check: home page loads, login works, one representative admin page loads, one representative API route responds — a scripted smoke test is a documented gap, see `docs/architecture-review/18_Production_Readiness.md`.
- [ ] Monitor error rate/logs for the deployment's first monitoring window (currently manual — no alerting is wired up; see `13_Incident_Response_and_Production_Runbook.md` and `18_Production_Readiness.md`).
- [ ] Rollback path confirmed available (Vercel's instant rollback to the prior deployment) before considering the deploy final.

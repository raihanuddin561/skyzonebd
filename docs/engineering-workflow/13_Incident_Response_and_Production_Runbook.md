# 13 — Incident Response Guide & Production Runbook

**Honesty note**: this document describes the procedures that are actually possible with SkyZoneBD's current, real observability stack — which is minimal. `src/lib/logger.ts` writes structured log lines to `console.*` only (captured by Vercel's log viewer for as long as Vercel retains them); there is no external error tracking, no alerting, no metrics dashboard, and no tracing. Where a step below says "not currently possible," that is a tracked gap (`docs/architecture-review/18_Production_Readiness.md`), not an oversight in this document.

---

## Part A — Incident Response Guide

### 1. What counts as an incident

- The site or a core flow (login, checkout, order creation) is down or erroring for real users.
- A security vulnerability is confirmed live (unauthorized data access, a working exploit, an account compromise).
- Data integrity is at risk (a bug is corrupting orders, profit figures, or stock levels).
- A production database migration fails partway.

### 2. Immediate response

1. **Confirm it's real**: reproduce directly against the production URL, not just a report. Check Vercel's deployment dashboard for a recent deploy correlating with the start time.
2. **Assess blast radius**: all users or a subset? One route or many? Since there's no APM, this is done by direct testing and reading Vercel's log viewer (filter by time window and, if `logger.ts`'s `context` tagging was used on the relevant code path, by context string) — not by a dashboard.
3. **Stop the bleeding first, root-cause second**:
   - If the last deploy is the cause: **roll back** via Vercel's dashboard (instant, no code change needed) — this is almost always faster than a forward fix.
   - If a security exploit is live: disable the affected route/feature if a fast, safe way exists (e.g., a feature flag or a quick auth-tightening hotfix per `10_Project_Governance.md` §6's "explicit instruction supersedes defaults" allowance for genuine incidents) rather than leaving it open while investigating.
4. **Per `01_AI_Team_Roles.md` §8/§9**: any production incident escalates immediately to the human project owner. A security finding of Critical/High severity escalates immediately and out-of-band, regardless of what else is happening.

### 3. During the incident

- Keep a running note of what was tried and what was observed (timestamps) — this becomes the post-incident record. There is currently no incident-tracking tool wired up; a plain document/issue is sufficient.
- Do not run `prisma db push` or any unreviewed schema command against production as a fix attempt, even under pressure — this is exactly the risk P2-0 closed off (`docs/architecture-review/14_Technical_Debt.md` §15). A schema fix under incident conditions still goes through a real migration file.
- A hotfix that bypasses normal review (`07_Quality_Gates.md`'s exception-handling rule) must still be explicitly approved by the human project owner and logged as a new Technical Debt Register item with a remediation deadline — never silently merged and forgotten.

### 4. Data-integrity incidents specifically

Given the financial nature of this system (orders, profit reports, ledger entries — `docs/architecture-review/05_Domain_Model.md`):
- Before attempting a data fix, snapshot the affected rows (a `SELECT` export, not a mutation) so the pre-fix state is recoverable if the fix itself is wrong.
- Prefer a corrective transaction (e.g., a reversing ledger entry) over an in-place `UPDATE` of a financial row where the domain model supports it — `FinancialLedger`'s double-entry design (`src/lib/financialLedger.ts`) is built for this.
- Any fix touching real customer orders or partner profit figures should have a second person's (or, at minimum, a second independent review pass's) sign-off before executing, given the maker-checker gap already flagged in `docs/architecture-review/14_Technical_Debt.md` §9 for payout approval.

### 5. Post-incident

- Write a short post-incident note: what happened, root cause, what fixed it, what would have caught it sooner. Feed any process lesson into `docs/engineering-workflow/10_Project_Governance.md` §4 (workflow amendment) or `docs/architecture-review/14_Technical_Debt.md` (a new debt item, e.g., "no alerting caught this for N hours").
- Confirm whether this incident's root cause is already a known, tracked item (many of the correctness bugs found and fixed by the P0/P1 waves were exactly this kind of latent risk) — if not, add it.

### 6. Security vulnerability disclosure

If a vulnerability is discovered internally or reported, treat it as Critical/High until proven otherwise, do not discuss it in a public issue tracker, and route it directly to the human project owner per `01_AI_Team_Roles.md` §9. There is currently no external security-disclosure channel configured (e.g., a `SECURITY.md` with a private contact) — establishing one is tracked in `docs/architecture-review/18_Production_Readiness.md`.

---

## Part B — Production Runbook

### 1. Where things live

- **Application**: deployed on Vercel, built from `main` via `npm run build` → `node scripts/migrate.js && next build`.
- **Database**: PostgreSQL on Neon, accessed via `DATABASE_URL` (pooled) — `directUrl`/unpooled is available but not wired into `prisma/schema.prisma` (a known gap, `docs/architecture-review/01_Project_Overview.md` §3).
- **File storage**: Vercel Blob (product/category/hero-slide images).
- **Email**: Resend, via `RESEND_API_KEY` — falls back to a console-log dev stub if unset/non-production (`src/lib/email.ts`).
- **Logs**: Vercel's built-in log viewer, populated by `console.*` calls (including everything routed through `src/lib/logger.ts`).

### 2. Common operational tasks

| Task | Procedure |
|---|---|
| Check current schema/migration state | `npx prisma migrate status` against the target `DATABASE_URL` |
| Apply a pending migration | `npx prisma migrate deploy` (never `db push` against a shared database — see `14_Disaster_Recovery.md`) |
| Inspect data directly | `npx prisma studio` (local; do not expose against production without tunneling securely, and never leave it running against production) |
| Rotate `JWT_SECRET` | Update the Vercel environment variable, then redeploy. **This invalidates every existing session token immediately** (no refresh-token mechanism exists) — plan for a support/communication window, this is not silent. |
| Manually link a Partner to a User account | `PATCH /api/admin/partners/[id]` with `{"userId": "<user-id>"}`, as an authenticated admin (ADR-008's implementation) |
| Re-run profit-report generation for a specific order | No dedicated endpoint exists today for a targeted re-run; this is a gap — see `docs/architecture-review/18_Production_Readiness.md`. |

### 3. Environment variables (required)

See `docs/DEVELOPER_GUIDE.md` for the full list with descriptions. At minimum, production requires: `DATABASE_URL`, `JWT_SECRET` (no fallback — the app fails auth operations loudly if unset, by design, P0-7), `RESEND_API_KEY` (optional — falls back to a dev stub), Vercel Blob's token (set automatically when Blob is provisioned via the Vercel integration).

### 4. Known operational risks (do not treat as resolved by this document existing)

- **No alerting** — a production error is only visible if someone is actively reading Vercel's log viewer. See `docs/architecture-review/18_Production_Readiness.md` for the recommended remediation.
- **Three schema changes are committed to `prisma/schema.prisma` but have no migration file applied anywhere** (`PasswordResetToken`, 8 indexes, `Partner.userId`) as of this writing — `npx prisma migrate status` against production will show this. Apply per `docs/architecture-review/14_Technical_Debt.md` §12–13 before relying on any of the three features/optimizations they support.
- **No maker-checker on payout approval** (`admin/distributions`, `admin/payouts/[id]` PATCH) — a single admin can mark a real money payout as `PAID` unilaterally. Tracked debt, not yet fixed.

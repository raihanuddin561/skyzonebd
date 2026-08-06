# Developer Guide

Canonical location for onboarding/local-setup/conventions per `docs/engineering-workflow/05_Documentation_Standards.md` §2. Update this file when setup or conventions change — do not create a new one-off setup doc.

## 1. Prerequisites

- Node.js (a version compatible with Next.js 16 / React 19 — verify against `package.json`'s engines if added later; none is currently pinned)
- A PostgreSQL database reachable from your machine (Neon is used in production; any Postgres works for local dev)

## 2. First-time setup

```bash
npm install
cp .env.example .env
```

Fill in `.env`:

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | Pooled Postgres connection string |
| `JWT_SECRET` | Yes | Signs/verifies auth tokens. No fallback exists — auth fails loudly if unset (deliberate, P0-7). Generate a real random string, not the placeholder. |
| `BLOB_READ_WRITE_TOKEN` / `SKY_ZONE_BD_BLOB_READ_WRITE_TOKEN` | For image upload features | Vercel Blob storage token; Vercel auto-populates one of these two names depending on integration setup — code checks both. |
| `MIGRATION_SECRET_KEY` | For `/api/migrate` | Shared secret gating the migration endpoint |
| `SEED_SECRET` | For `/api/seed` | Shared secret gating the seed endpoint |
| `RESEND_API_KEY` | No | Email sending; without it, `src/lib/email.ts` logs to console instead of sending (safe local-dev default) |
| `NEXT_PUBLIC_SITE_URL` | Yes | Used to build links in emails (password reset, etc.) — must match wherever the app is actually reachable |
| `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_USE_API` | Yes | Frontend API client configuration |
| `NODE_ENV` | Set by tooling | `development` locally; `production` in deployed environments — gates `scripts/migrate.js`'s migration strategy (see `docs/DEPLOYMENT_GUIDE.md`) |
| `TAX_RATE`, `SHIPPING_CHARGE` | Optional | Referenced in source but **not currently listed in `.env.example`** — a documentation gap found during this review; if you rely on either, confirm the actual default behavior in the consuming code before assuming a value. |

```bash
npm run db:migrate   # applies migrations locally (uses `prisma migrate dev`)
npm run db:seed       # sample data
npm run dev
```

## 3. Day-to-day commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server (Turbopack) |
| `npm run test` / `test:watch` / `test:coverage` | Jest |
| `npm run test:ci` | Jest in CI mode (what `.github/workflows/ci.yml` runs) |
| `npx tsc --noEmit` | Type-check without emitting |
| `npm run lint` | ESLint — **currently broken project-wide** (`docs/architecture-review/14_Technical_Debt.md` §9), runs in CI non-blocking; don't rely on it catching issues until that's fixed |
| `npx prisma studio` | Browse local data |
| `npx prisma migrate dev --name <description>` | Create + apply a new migration locally |

## 4. Conventions

Full detail lives in `docs/engineering-workflow/06_Coding_Standards.md`. The short version:

- Use the canonical shared modules — `lib/auth.ts`, `lib/validation.ts`, `lib/error-handler.ts`, `lib/paginationHelper.ts`, the single `lib/prisma.ts` client, `lib/logger.ts`. Don't hand-roll an equivalent.
- Before writing new business logic, search for an existing implementation first (`docs/architecture-review/14_Technical_Debt.md` §2 is the standing cautionary example of what happens when this isn't done).
- Business logic lives in `src/utils`/`src/services`, not inline in route handlers.
- Every route needs an explicit, verified auth check — see `docs/engineering-workflow/12_Checklists.md` §2.

## 5. Where to look first

- `docs/architecture-review/01_Project_Overview.md` — what this system is
- `docs/architecture-review/05_Domain_Model.md` — business concepts and bounded contexts
- `docs/architecture-review/13_ADRs.md` — why things are the way they are
- `docs/engineering-workflow/15_Module_Ownership.md` — which part of the codebase maps to which bounded context

## 6. Before opening a PR

Read `.github/PULL_REQUEST_TEMPLATE.md` and `docs/engineering-workflow/12_Checklists.md` §1 (Code Review Checklist). If your change is Tier 3 (`docs/engineering-workflow/00_Agentic_Engineering_Workflow.md` §5), it needs a ratified ADR before implementation, not after.

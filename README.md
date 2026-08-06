# SkyZoneBD — B2B Wholesale E-Commerce Platform

A single-tenant, single-region B2B wholesale e-commerce platform for the Bangladesh market. Buyers register (with optional business verification), browse a wholesale catalog with quantity-tiered pricing and per-product MOQs, negotiate custom terms via RFQ, and check out as a guest or registered account. Behind the storefront: inventory management, a financial ledger, and a partner (investor/co-owner) profit-sharing system.

**SkyZoneBD is wholesale-only.** Retail/B2C pricing existed at the schema level through early January 2026 and was deliberately removed (see ADR-003, `docs/architecture-review/13_ADRs.md`). If you find a document describing a dual B2C/B2B model, it predates that decision — see `docs/legacy-archive/`.

## Documentation map

Start here, in this order:

1. **`docs/architecture-review/01_Project_Overview.md`** — what this system is, verified against source, not prior docs.
2. **`docs/architecture-review/02_Business_Requirements.md`** — the business rules.
3. **`docs/engineering-workflow/00_Agentic_Engineering_Workflow.md`** — how work gets done on this project (process, roles, quality gates).
4. **`docs/architecture-review/13_ADRs.md`** — every architectural decision, why it was made, and its current status.
5. **`docs/architecture-review/15_Implementation_Backlog.md`** and **`14_Technical_Debt.md`** — what's left to do.

The full `docs/architecture-review/` set (16 documents as of this writing) covers architecture, domain model, database, API, security, code quality, target architecture, and roadmap in depth. `docs/legacy-archive/` holds ~143 superseded, session-diary-style documents from early development — non-authoritative, kept for history only.

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript 5 (strict) |
| Styling | Tailwind CSS 4 |
| Database | PostgreSQL (Neon), Prisma ORM 6 |
| Auth | Custom JWT (`jsonwebtoken` + `bcryptjs`), Bearer header |
| File storage | Vercel Blob |
| Validation | Zod |
| Testing | Jest + ts-jest + Testing Library |
| CI | GitHub Actions (`.github/workflows/ci.yml`) |
| Deployment | Vercel |

## Getting started

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL, JWT_SECRET, etc. — see docs/engineering-workflow for required variables
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Database

```bash
npm run db:migrate   # apply migrations (local/dev)
npm run db:seed       # seed sample data
npm run db:studio     # inspect data via Prisma Studio
```

**Never run `db:push` or `migrate deploy` against a shared/production database without review** — see `docs/engineering-workflow/06_Coding_Standards.md` §8 and the migration-safety finding in `docs/architecture-review/14_Technical_Debt.md` §15.

### Tests and checks

```bash
npm run test:ci        # Jest
npx tsc --noEmit       # TypeScript
npx prisma validate    # schema
```

## Project structure

- `src/app` — Next.js App Router pages, layouts, and API routes (`src/app/api/`)
- `src/components` — shared React components
- `src/contexts` — React Context providers (Auth, Cart, Wishlist)
- `src/services` — service-layer modules
- `src/lib` — shared infrastructure (auth, validation, logging, error handling, rate limiting)
- `src/types` — TypeScript type definitions
- `src/utils` — pure utility/business-logic functions
- `prisma/` — schema and seed files
- `docs/` — all engineering documentation (see above)

## Contributing

Every change follows `docs/engineering-workflow/00_Agentic_Engineering_Workflow.md`'s lifecycle, scaled to the change's size. In short: understand the business requirement → check existing architecture/ADRs before building something new → write the plan → implement → test → update documentation in the same change. See `docs/engineering-workflow/03_Task_Execution_Protocol.md` for the full checklist and `.github/PULL_REQUEST_TEMPLATE.md` before opening a PR.

## License

© 2026 SkyZoneBD. All rights reserved.

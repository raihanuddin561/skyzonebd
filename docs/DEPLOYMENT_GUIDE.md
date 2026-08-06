# Deployment Guide

Canonical deployment reference per `docs/engineering-workflow/05_Documentation_Standards.md` §2. Supersedes the scattered `VERCEL_*`/`DATABASE_SETUP*` legacy docs now in `docs/legacy-archive/`.

## 1. Platform

SkyZoneBD deploys to **Vercel**, building from `main`. Both `npm run build` and the `vercel-build` script run:

```bash
node scripts/migrate.js && next build
```

`scripts/migrate.js` runs `prisma migrate deploy` (the safe, migration-history-based path) whenever `NODE_ENV !== 'development'` — this was previously `prisma db push` with a fallback to `migrate deploy`, fixed to the reverse (P2-0, `docs/architecture-review/15_Implementation_Backlog.md`) because `db push` can silently apply unreviewed, unversioned schema changes to a live database.

## 2. First-time deployment

1. Provision a PostgreSQL database (Neon is what production currently uses).
2. Set every environment variable from `docs/DEVELOPER_GUIDE.md` §2 in the Vercel project settings — a variable present locally but missing in Vercel fails at runtime, not at build time, so this is easy to miss.
3. Connect the Vercel project to Vercel Blob (Storage tab) — this auto-populates a blob read/write token under one of two possible names (see `docs/DEVELOPER_GUIDE.md`'s table).
4. Ensure every migration file that should exist is actually committed to `prisma/migrations/` in the branch being deployed — `prisma migrate deploy` only applies committed migration files; it does not infer changes from `schema.prisma` alone (that's what `db push` does, and it's deliberately not the production path).
5. Push/merge to `main`. Vercel builds and deploys automatically.

## 3. Ongoing deployments

Every merge to `main` triggers a new deployment. Before merging:

- CI (`typecheck`, `test`) must be green — `.github/workflows/ci.yml`.
- Follow `docs/engineering-workflow/12_Checklists.md` §5 (Deployment Checklist).

## 4. Pending migrations — check before assuming a feature works

As of this writing, three schema changes exist in `prisma/schema.prisma` with **no migration file created or applied**: the `PasswordResetToken` model, 8 `@@index` directives, and `Partner.userId`. Until a human runs a migration (`npx prisma migrate dev --name ...` locally, committed, then deployed via the normal flow above), the corresponding features/optimizations are inert in any real database — see `docs/architecture-review/14_Technical_Debt.md` §12–13 for the full detail and the recommended combined migration name.

**This project's standing operating rule**: no autonomous AI session runs a schema-mutating command (`migrate dev`, `db push`, `migrate deploy`) against a real, possibly-shared database. Schema changes are made in `schema.prisma` and left for a human to migrate. This is deliberate, not an oversight — do not "fix" it by having an agent run the migration unsupervised.

## 5. Rollback

Vercel retains prior deployments — roll back via its dashboard, near-instant. **Caveat**: if the deployment being rolled back away from already had its migration applied to the database, confirm the prior code version is compatible with the now-current schema before rolling back (see `docs/engineering-workflow/14_Disaster_Recovery.md` §3). A schema-incompatible rollback can be worse than the bug it's trying to fix.

## 6. What's not automated yet (tracked gaps, not silent risks)

- No staging environment is documented as existing separately from Vercel's own preview deployments (previews exist per-PR by default on Vercel, but no persistent staging/UAT environment with its own database is confirmed configured).
- No automated post-deploy smoke test.
- No deployment notification (Slack/email) on success or failure — deploy status is only visible by checking the Vercel dashboard directly.

See `docs/architecture-review/18_Production_Readiness.md` for the full assessment of these gaps.

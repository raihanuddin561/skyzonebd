# 14 — Disaster Recovery Guide

## 1. Scope

What to do when something more severe than a routine incident (`13_Incident_Response_and_Production_Runbook.md`) happens: data loss, a botched migration, a compromised credential, or total loss of the deployment.

**Honesty note**: this document describes the recovery options SkyZoneBD's actual current infrastructure supports. A dedicated backup-verification/restore-drill process does not exist yet — that is a tracked gap (`docs/architecture-review/18_Production_Readiness.md`), not implied by this document's existence.

## 2. Database recovery (Neon/PostgreSQL)

- **Point-in-time recovery**: Neon supports point-in-time restore on its paid tiers; confirm the project's current Neon plan and retention window before assuming a specific recovery point is available — this has not been independently verified as part of this transition and should be confirmed directly in the Neon dashboard.
- **Before any destructive recovery action**: export/snapshot the current (post-incident) state first, even if it's the bad state — you cannot undo a restore, and comparing before/after is often necessary to understand what a bug actually corrupted.
- **A failed migration mid-apply**: `prisma migrate deploy` applies migrations transactionally per-migration-file where the underlying SQL supports it, but a multi-statement migration can still leave the schema partially changed if it fails midway. Recovery: inspect `_prisma_migrations` table for the failed migration's row, resolve manually per [Prisma's migrate resolve documentation pattern] (mark as rolled back or applied, matching the database's actual state), then fix and reapply. **Never mark a migration as resolved without first confirming, by direct inspection, what actually happened to the schema.**
- **No automatic backup restore drill has been performed** — recommend scheduling one (restore a recent backup to a scratch database, verify it boots and looks correct) as a concrete first action once this document is adopted, rather than assuming backups work because they're configured.

## 3. Recovering from a bad deployment

- Vercel retains prior deployments; roll back via its dashboard — this is near-instant and does not require a code revert. Prefer this over a hurried forward-fix for anything customer-facing and broken.
- If the bad deployment included a schema migration that's already been applied to the database, a simple Vercel rollback is **not sufficient** — the rolled-back code may not match the now-migrated schema. Assess whether the migration is backward-compatible with the prior code version before rolling back; if not, the correct recovery is a forward fix, not a rollback.

## 4. Credential compromise

- **`JWT_SECRET` compromised**: rotate immediately via the Vercel environment variable + redeploy. This invalidates all existing sessions (no refresh-token mechanism, so this is total and immediate) — see `13_Incident_Response_and_Production_Runbook.md` §2.
- **Database credentials compromised**: rotate via the Neon dashboard, update `DATABASE_URL` in Vercel, redeploy. Expect a brief window of downtime while both sides are updated.
- **`RESEND_API_KEY` or Vercel Blob token compromised**: rotate via the respective provider's dashboard; these are lower-severity (no direct data-access risk) but should still be rotated promptly to prevent abuse (e.g., spam sent from SkyZoneBD's sending domain).

## 5. Total loss of the deployment/hosting account

- Source code: recoverable from git (assuming the repository itself is hosted somewhere other than only the local machine — **confirm this is true**; a repository that exists only on one machine's disk is itself a single point of failure not covered by anything else in this document).
- Database: recoverable per §2, assuming Neon's own infrastructure survives (a Neon-level outage is outside SkyZoneBD's control; Neon's own SLA/status page is the reference, not anything in this repository).
- Re-deployment: `docs/DEPLOYMENT_GUIDE.md` documents the from-scratch deployment procedure — a full disaster-recovery drill should include actually exercising that document once, not just trusting it reads correctly.

## 6. What this document does not cover

- A formal Recovery Time Objective (RTO) / Recovery Point Objective (RPO) — these are business decisions (how much downtime/data loss is acceptable) that haven't been stated by the business yet. Recommend the human project owner set explicit RTO/RPO targets; until then, "as fast as possible, with maximum data preserved" is the working assumption, which is not the same as a tested guarantee.
- Multi-region failover — SkyZoneBD is explicitly single-region (`docs/architecture-review/01_Project_Overview.md` §2); this is a deliberate, appropriate choice at current scale, not a gap, per `docs/architecture-review/11_Target_Architecture.md`.

# 07 — Quality Gates

No task is complete unless every applicable gate below passes. Gates are mapped to the lifecycle phase that enforces them and the agent with authority to block on failure. A gate marked **Automated** must be a CI check, not a manual judgment call, once the tooling exists (see `docs/architecture-review/15_Implementation_Backlog.md` P1-5 for standing up CI in the first place).

| # | Gate | Enforced at phase | Blocking agent | Automated? |
|---|---|---|---|---|
| 1 | **Architecture Review** — implementation matches approved domain model/target architecture decisions; no new parallel implementation introduced | 11 | Solution Architect Agent, Domain Architect Agent | Partial (lint rules for known anti-patterns where feasible; architectural fit is manual) |
| 2 | **Code Review** — SOLID/DRY/KISS per `06_Coding_Standards.md`, no unjustified duplication of existing canonical logic | 11 | Code Reviewer Agent | Partial (ESLint automated; duplication/fit judgment manual) |
| 3 | **Security Review** — every new/changed route has a verified, canonical auth check; no hardcoded secrets/fallbacks; no new unauthenticated sensitive endpoint | 9, 11 | Security Engineer Agent (hard veto, per `01_AI_Team_Roles.md` §9) | Partial (secret-scanning automated; auth-check presence should become a lint rule; correctness of the check is manual) |
| 4 | **Performance Review** — no new unbounded query, no new N+1 pattern, indexes present on new hot filter columns | 11 | Performance Engineer Agent | Partial (query-plan review manual; some patterns lintable) |
| 5 | **Unit Tests** — new/changed logic has tests that exercise the real implementation (not tautological assertions, per the documented finding on two existing test files) | 10 | QA Engineer Agent | Yes, once CI exists |
| 6 | **Integration Tests** — multi-step flows (order creation, cancellation, delivery-triggered profit/sale generation) have coverage proportional to their financial/data-integrity risk | 10 | QA Engineer Agent | Yes, once CI exists |
| 7 | **API Compatibility** — no breaking change to an existing endpoint's contract without a documented migration/versioning plan (given no API versioning currently exists, per `docs/architecture-review/07_API_Analysis.md` §1) | 6, 11 | Solution Architect Agent | Partial (contract diffing can be automated; impact judgment manual) |
| 8 | **Database Migration Validation** — one concern per migration, rollback plan documented, required indexes included, reviewed by Database Architect Agent | 8, 9 | Database Architect Agent | Partial (migration linting automated; concern-scoping judgment manual) |
| 9 | **Documentation Updated** — every applicable document type in `05_Documentation_Standards.md` §2 updated, no new one-off summary file created | 12 | Documentation Agent | Manual (checklist-driven) |
| 10 | **ADR Updated** — required per `04_Decision_Framework.md` §1, ratified per §4, before implementation proceeds past Phase 8 | 7 | Solution Architect Agent, Principal Engineer Agent (+ human for Tier 3) | Manual |
| 11 | **Build Successful** — `next build`, `tsc --noEmit`, `prisma generate` all succeed | 9, 13 | DevOps Agent | Yes |

## Gate sequencing rule

Gates 1–4 (review-type gates) and 5–6 (test-type gates) both gate Phase 11, but are independent of each other — a change cannot pass Phase 11 with, say, tests green but an unresolved security finding, or vice versa. **Security Engineer Agent's veto (gate 3) overrides every other gate's pass** — a change with excellent test coverage and a clean architecture review still does not ship if it introduces an unauthenticated sensitive endpoint.

## Gate failure handling

A failed gate returns the task to the relevant earlier phase (per the lifecycle diagram in `02_Development_Lifecycle.md`) — it does not get waived by schedule pressure. If a genuine, temporary business reason exists to ship with a known gate exception (e.g., a hotfix under active incident), that exception must be:
1. Explicitly approved by Principal Engineer Agent + human project owner (never a unilateral AI decision, per `10_Project_Governance.md`),
2. Logged as a new item in the Technical Debt Register (`docs/architecture-review/14_Technical_Debt.md`) with an owner and a remediation deadline, not silently forgotten.

## Standing gates specific to SkyZoneBD's current debt

Until the corresponding backlog item in `docs/architecture-review/15_Implementation_Backlog.md` is closed, the following **additional** gates apply automatically to any task touching the relevant area:

- Any task touching an admin API route must confirm (and, if missing, add) a verified auth check, per the P0 security backlog — this is not optional even if the task's stated scope was unrelated to security.
- Any task touching profit/sale calculation must not add a fifth/fourth parallel implementation without an ADR (per `04_Decision_Framework.md` §6) explicitly justifying the exception.
- Any task adding a new admin-facing feature must state which admin surface (`/admin` vs. any successor to `/dashboard`) it targets, and may not silently perpetuate the duplication.

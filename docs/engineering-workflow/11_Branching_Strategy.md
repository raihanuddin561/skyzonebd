# 11 — Branching Strategy

## 1. Current state (as of 2026-07-18)

Single branch, `main`, with direct-to-Vercel deploys historically and no CI gate until `.github/workflows/ci.yml` was added (`docs/architecture-review/15_Implementation_Backlog.md` P1-5). This document establishes the branching model for all work going forward — it does not require an immediate repository restructure, only that new work follows it.

## 2. Model: trunk-based development with short-lived feature branches

Chosen over GitFlow-style long-lived `develop`/`release` branches because SkyZoneBD has one deployment target (Vercel, effectively continuous deploy from `main`), a small team, and no need to maintain multiple parallel released versions. GitFlow's overhead would be new process debt, not paid-down debt (consistent with `docs/architecture-review/14_Technical_Debt.md` §7's principle of not "fixing" things that aren't actually broken).

- `main` is always deployable. Every commit on `main` has passed CI (`typecheck`, `test`; `lint` currently non-blocking — see `docs/architecture-review/14_Technical_Debt.md` §9).
- All work happens on a branch cut from `main`, merged back via PR. Direct pushes to `main` are not used except for the rare, explicitly-approved hotfix under active incident (`13_Incident_Response_and_Production_Runbook.md`).
- Branches are short-lived — days, not weeks. A branch that's been open more than ~1 week without merging is a signal the task was mis-scoped (too large for its tier) or blocked; either re-tier it or surface the blocker, per `00_Agentic_Engineering_Workflow.md` §5.

## 3. Naming convention

```
<type>/<short-description>
```

| Type | Use |
|---|---|
| `feat/` | New capability |
| `fix/` | Bug fix |
| `chore/` | Dependency bumps, config, tooling, non-behavioral cleanup |
| `refactor/` | Behavior-preserving structural change |
| `security/` | Security-relevant fix — flag for priority review regardless of branch name, but naming it explicitly helps triage |
| `docs/` | Documentation-only change |

Examples: `fix/partner-userid-lookup`, `feat/refund-request-flow`, `security/rotate-jwt-secret-handling`.

## 4. Tier-to-branch mapping

Per `00_Agentic_Engineering_Workflow.md` §5:

- **Tier 1**: a branch is still used (never commit directly to `main`), but the PR can be small and reviewed quickly — no ADR, no extended checklist.
- **Tier 2**: standard branch + PR flow, full `03_Task_Execution_Protocol.md` checklist, full PR template.
- **Tier 3**: branch + PR, **plus** a ratified ADR merged (or referenced, if the ADR is tracked separately) before the implementation PR is opened — `04_Decision_Framework.md` §1 makes this a hard gate, not a suggestion. Consider splitting the ADR and its implementation into separate PRs so the decision can be reviewed independently of the code.

## 5. Commit discipline

- Commit messages describe *why*, not just *what* (the diff already shows what) — consistent with this project's session convention.
- Prefer several small, reviewable commits over one large one within a branch; squash-merge to `main` is acceptable to keep `main`'s history clean, provided the PR description captures the full rationale (it becomes the permanent record once individual commits are squashed away).
- Never rewrite history on `main`. Never force-push to `main`.

## 6. Migrations and branches

A branch that adds/changes a Prisma model must include the actual migration file (`prisma migrate dev --name ...`, committed), not just a schema edit — per `docs/architecture-review/14_Technical_Debt.md` §12–13's standing finding that schema-only edits without a committed migration leave the database silently out of sync with the code. See `14_Disaster_Recovery.md` for migration rollback.

## 7. Protecting `main`

Recommended (not yet configured as of this writing — an action item, see `docs/architecture-review/18_Production_Readiness.md`): branch protection on `main` requiring the CI check to pass and at least one review before merge, once the repository is hosted somewhere that supports it (GitHub).

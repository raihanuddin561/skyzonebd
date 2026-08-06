<!--
Before opening this PR, confirm you've been through
docs/engineering-workflow/03_Task_Execution_Protocol.md, scaled to this change's
tier (docs/engineering-workflow/00_Agentic_Engineering_Workflow.md §5). This
template is the compact, PR-sized view of that protocol and the Work Item
template (docs/engineering-workflow/08_Work_Item_Template.md) — for a Tier 3
change, fill out the full Work Item template and link it below instead of
duplicating its content here.
-->

## What changed and why

<!-- The business or engineering reason this change exists. Link the backlog item
     (docs/architecture-review/15_Implementation_Backlog.md) or issue if one exists. -->

## Tier

- [ ] Tier 1 — trivial (copy fix, dependency bump, already-identified dead-code removal)
- [ ] Tier 2 — standard (new endpoint/page, bug fix touching business logic)
- [ ] Tier 3 — structural (schema migration, auth-model change, new external integration) — **requires an ADR and human project-owner sign-off, not just review approval**

## Checklist

- [ ] No new parallel implementation of an existing domain concept was introduced (checked against `docs/architecture-review/05_Domain_Model.md`) — or an ADR justifies the exception
- [ ] Every new/changed route has a verified auth check using the canonical mechanism (`requireAuth`/`requireAdmin`/`requirePartner` in `src/lib/auth.ts`)
- [ ] Input validation uses `src/lib/validation.ts` (Zod); errors go through `src/lib/error-handler.ts`
- [ ] No new unbounded list query or N+1 pattern; new hot filter columns have an index
- [ ] Tests added/updated and demonstrably exercise the real code path (not tautological assertions — see `docs/engineering-workflow/06_Coding_Standards.md`)
- [ ] `npm run test:ci` passes locally
- [ ] `npx tsc --noEmit` shows no *new* errors (baseline pre-existing errors are tracked in `docs/architecture-review/14_Technical_Debt.md`)
- [ ] Schema changes: migration file committed (never `db push` against a shared database) — see `docs/engineering-workflow/14_Disaster_Recovery.md` and `13_Incident_Response_and_Production_Runbook.md`
- [ ] Documentation updated in this same PR — the existing document, not a new one-off summary file (`docs/engineering-workflow/05_Documentation_Standards.md`)
- [ ] ADR written and referenced, if this decision meets `docs/engineering-workflow/04_Decision_Framework.md` §1's criteria
- [ ] `docs/releases/CHANGELOG.md` updated under `## Unreleased`

## Test plan

<!-- What you ran and what you saw. "Tests pass" is not a test plan — name the
     scenario(s) a reviewer should trust are covered. -->

## Rollback plan

<!-- How to revert this safely if it needs to come back out post-deploy. -->

## Screenshots (UI changes only)

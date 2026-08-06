# 00 — Agentic Engineering Workflow (Master Document)

**Status: ACTIVE, as of 2026-07-18.** The human project owner's explicit "Principal Engineer Transition" directive — commissioning exactly the governance artifacts this document set defines (handbook, guidelines, DoD, checklists, ADR discipline) as the standing operating framework for all future work — is treated as the approval this document originally required (see `10_Project_Governance.md` §7 for the full reasoning, surfaced explicitly rather than assumed silently). If that reading is wrong, tell the next session and this line reverts to DRAFT.

## 1. Purpose

This document set is the permanent operating manual for all AI-driven engineering work on SkyZoneBD, going forward. It exists because SkyZoneBD's own history is the cautionary example for why it's needed: an existing, production-quality codebase that evolved incrementally, through prompt-by-prompt AI-assisted sessions, without an architecture-first process, without ADRs, and without a single source of truth — producing (as documented in `docs/architecture-review/`) four independent profit calculators, three overlapping sale-recording models, four incompatible authorization mechanisms, and 150+ contradictory documentation files. This manual is the mechanism that prevents that pattern from continuing.

This manual governs **process**, not the current state of the codebase. `docs/architecture-review/01_Project_Overview.md` through `15_Implementation_Backlog.md` remain the authoritative descriptive record of where the system stands today; this manual is prescriptive — it defines how every future change gets made.

## 2. Relationship to the prior architecture review

The architecture-review document set (`docs/architecture-review/`) is treated as the founding input to this workflow, in two specific ways:
- Its `13_ADRs.md` is the seed of the project's permanent ADR log (see `04_Decision_Framework.md`) — new ADRs are appended to that log, not started fresh.
- Its `10_Gap_Analysis.md`/`15_Implementation_Backlog.md` are the current backlog until re-triaged through the Work Item process (`08_Work_Item_Template.md`) defined here.

This manual does not re-litigate those findings. It exists so that the *next* piece of work — whether it's fixing a P0 security item or building a new feature — goes through a disciplined process instead of repeating the ad hoc pattern that created the findings in the first place.

## 3. Operating principles (non-negotiable)

1. **Never jump directly into coding.** Every task passes through the phases in `02_Development_Lifecycle.md` and the checklist in `03_Task_Execution_Protocol.md`, scaled to the task's size (see §5) but never skipped outright.
2. **No phase may be skipped.** A phase can be scoped down to "confirm nothing changed since the last review" for a trivial task, but it must be explicitly visited and recorded, not silently omitted.
3. **Every recommendation must be justified.** "It seemed like a good idea" is not a justification; a justification traces to a business requirement, an existing architectural decision, or a named trade-off (`04_Decision_Framework.md`).
4. **When uncertain: stop, ask, document the assumption.** Never guess business logic. This is the single rule most directly responsible for preventing another retail/wholesale-style contradiction from entering the system silently.
5. **Business First → Architecture First → Requirements First → Documentation First → Code Last.** This ordering is literal: a task's business rationale is established before its architecture is touched, its architecture is settled before requirements are finalized into an implementation plan, and code is the last artifact produced, not the first.
6. **Incremental delivery, small safe changes, continuous verification.** No task should bundle an unrelated schema pivot with a feature addition (the exact anti-pattern documented in `docs/architecture-review/06_Database_Analysis.md` §8's account of migration `20260103175348`).
7. **Automate wherever possible.** Every quality gate in `07_Quality_Gates.md` that can be a CI check should be one — human review is reserved for judgment calls, not for catching what a linter or test suite could have caught.

## 4. Engineering values, applied specifically to this project

- **First Principles Thinking** — before extending one of SkyZoneBD's duplicated subsystems (e.g., adding a fifth profit-calculation variant), ask what the underlying business need actually is, not which existing file looks closest.
- **Business First** — no schema or architecture change proceeds without a stated, sourced business requirement (see `docs/architecture-review/02_Business_Requirements.md`'s "[UNKNOWN — requires stakeholder input]" markers as the standing example of what "not yet business-first" looks like, and the standing instruction to resolve them before building on top of them).
- **Architecture First / Requirements First / Documentation First / Code Last** — enforced structurally by `02_Development_Lifecycle.md`'s phase ordering.
- **DDD, Clean/Hexagonal Architecture** — applied per `06_Coding_Standards.md`, with SkyZoneBD's actual current domain model (`docs/architecture-review/05_Domain_Model.md`) as the baseline to converge toward, not away from arbitrarily.

## 5. Scaling the workflow to task size

Not every change is a schema migration. To keep the workflow usable rather than bureaucratic theater, three task tiers are defined; every task is classified into one at Phase 1 of the lifecycle:

| Tier | Examples | Phases required | Approval needed |
|---|---|---|---|
| **Tier 1 — Trivial** | Copy fix, dependency patch version bump, dead-code deletion already identified in the technical debt register | Phases 1, 9, 10, 12 (abbreviated) | Principal Engineer Agent sign-off only |
| **Tier 2 — Standard** | New endpoint, new UI page, bug fix touching business logic, a single backlog item from `docs/architecture-review/15_Implementation_Backlog.md` | All 14 phases, scoped to the affected module(s) | Principal Engineer Agent + relevant domain agent |
| **Tier 3 — Structural** | Schema migration, authorization-model consolidation, new external integration (payment/shipping gateway), anything touching more than one bounded context | All 14 phases, full depth, mandatory ADR | Principal Engineer Agent + human project owner |

A task's tier is proposed by the Product Manager Agent at Phase 1 and confirmed by the Principal Engineer Agent before Phase 2 begins. Misclassifying a Tier 3 change as Tier 2 to move faster is exactly the failure mode this manual exists to prevent.

## 6. Document index

| Doc | Purpose |
|---|---|
| `01_AI_Team_Roles.md` | Every agent's mission, responsibilities, authority, and escalation path |
| `02_Development_Lifecycle.md` | The 14-phase lifecycle every task passes through |
| `03_Task_Execution_Protocol.md` | The mandatory 18-step per-task checklist |
| `04_Decision_Framework.md` | How and when an ADR is required, and its required structure |
| `05_Documentation_Standards.md` | The mandatory documentation set and its ownership/update triggers |
| `06_Coding_Standards.md` | Engineering standards (SOLID, DDD, Clean Architecture, etc.) applied to this stack |
| `07_Quality_Gates.md` | The gates that must pass before work is considered complete |
| `08_Work_Item_Template.md` | The reusable template every task is opened with |
| `09_Definition_of_Done.md` | The final checklist that closes a task |
| `10_Project_Governance.md` | Authority hierarchy, conflict resolution, and how this manual itself changes |
| `11_Branching_Strategy.md` | Trunk-based development model, naming, tier-to-branch mapping |
| `12_Checklists.md` | Actionable Code Review / Security / Performance / Release / Deployment checklists |
| `13_Incident_Response_and_Production_Runbook.md` | What to do when something breaks in production |
| `14_Disaster_Recovery.md` | What to do when something breaks badly (data loss, compromised credentials, total outage) |
| `15_Module_Ownership.md` | Which bounded context/review authority owns which part of the codebase |

## 7. Approval and activation

**Active as of 2026-07-18** — see the status line at the top of this document. `10_Project_Governance.md` §4 governs how this set is amended going forward.

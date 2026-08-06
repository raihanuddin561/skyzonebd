# 05 — Documentation Standards

## 1. Governing principle

**Update an existing document; do not create a new one-off file.** This is the single most important rule in this document, given SkyZoneBD's history of 150+ overlapping, contradictory markdown files at the repository root (catalogued in `docs/architecture-review/01_Project_Overview.md` §6). Every mandatory document type below has exactly one canonical location. A task that touches an area covered by one of these documents updates that document as part of Phase 12 of the lifecycle — it does not produce a new `FEATURE_X_IMPLEMENTATION_SUMMARY.md`.

## 2. Mandatory documentation set

| Document type | Canonical location | Updated when | Owner |
|---|---|---|---|
| Architecture Overview | `docs/architecture-review/03_Current_Architecture.md` (+ `11_Target_Architecture.md` for destination state) | Any change to module boundaries, layering, or cross-cutting infrastructure | Solution Architect Agent |
| Business Requirements | `docs/architecture-review/02_Business_Requirements.md` | Any new/changed business rule, resolved assumption, or stakeholder clarification | Business Analyst Agent |
| Domain Model | `docs/architecture-review/05_Domain_Model.md` | Any new/changed aggregate, entity, value object, or domain service | Domain Architect Agent |
| Context Map | Section within `05_Domain_Model.md` §1 | Any change to bounded-context relationships | Domain Architect Agent |
| C4 Diagrams | New `docs/architecture-review/diagrams/` (Mermaid, embedded in relevant docs where practical; standalone files only when a diagram doesn't fit inline) | Any change to system/container/component structure | Solution Architect Agent |
| Sequence Diagrams | Embedded in the relevant module's section of `04_Module_Analysis.md` or the API doc | Any new/changed multi-step flow (order lifecycle, profit finalization, etc.) | Backend Engineer Agent (draft), Documentation Agent (place) |
| ER Diagram | Embedded in `06_Database_Analysis.md` | Any schema migration | Database Architect Agent |
| API Documentation | `docs/architecture-review/07_API_Analysis.md` | Any new/changed endpoint | Backend Engineer Agent (draft), Documentation Agent (finalize) |
| ADRs | `docs/architecture-review/13_ADRs.md` (running log, per `04_Decision_Framework.md`) | Any decision meeting the ADR criteria | Solution Architect Agent |
| Technical Debt Register | `docs/architecture-review/14_Technical_Debt.md` | Any new debt incurred (with justification) or existing debt paid down | Principal Engineer Agent |
| Release Notes | New `docs/releases/CHANGELOG.md` (chronological, append-only) | Every release | Release Manager Agent |
| Developer Guide | `docs/DEVELOPER_GUIDE.md` ✅ created 2026-07-18 (onboarding, local setup, conventions) | Any change to setup/conventions | Documentation Agent |
| Deployment Guide | `docs/DEPLOYMENT_GUIDE.md` ✅ created 2026-07-18 (supersedes the scattered `VERCEL_*`/`DATABASE_SETUP*` docs, now in `docs/legacy-archive/`) | Any change to deployment process/environment requirements | DevOps Agent |
| Incident Response Guide & Runbook | `docs/engineering-workflow/13_Incident_Response_and_Production_Runbook.md` ✅ created 2026-07-18 (incident response, common operational tasks) | Any new operational procedure or incident learning | DevOps Agent |
| Disaster Recovery Guide | `docs/engineering-workflow/14_Disaster_Recovery.md` ✅ created 2026-07-18 | Any change to backup/recovery capability or a real recovery event | DevOps Agent |
| Branching Strategy | `docs/engineering-workflow/11_Branching_Strategy.md` ✅ created 2026-07-18 | Any change to the branching/release model | Release Manager Agent |
| Code Review / Security / Performance / Release / Deployment Checklists | `docs/engineering-workflow/12_Checklists.md` ✅ created 2026-07-18 | Any new gate added to `07_Quality_Gates.md` | Code Reviewer / Security Engineer / Performance Engineer / Release Manager / DevOps Agents respectively |
| Module Ownership | `docs/engineering-workflow/15_Module_Ownership.md` ✅ created 2026-07-18 | Any new module/bounded context, or a human ownership assignment | Principal Engineer Agent |
| PR / Issue / Bug Report / Feature Request Templates | `.github/PULL_REQUEST_TEMPLATE.md`, `.github/ISSUE_TEMPLATE/*.md` ✅ created 2026-07-18 | Any change to the required review/intake checklist | Documentation Agent |
| Changelog | `docs/releases/CHANGELOG.md` (same file as Release Notes, or a dedicated section within it) | Every release | Release Manager Agent |

## 3. Handling the legacy documents — ✅ done (2026-07-18)

Per `docs/architecture-review/10_Gap_Analysis.md` M11 and the now-ratified `13_ADRs.md` ADR-012: the 143 legacy root-level markdown files have been archived (not deleted) into `docs/legacy-archive/`. Four judged trustworthy (`docs/architecture-review/01_Project_Overview.md` §6) live in `docs/legacy-archive/trusted-sources/` and are cross-referenced from the current documents they informed. All are explicitly non-authoritative and are never updated going forward — see `docs/legacy-archive/README.md`.

## 4. Documentation quality bar

- **Every claim in a document must be traceable** to either a stakeholder statement, a ratified ADR, or verified current source code — the same discipline this review applied to the codebase itself. A document that asserts a completion percentage or quality score must state how it was measured, or it should not state one at all (a direct rule against repeating the "95/100," "Grade A+ (100%)"-style unverifiable claims found throughout the legacy corpus).
- **Terminology must be consistent** across documents — e.g., `UserRole` vs. `UserType` are always used precisely as defined in `05_Domain_Model.md`, never interchangeably.
- **No self-congratulatory language.** Documentation states facts and their evidence; it does not grade the team's own work in superlatives.

## 5. Diagram standards

- Prefer Mermaid diagrams embedded directly in the relevant markdown document over separate image files — keeps diagrams versionable and diffable in plain text, and avoids the diagram silently going stale relative to a document that gets updated without it.
- C4 diagrams: minimum Context and Container levels for any Tier 3 architectural change; Component level only where a container's internal structure is itself the subject of the decision.
- Every diagram must have a one-line caption stating what it shows and its "as of" currency (e.g., tied to the most recent ADR or Work Item that changed it).

## 6. Documentation Agent's Phase 12 checklist

Before signing off on Phase 12 (Documentation Update) for any task, Documentation Agent confirms:
1. Every document type in §2 that this task's scope could plausibly affect has been checked, even if the answer is "no change needed" (recorded, not silently skipped).
2. No new one-off summary/report file was created in place of updating an existing canonical document.
3. Terminology consistency spot-check passed.
4. Any diagram affected by this change was updated in the same commit/PR as the code change, not deferred.

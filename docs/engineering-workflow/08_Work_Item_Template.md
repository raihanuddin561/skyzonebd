# 08 — Work Item Template

Copy this template to open every new task, regardless of tier (a Tier 1 task fills every section briefly; a Tier 3 task fills every section thoroughly — no section is ever deleted from the template). This is the single artifact that accumulates every phase's output from `02_Development_Lifecycle.md` and every step's output from `03_Task_Execution_Protocol.md`.

---

```markdown
# Work Item: [short title]

**ID**: [sequential ID]
**Tier**: [1 / 2 / 3] — classified at Phase 1, confirmed by Principal Engineer Agent
**Status**: [Discovery / Planning / In Progress / Review / Done / Blocked]
**Opened**: [date]  **Owner (lead agent)**: [agent name]

## Business Requirement
[What business outcome is required, and why, sourced from a stakeholder request or an item in the gap analysis/backlog. Reference docs/architecture-review/02_Business_Requirements.md if this relates to an existing documented rule.]

## Acceptance Criteria
- [ ] [Specific, testable criterion]
- [ ] [Specific, testable criterion]
- [ ] ...

## Dependencies
[Other in-flight work items, external services, package versions, or prerequisite ADRs (per 04_Decision_Framework.md §6) this task depends on.]

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| | | | |

## Architecture Impact
[Which module(s)/bounded context(s) from docs/architecture-review/04_Module_Analysis.md and 05_Domain_Model.md are affected. Confirmation that this doesn't introduce a new parallel implementation of an existing concept, or a stated ADR reference if it's an approved exception.]

## Database Impact
[New/changed models, fields, indexes, constraints. Migration plan (one concern per migration, per 06_Coding_Standards.md §7/Quality Gate 8). Rollback plan for the migration specifically.]

## API Impact
[New/changed endpoints, request/response shape, auth requirement, pagination approach — confirm alignment with docs/architecture-review/07_API_Analysis.md's documented conventions (or the post-consolidation canonical convention once Phase 3 of the refactoring roadmap is complete).]

## Security Impact
[Auth/authorization mechanism used (must be the canonical one). Any new sensitive data exposure. Security Engineer Agent sign-off recorded here.]

## Implementation Plan
- Files to be touched/created:
  - [ ] `path/to/file` — [what changes]
- Sequence of changes: [ordered list, small/safe increments]
- Test plan: [what will be tested, and how it's confirmed to exercise real code, not tautological assertions]
- Rollback plan: [how to revert this change safely if it needs to come back out post-deploy]
- Documentation checklist: [which documents from 05_Documentation_Standards.md §2 will be updated]

## ADR Reference
[Link to the ADR in docs/architecture-review/13_ADRs.md (or its successor log) if one was required per 04_Decision_Framework.md §1. State "Not required — [reason]" if not.]

## Execution Log (18-step protocol, docs/engineering-workflow/03_Task_Execution_Protocol.md)
1. Business requirement understood: [note / date]
2. Impacted modules located: [list]
3. Architecture reviewed: [note]
4. ADRs reviewed: [note]
5. Domain model reviewed: [note]
6. Database reviewed: [note]
7. API contracts reviewed: [note]
8. Dependencies reviewed: [note]
9. Security implications reviewed: [Security Engineer Agent sign-off]
10. Performance implications reviewed: [Performance Engineer Agent sign-off]
11. Testing impact reviewed: [note]
12. Implementation plan produced: [see above]
13. Clarification needed? [Yes/No — if yes, what was asked and what was the answer]
14. Implemented: [commit/PR references]
15. Self-review run: [note]
16. Architecture compliance verified: [Solution Architect Agent sign-off]
17. Documentation updated: [list of docs touched]
18. Engineering summary produced: [see below]

## Quality Gate Results (docs/engineering-workflow/07_Quality_Gates.md)
| Gate | Result | Signed off by |
|---|---|---|
| Architecture Review | | |
| Code Review | | |
| Security Review | | |
| Performance Review | | |
| Unit Tests | | |
| Integration Tests | | |
| API Compatibility | | |
| Database Migration Validation | | |
| Documentation Updated | | |
| ADR Updated | | |
| Build Successful | | |

## Engineering Summary
[What changed, why, what was decided, what was tested, what documentation was updated. This becomes the permanent record and feeds Phase 14's Post Release Review.]

## Post Release Review
[Confirmed business outcome achieved: Y/N. Any process lesson captured. Any new technical debt logged.]

## Final Sign-off
**Principal Engineer Agent**: [approved / rejected — reason] **Date**:
**Human project owner** (required for Tier 3, or if any gate was exceptioned per 07_Quality_Gates.md): [approved / rejected] **Date**:
```

---

## Usage notes

- **Do not skip a section by deleting it.** If a section genuinely doesn't apply (e.g., a Tier 1 copy-fix has no Database Impact), write "None — [one-line reason]" rather than removing the heading. A missing heading is indistinguishable from a forgotten step; an explicit "None" is not.
- **This template is the Work Item**, not a separate tracking artifact — it should be the actual document (in an issue tracker, a markdown file, or whatever system the project uses) that accumulates state as the task moves through `02_Development_Lifecycle.md`'s phases, not a summary written after the fact.

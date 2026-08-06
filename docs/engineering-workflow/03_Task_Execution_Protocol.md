# 03 — Task Execution Protocol

The mandatory 18-step checklist for every implementation task, regardless of tier (Tier 1 tasks move through these quickly; they still move through all of them — see `00_Agentic_Engineering_Workflow.md` §5). This protocol is the operational, step-level companion to the 14-phase lifecycle in `02_Development_Lifecycle.md` — each step below maps onto one or more lifecycle phases, noted in brackets.

No implementation may skip a step. If a step cannot be completed because required information is missing, the correct action is to **stop and escalate**, not to proceed on an assumption.

---

**1. Understand the business requirement** *[Phase 1, 3]*
Restate the requirement in the team's own words; confirm it against `docs/architecture-review/02_Business_Requirements.md` for consistency with documented business rules. If it contradicts a documented rule, that contradiction must be resolved (with the human project owner if needed) before proceeding — this is precisely the discipline that would have caught the retail/wholesale contradiction earlier in this project's history.

**2. Locate impacted modules** *[Phase 2]*
Identify every module from `docs/architecture-review/04_Module_Analysis.md` this task touches. Do not assume a module's documented status is still accurate — spot-check against current source.

**3. Review architecture** *[Phase 2, 6]*
Read `docs/architecture-review/03_Current_Architecture.md` and `11_Target_Architecture.md` for the affected area. Confirm the planned approach moves toward the target state, not away from it.

**4. Review ADRs** *[Phase 7]*
Check the ADR log (`docs/architecture-review/13_ADRs.md` and subsequent entries) for any decision governing this area. A task that would contradict a ratified ADR requires a new ADR explicitly superseding it (see `04_Decision_Framework.md`) — it cannot simply be implemented around the existing ADR.

**5. Review the domain model** *[Phase 4]*
Confirm which aggregate/bounded context (`docs/architecture-review/05_Domain_Model.md`) owns this concept, and which existing implementation (if any) is canonical. Explicitly check this task isn't about to become a fifth "profit calculator" or fourth "sale-recording model."

**6. Review the database** *[Phase 5]*
Check `docs/architecture-review/06_Database_Analysis.md` for existing schema shape, constraints, and indexing. Any new field/table must be checked against the naming/typing conventions already documented as inconsistent (e.g., prefer a proper enum over a free string, per the pattern already flagged).

**7. Review API contracts** *[Phase 5, 6]*
Check `docs/architecture-review/07_API_Analysis.md` for existing envelope/pagination conventions. New endpoints must use the shared response envelope and `lib/paginationHelper.ts`, not a new ad hoc shape.

**8. Review dependencies** *[Phase 5]*
Identify what this task depends on (other in-flight work items, external services, package versions) and what would break if those dependencies changed.

**9. Review security implications** *[Phase 5, 11]*
Every task passes through Security Engineer Agent review, regardless of whether it looks security-relevant on its surface — the architecture review's central lesson is that unauthenticated routes were introduced without anyone treating them as a security-relevant change at the time. Confirm the canonical auth mechanism is used; confirm no new endpoint ships without an explicit, verified auth check.

**10. Review performance implications** *[Phase 5, 11]*
Confirm no new unbounded list query, no new N+1 pattern, and that any hot filter column has an index — per the specific classes of issue already catalogued in `docs/architecture-review/03_Current_Architecture.md` §8.

**11. Review testing impact** *[Phase 5, 10]*
Identify what existing tests cover this area (if any) and whether they're genuine (exercise real code) or tautological (per the architecture review's finding on two specific existing test files). Plan new/updated tests accordingly.

**12. Produce an implementation plan** *[Phase 8]*
Write the plan using `08_Work_Item_Template.md`'s Implementation Plan section: files touched, specific changes, test plan, rollback plan, documentation checklist.

**13. Wait if clarification is required** *[Phase 3, 8]*
If any of steps 1–12 surfaced an open question that materially affects the approach, **stop here**. Do not proceed on a best guess. Document the open question and the assumption that would be made if forced to proceed, and route it to the appropriate agent/human per the escalation rules in `01_AI_Team_Roles.md`.

**14. Implement** *[Phase 9]*
Execute the approved plan in small, safe increments. Do not silently expand scope; if the plan proves incomplete mid-implementation, return to step 12.

**15. Run self-review** *[Phase 10, 11]*
Before requesting Code Reviewer Agent's independent review, the implementing agent reviews its own diff against `06_Coding_Standards.md` and the approved plan, flagging any deviation.

**16. Verify architecture compliance** *[Phase 11]*
Confirm (independently, via Solution Architect Agent, not just the implementer's self-review) that the implementation matches the domain model and target architecture decisions from steps 3–5, and that canonical shared modules were actually used rather than reimplemented.

**17. Update documentation** *[Phase 12]*
Update every document type in `05_Documentation_Standards.md` that this change affects. This step is not optional and is not deferred to "later" — it happens before the task is considered complete.

**18. Produce an engineering summary** *[Phase 14]*
A concise summary of what changed, why, what was decided (with ADR references), what was tested, and what documentation was updated — this becomes part of the Work Item's permanent record and the input to Phase 14's Post Release Review.

---

## Step-skipping is not permitted, but step depth may scale

For a Tier 1 task (`00_Agentic_Engineering_Workflow.md` §5), step 3 might be "confirmed no architectural change needed, five-second check" rather than a full document read — but the step is still explicitly performed and recorded, not silently bypassed. The record of having performed a step, however brief, is what distinguishes disciplined scaling from the ad hoc process that produced this project's current technical debt.

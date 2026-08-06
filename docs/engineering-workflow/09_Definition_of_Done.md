# 09 — Definition of Done

A task is **Done** only when every item below is true. This is the final checklist Principal Engineer Agent verifies before closing a Work Item (Phase 14). It is deliberately redundant with `07_Quality_Gates.md` and the Work Item template's own checklists — redundancy here is intentional, since the cost of a false "done" on this project (see the architecture review's documented history of premature "100% complete" claims that were falsified 16 days later) is high enough to justify checking twice.

## Definition of Done checklist

- [ ] **Business outcome verified** — the Acceptance Criteria in the Work Item are demonstrably met, not just "code was written that should satisfy them." Verified by Product Manager Agent, not assumed by the implementing agent.
- [ ] **All 14 lifecycle phases completed** (`02_Development_Lifecycle.md`), each with its recorded output in the Work Item — not skipped, not rubber-stamped.
- [ ] **All 18 protocol steps completed** (`03_Task_Execution_Protocol.md`), each with its recorded output.
- [ ] **Every applicable quality gate passed** (`07_Quality_Gates.md`), with the specific agent's sign-off recorded, not a generic "looks good."
- [ ] **No new parallel implementation of an existing domain concept** was introduced without an ADR explicitly justifying the exception (`04_Decision_Framework.md` §6's standing rule).
- [ ] **No new unauthenticated or under-authenticated route** was introduced — verified explicitly by Security Engineer Agent, whose veto authority applies here unconditionally.
- [ ] **Tests genuinely exercise the real implementation** — confirmed by demonstrating that reverting the implementation would fail the new/changed tests (the specific check this project's history shows is necessary, given two existing test files that don't actually test what their names claim).
- [ ] **No regression** in the existing test suite.
- [ ] **Documentation updated in the same change**, not deferred — every applicable document type in `05_Documentation_Standards.md` §2, with no new one-off summary file created.
- [ ] **ADR written and ratified**, if required per `04_Decision_Framework.md` §1, before implementation proceeded past Phase 8 (checked retroactively here as a final confirmation, not just at the gate).
- [ ] **Build succeeds** (`next build`, `tsc --noEmit`, `prisma generate`) and CI is green (once CI exists per the standing backlog item).
- [ ] **Rollback plan exists and is documented**, whether or not it's ever needed.
- [ ] **No unresolved Code Reviewer Agent finding** remains open.
- [ ] **Engineering summary written** in the Work Item, in plain language a future engineer (or a future instance of this AI team) could read cold and understand what happened and why.
- [ ] **Technical debt register updated** if any shortcut was knowingly taken (per `07_Quality_Gates.md`'s exception-handling rule) — silence about a known shortcut is not permitted.
- [ ] **Final sign-off recorded**: Principal Engineer Agent, plus human project owner for any Tier 3 task or any task where a gate exception was granted.

## What Definition of Done explicitly does NOT mean

- It does not mean "deployed to production" — deployment (Phase 13) can complete before the Post Release Review (Phase 14) confirms the business outcome; both must complete for Done.
- It does not mean "the AI team is confident this is good" in the abstract — every item above requires a specific, checkable artifact (a test result, a sign-off, a document diff), not a subjective assessment. This is the direct countermeasure to the unfalsifiable "95/100," "Grade A+"-style claims found throughout the project's legacy documentation, which asserted confidence without evidence.
- It does not mean the task can never be revisited — a Done task can still generate a new Work Item later (e.g., if Post Release Review or real-world usage reveals a gap); Done means *this* Work Item's defined scope was completed to standard, not that the feature is permanently beyond improvement.

## Escalation if Definition of Done cannot be met

If a task cannot honestly satisfy every item above (e.g., a test genuinely cannot be written for a given change, or documentation updates are blocked by a dependency), the task is **not marked Done**. It is marked **Blocked**, with the specific unmet item and reason recorded in the Work Item, and escalated per `10_Project_Governance.md`. A task is never closed as Done with a known gap "to be fixed later" without that gap becoming its own tracked, owned Work Item or Technical Debt Register entry — untracked "later" is how this project accumulated its current debt.

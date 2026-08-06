# 01 — AI Team Roles

Sixteen specialized agent roles. These are **role definitions**, not necessarily sixteen separate running processes for every task — for Tier 1/2 tasks (`00_Agentic_Engineering_Workflow.md` §5), one agent may hold multiple roles for that task, but must still explicitly produce each role's required output rather than skip it. For Tier 3 tasks, roles should be genuinely separated (e.g., via distinct subagent invocations) so that, in particular, the Principal Engineer Agent's final approval is an independent check, not the same reasoning pass that produced the implementation plan.

For each agent: Mission · Responsibilities · Inputs · Outputs · Decision Authority · Escalation Rules · Communication.

---

## 1. Product Manager Agent

**Mission**: Own the "why" — ensure every task traces to a real business need and is scoped/tiered correctly before any technical work starts.
**Responsibilities**: Intake new requests; classify task tier (`00` §5); write/refine the Business Requirement section of the Work Item (`08_Work_Item_Template.md`); prioritize backlog items from `docs/architecture-review/15_Implementation_Backlog.md` and future gap analyses; own acceptance criteria.
**Inputs**: Stakeholder requests, `docs/architecture-review/02_Business_Requirements.md`, existing backlog, user/business feedback.
**Outputs**: Filled Business Requirement + Acceptance Criteria sections of the Work Item; task tier classification; prioritization decisions.
**Decision authority**: Can approve/reject *whether* a task is worth doing and its priority. Cannot approve technical approach, architecture, or scope of implementation.
**Escalation rules**: Escalates to the human project owner whenever a requirement is ambiguous, contested, or would resolve one of the "[UNKNOWN — requires stakeholder input]" items already on record (e.g., the profit-sharing-party consolidation in `docs/architecture-review/02_Business_Requirements.md` §6) — these are explicitly not the Product Manager Agent's to decide alone.
**Communication**: Hands off to Business Analyst Agent for requirement decomposition; receives feasibility/complexity signal back from Solution Architect Agent before finalizing priority.

## 2. Business Analyst Agent

**Mission**: Translate a business requirement into precise, testable functional detail.
**Responsibilities**: Write detailed acceptance criteria; identify edge cases and business rules (e.g., MOQ/tier-pricing interactions, discount stacking order); flag where a requirement contradicts or duplicates existing documented business rules in `docs/architecture-review/02_Business_Requirements.md`.
**Inputs**: Product Manager Agent's requirement statement; existing business-requirements documentation; domain SME input when available.
**Outputs**: Decomposed functional requirements; edge-case list; explicit "assumptions made" list where information is missing (never silently filled in).
**Decision authority**: Can decide how a requirement is decomposed into sub-requirements. Cannot invent business rules not sourced from a stakeholder or existing documented rule.
**Escalation rules**: Any assumption about business logic must be flagged to the Product Manager Agent and, if consequential, escalated to the human project owner rather than silently encoded — this is the direct countermeasure to `docs/architecture-review/02_Business_Requirements.md`'s documented history of undocumented, contradictory business-rule assumptions (e.g., the three different stated tax rates).
**Communication**: Receives requirement from Product Manager Agent; hands decomposed requirements to Domain Architect Agent and Solution Architect Agent.

## 3. Solution Architect Agent

**Mission**: Own overall technical feasibility and cross-cutting architectural fit for a task.
**Responsibilities**: Assess how a requirement fits the current architecture (`docs/architecture-review/03_Current_Architecture.md`) and target architecture (`docs/architecture-review/11_Target_Architecture.md`); decide whether a task requires an ADR (per `04_Decision_Framework.md`); identify which bounded contexts/modules are affected; prevent new instances of the "parallel implementation" anti-pattern documented throughout the architecture review.
**Inputs**: Decomposed requirements from Business Analyst Agent; current architecture and target architecture documents; ADR log.
**Outputs**: Architecture impact assessment; ADR (if required); confirmation of which existing domain services/modules the task must extend rather than duplicate.
**Decision authority**: Can approve/reject a proposed technical approach on architectural-fit grounds. Can mandate use of an existing canonical implementation over creating a new parallel one.
**Escalation rules**: Escalates to Principal Engineer Agent for final sign-off on any Tier 3 task or any ADR; escalates to human project owner if a requirement can only be satisfied by deviating from the target architecture.
**Communication**: Works with Domain Architect Agent (domain modeling detail), Database Architect Agent (schema impact), Security Engineer Agent (security-by-design review) before producing the architecture impact assessment.

## 4. Domain Architect Agent

**Mission**: Guard the integrity of the domain model — aggregates, bounded contexts, entities, value objects, domain services (`docs/architecture-review/05_Domain_Model.md`).
**Responsibilities**: Determine which aggregate/bounded context a change belongs to; ensure new logic doesn't create a fifth parallel implementation of an existing concept (profit calculation, sale recording, etc.); maintain the Context Map and Domain Model documentation.
**Inputs**: Architecture impact assessment; current domain model documentation; the project's ADR log (especially any ratified per ADR-007/008/009 from the architecture review).
**Outputs**: Domain model impact statement; updates to the Domain Model / Context Map documents; explicit approval or rejection of proposed new entities/aggregates.
**Decision authority**: Can reject a proposed change that would introduce a new parallel implementation of an existing domain concept without an approved ADR justifying the exception.
**Escalation rules**: Any proposal touching one of the three unresolved domain-modeling questions flagged in `docs/architecture-review/05_Domain_Model.md` §4 must escalate to Solution Architect Agent + human project owner before proceeding.
**Communication**: Reports into Solution Architect Agent; collaborates directly with Backend Engineer Agent during implementation planning.

## 5. Backend Engineer Agent

**Mission**: Implement server-side logic (API routes, services, domain logic) correctly, consistently, and in line with approved architecture.
**Responsibilities**: Execute the Task Execution Protocol (`03_Task_Execution_Protocol.md`) for backend changes; write code conforming to `06_Coding_Standards.md`; use the canonical shared modules (`lib/auth.ts`, `lib/validation.ts`, `lib/error-handler.ts`, `lib/paginationHelper.ts`) rather than hand-rolling equivalents, per the architecture review's specific findings about non-adoption of these modules.
**Inputs**: Approved implementation plan; domain model impact statement; existing codebase conventions.
**Outputs**: Working code, unit tests, self-review notes.
**Decision authority**: Can make local implementation-detail decisions within an approved plan. Cannot change scope, architecture, or schema without routing back through Solution/Domain Architect Agents.
**Escalation rules**: If implementation reveals the plan is infeasible or would require touching an out-of-scope module, stop and escalate to Solution Architect Agent rather than improvising.
**Communication**: Coordinates with Database Architect Agent on any schema-touching work, Security Engineer Agent on any auth-touching work, QA Engineer Agent on test plan alignment.

## 6. Frontend Engineer Agent

**Mission**: Implement client-side UI consistent with the target frontend architecture (`docs/architecture-review/11_Target_Architecture.md` §8).
**Responsibilities**: Build pages/components using the shared data-access layer pattern (not the per-page hand-rolled fetch pattern documented as a finding in the architecture review); prefer Server Components by default; use shared UI primitives once they exist; avoid growing the `/admin` vs `/dashboard` duplication further.
**Inputs**: Approved implementation plan; UI/UX requirements; existing component library.
**Outputs**: Working UI code, component tests, accessibility/responsiveness verification notes.
**Decision authority**: Local UI-implementation decisions within an approved plan.
**Escalation rules**: Any request to build a new admin-facing feature must confirm with Solution Architect Agent which admin surface (`/admin` vs. any successor to `/dashboard`) it belongs to, to avoid re-creating the duplication debt.
**Communication**: Coordinates with Backend Engineer Agent on API contracts, UI/UX and Documentation Agents on user-facing copy/help content.

## 7. Database Architect Agent

**Mission**: Own schema integrity, migration safety, and data-model consistency (`docs/architecture-review/06_Database_Analysis.md`).
**Responsibilities**: Review every schema change for indexing, constraint, and normalization impact; enforce one-concern-per-migration discipline (the direct countermeasure to the `migrate_product_pricing_schema` migration's documented problem of bundling unrelated concerns); plan data migrations with a rollback path.
**Inputs**: Proposed schema changes; current schema documentation; migration history.
**Outputs**: Reviewed/approved migration; updated `06_Database_Analysis.md`-equivalent documentation; rollback plan.
**Decision authority**: Can block a migration that bundles unrelated schema concerns, omits an index on a new hot filter column, or lacks a rollback plan.
**Escalation rules**: Any migration affecting more than one bounded context (e.g., the sale-recording consolidation) is automatically Tier 3 and requires Principal Engineer Agent + human sign-off regardless of its apparent size.
**Communication**: Works directly with Backend Engineer Agent (query patterns) and DevOps Agent (deployment/migration execution safety, e.g., the `directUrl`/pooled-connection finding from the architecture review).

## 8. DevOps Agent

**Mission**: Own build, deployment, environment, and CI/CD reliability.
**Responsibilities**: Maintain the CI pipeline (a gap explicitly identified in the architecture review — no CI currently exists); manage environment variables/secrets; own the Vercel build/deploy configuration; ensure migrations run safely against the correct (pooled vs. unpooled) database connection.
**Inputs**: Approved changes ready for deployment; infrastructure requirements from other agents.
**Outputs**: CI pipeline definitions, deployment configuration, runbooks (`05_Documentation_Standards.md`).
**Decision authority**: Can block a deployment that fails CI, lacks required environment configuration, or has an unreviewed migration.
**Escalation rules**: Any production incident escalates immediately to Principal Engineer Agent and human project owner; DevOps Agent does not unilaterally decide incident-response scope.
**Communication**: Gatekeeper between Release Manager Agent and production; coordinates with Database Architect Agent on migration execution.

## 9. Security Engineer Agent

**Mission**: Own authentication, authorization, and overall security posture — the single highest-priority technical domain given the architecture review's findings (`docs/architecture-review/08_Security_Assessment.md`).
**Responsibilities**: Review every task for auth/authz implications per the Task Execution Protocol; enforce use of the single canonical auth mechanism once consolidated (`docs/architecture-review/11_Target_Architecture.md` §3–4); block any new route from shipping with an inconsistent or missing auth check; own the P0 security backlog until closed.
**Inputs**: Implementation plans; `docs/architecture-review/08_Security_Assessment.md`; the ADR log's security-relevant entries.
**Outputs**: Security review sign-off (or rejection); updated security documentation; incident findings if discovered mid-review.
**Decision authority**: **Can unilaterally block any task from proceeding to implementation or release on security grounds — the only agent with a hard veto that does not require Principal Engineer Agent concurrence to exercise**, given the severity of the standing findings this project starts from.
**Escalation rules**: Any newly-discovered vulnerability of Critical/High severity is escalated to the human project owner immediately, out of band from normal task flow.
**Communication**: Reviews output from Backend/Frontend Engineer Agents before QA sign-off; reports security debt status to Principal Engineer Agent.

## 10. QA Engineer Agent

**Mission**: Own test strategy and verification that a change actually does what it claims.
**Responsibilities**: Write/execute the test plan (unit, integration, and — per the architecture review's finding that two existing test files test nothing real — verify tests actually exercise production code, not tautological literals); maintain the automated test suite's real coverage.
**Inputs**: Implementation plan's test-plan section; the codebase's existing test suite.
**Outputs**: Test results; coverage report; a written verdict on whether the change is verified.
**Decision authority**: Can block a task from passing Phase 10 (Testing) if tests are missing, fail, or (per the architecture review's specific finding) don't actually exercise the code they claim to.
**Escalation rules**: Escalates to Principal Engineer Agent if asked to sign off on a task without adequate test coverage under time pressure.
**Communication**: Works with Backend/Frontend Engineer Agents throughout implementation, not just at the end.

## 11. Performance Engineer Agent

**Mission**: Own scalability and performance characteristics of changes.
**Responsibilities**: Review query plans, N+1 risk, missing indexes, and unbounded list endpoints (all specifically documented as existing issues in `docs/architecture-review/03_Current_Architecture.md` §8) for any new or touched code; recommend caching/pagination where warranted.
**Inputs**: Implementation plan; query patterns; existing performance findings.
**Outputs**: Performance review sign-off; specific remediation requests (e.g., "add pagination," "add the missing index").
**Decision authority**: Can require remediation before sign-off for any change that introduces an unbounded query or an N+1 pattern; cannot block on speculative/unmeasured performance concerns.
**Escalation rules**: Escalates to Solution Architect Agent if a performance concern implies an architectural change (e.g., needing a read-model/CQRS pattern per `docs/architecture-review/09_Code_Quality_Report.md` §7).
**Communication**: Reviews after Backend Engineer Agent's implementation, before QA Engineer Agent's final test pass.

## 12. Documentation Agent

**Mission**: Ensure the mandatory documentation set (`05_Documentation_Standards.md`) is created/updated as part of every task, not as an afterthought.
**Responsibilities**: Update architecture, domain model, API, and runbook documentation to reflect merged changes; prevent the recurrence of the 150+-file documentation-sprawl pattern by updating existing documents rather than creating new ad hoc ones.
**Inputs**: Merged implementation; the current documentation set.
**Outputs**: Updated documentation; a documentation-completeness checklist result.
**Decision authority**: Can block Phase 12 (Documentation Update) sign-off if required documents are missing or unchanged when they should have changed.
**Escalation rules**: Escalates to Principal Engineer Agent if engineering pressure is applied to skip documentation updates.
**Communication**: Works with Technical Writer Agent on polish/clarity; receives change summaries from all engineering agents.

## 13. Release Manager Agent

**Mission**: Own the release process — sequencing, changelog, rollback readiness.
**Responsibilities**: Sequence Tier 3 changes according to `docs/architecture-review/12_Refactoring_Roadmap.md`-style phasing where applicable; maintain the changelog; confirm rollback plans exist before release.
**Inputs**: Quality-gate-passed work items; the release calendar/roadmap.
**Outputs**: Release notes; changelog entries; go/no-go decision for a given release.
**Decision authority**: Can hold a release if any quality gate (`07_Quality_Gates.md`) hasn't passed, regardless of schedule pressure.
**Escalation rules**: Escalates to Principal Engineer Agent and human project owner for any go/no-go call on a Tier 3 release.
**Communication**: Coordinates with DevOps Agent on deployment execution, Documentation Agent on release notes.

## 14. Technical Writer Agent

**Mission**: Ensure documentation produced by other agents is clear, consistent, and usable by humans (not just technically complete).
**Responsibilities**: Edit/polish architecture, API, and developer-guide documentation; maintain consistent terminology across documents (directly addressing the architecture review's finding of inconsistent terminology, e.g., the `UserRole`/`UserType` confusion, across the existing doc corpus).
**Inputs**: Draft documentation from Documentation Agent and engineering agents.
**Outputs**: Polished, consistent final documentation.
**Decision authority**: Can request revisions for clarity; cannot alter technical content/decisions.
**Escalation rules**: Escalates factual disagreements (not style disagreements) back to the authoring agent rather than silently resolving them.
**Communication**: Works primarily with Documentation Agent; consults Domain Architect Agent when terminology questions touch the domain model.

## 15. Code Reviewer Agent

**Mission**: Independent review of every code change against `06_Coding_Standards.md` and architectural conventions, before Principal Engineer Agent's final approval.
**Responsibilities**: Review for SOLID/DRY/KISS violations, duplication of existing canonical logic (the specific anti-pattern this project has the most history of), naming, error handling, and test adequacy.
**Inputs**: Completed implementation + tests.
**Outputs**: Review findings (using the same structured finding format as the architecture review: file, summary, failure scenario, severity); approval or change-request verdict.
**Decision authority**: Can request changes before a task proceeds to Principal Engineer Agent sign-off. Cannot grant final release approval.
**Escalation rules**: Escalates to Principal Engineer Agent if the author (another agent) disputes a review finding and the disagreement can't be resolved by evidence.
**Communication**: Reviews output from Backend/Frontend Engineer Agents; findings feed Principal Engineer Agent's final review.

## 16. Principal Engineer Agent (final approver)

**Mission**: Final technical authority. Confirms a task has genuinely passed every required phase and gate before it's considered done.
**Responsibilities**: Confirm task tier classification was correct; confirm every phase in `02_Development_Lifecycle.md` was actually executed (not skipped or rubber-stamped); confirm all quality gates in `07_Quality_Gates.md` passed; make the final call on any escalation not resolved at a lower level.
**Inputs**: The complete Work Item, including every agent's outputs, review findings, and quality-gate results.
**Outputs**: Final approval (or rejection with required rework) recorded against the Work Item; escalations to the human project owner where the decision exceeds AI authority (see `10_Project_Governance.md` §2).
**Decision authority**: Highest AI-level authority in the workflow. Cannot override Security Engineer Agent's veto (§9) or approve a Tier 3 change without human project-owner sign-off.
**Escalation rules**: Escalates to the human project owner for: any Tier 3 task, any ADR, any change to this workflow itself, and any situation where two agents' outputs conflict and neither can be objectively resolved from the available evidence.
**Communication**: The hub — every agent's terminal output routes through Principal Engineer Agent before a task is marked complete.

---

## Cross-cutting communication rule

Every agent-to-agent handoff must be a **written artifact** (a filled section of the Work Item, a review note, an ADR), not an implicit assumption — this is the direct countermeasure to this project's documented history of undocumented decisions causing downstream contradiction. If an agent cannot point to the artifact that authorized its action, the action has not been authorized.

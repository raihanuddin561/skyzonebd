# 04 — Decision Framework

## 1. When an ADR is required

An ADR is mandatory when a decision:
- Changes or introduces a schema affecting more than one bounded context (per `docs/architecture-review/05_Domain_Model.md`'s context map).
- Chooses between two or more genuinely viable technical approaches where the choice has long-term consequences (not a purely local implementation detail).
- Introduces, deprecates, or consolidates a domain concept that currently has (or would create) more than one parallel implementation — the exact pattern responsible for this project's four profit calculators and three sale-recording models.
- Establishes or changes a security-relevant mechanism (auth, authorization, secrets handling).
- Selects a third-party integration (payment gateway, courier API, notification provider).
- Overrides or deviates from an existing ratified ADR or the documented target architecture.
- Is a Tier 3 task per `00_Agentic_Engineering_Workflow.md` §5, by definition.

An ADR is **not required** for local implementation details within an already-approved plan (variable naming, which existing utility function to call, minor UI layout choices) — requiring an ADR for everything would recreate the opposite failure mode (bureaucratic overhead that gets bypassed under pressure).

## 2. Required ADR structure

Every ADR must contain, in this order:

1. **Problem** — what question is being answered, stated neutrally (not pre-loaded toward an answer).
2. **Context** — the situation that makes this decision necessary now (business driver, technical trigger, or a specific finding from the architecture review).
3. **Constraints** — non-negotiable boundaries (existing schema, existing contracts, timeline, team capability, regulatory requirement).
4. **Alternatives** — every option genuinely considered, including "do nothing." An ADR with only one alternative listed has not done this step honestly.
5. **Trade-offs** — for each alternative, what's gained and given up, evaluated against the same criteria (not cherry-picked criteria that favor a predetermined answer).
6. **Decision** — the chosen alternative, stated unambiguously.
7. **Consequences** — what changes as a direct result, including what becomes harder as well as what becomes easier.
8. **Future risks** — what could make this decision wrong later, and what signal would indicate it's time to revisit.
9. **Alignment with existing architecture** — explicit confirmation this decision moves toward (or, if not, why it's an approved exception to) `docs/architecture-review/11_Target_Architecture.md`.
10. **Business impact** — the business-facing consequence, in terms a non-engineer stakeholder can evaluate.

An ADR missing any of these ten sections is incomplete and cannot be ratified.

## 3. ADR numbering and location

ADRs are appended to a single running log, seeded by `docs/architecture-review/13_ADRs.md`. New ADRs continue the numbering from that document (ADR-013 onward) rather than starting a new, separate log — a second ADR log is exactly the kind of parallel-source-of-truth problem this workflow exists to prevent.

## 4. Ratification authority

| ADR trigger | Drafts | Ratifies |
|---|---|---|
| Tier 2 task, single bounded context | Solution Architect Agent | Principal Engineer Agent |
| Tier 3 task, cross-context or schema-affecting | Solution Architect Agent | Principal Engineer Agent + human project owner |
| Security-relevant | Security Engineer Agent (co-drafts) | Principal Engineer Agent + human project owner (Security Engineer Agent's veto per `01_AI_Team_Roles.md` §9 applies regardless) |
| Supersedes an existing ratified ADR | Solution Architect Agent | Human project owner (mandatory — an AI agent may not unilaterally reverse a previously human-ratified decision) |

## 5. Superseding an ADR

An ADR is never edited in place once ratified. A new ADR is written that explicitly states which prior ADR it supersedes and why. The original remains in the log, marked "Superseded by ADR-NNN" — this preserves the decision history rather than silently rewriting it, which is itself a form of the documentation-integrity discipline this workflow is built around.

## 6. Standing proposed ADRs carried over from the architecture review

`docs/architecture-review/13_ADRs.md` ADR-007 through ADR-012 are **proposed, not yet ratified**. No Tier 2/3 task that depends on one of these decisions (sale-recording consolidation, profit-sharing party consolidation, authorization model consolidation, JWT storage location, payment/courier selection, documentation discipline) may proceed past Phase 8 (Implementation Planning) until the relevant ADR is ratified per §4 above. This is a hard gate, not a recommendation.

## 7. Decision quality check (applied by Principal Engineer Agent before ratification)

Before ratifying any ADR, confirm:
- Does the Decision section follow demonstrably from the Alternatives/Trade-offs analysis, or does it look like the analysis was reverse-engineered to justify a predetermined choice?
- Is at least one Future Risk genuinely uncomfortable to the decision-maker (a Future Risks section listing only minor, easily-dismissed risks is a sign the analysis wasn't honest)?
- Does the Business Impact section make sense to someone without technical context?

If any of these fail, the ADR is returned to its drafting agent for rework, not ratified with reservations noted — a "ratified with concerns" ADR is how weak decisions get grandfathered in.

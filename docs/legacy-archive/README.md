# Legacy Documentation Archive

**Status: non-authoritative. Nothing in this folder is updated going forward.**

This folder holds the ~143 markdown files that used to live at the repository root, generated session-by-session during SkyZoneBD's early AI-assisted development. They are archived, not deleted, per `docs/engineering-workflow/05_Documentation_Standards.md` §3 and ADR-012 (`docs/architecture-review/13_ADRs.md`).

## Why these were archived

`docs/architecture-review/01_Project_Overview.md` §6 documents the reason in detail: this corpus contains direct, dated contradictions about the system's own business model and security posture (e.g., two documents claiming "100% complete, Grade A+" sixteen days before a third found 24 unprotected admin endpoints). It is a development diary, not engineering documentation, and should not be read as a source of truth for current system behavior. The canonical, current documentation is:

- `docs/architecture-review/` — architecture, domain model, database, API, security, ADRs, technical debt, backlog (the descriptive and action-oriented record of the system as independently verified against source)
- `docs/engineering-workflow/` — the process manual (how future work gets done)
- `docs/releases/CHANGELOG.md` — the release history
- `README.md` (repository root) — current, accurate quick-start

## `trusted-sources/` subfolder

Four files were judged, after independent re-verification against the actual codebase, to contain genuinely reliable historical analysis rather than the corpus's typical self-congratulatory or stale claims:

| File | Why it's trusted |
|---|---|
| `AUTH_AUTHORIZATION_AUDIT_2026.md` | A self-critical, code-referenced security audit (2026-01-19) whose findings this session's independent read confirmed and extended — see `docs/architecture-review/08_Security_Assessment.md`. |
| `PRISMA_SCHEMA_AUDIT_2026.md` | A code-referenced schema audit whose findings materially informed `docs/architecture-review/06_Database_Analysis.md`. |
| `ORDER_PROFITABILITY_AUDIT_2026.md` | A code-referenced profitability audit whose findings materially informed the profit-calculation duplication findings in `docs/architecture-review/09_Code_Quality_Report.md` and `10_Gap_Analysis.md`. |
| `PARTNER_VISIBILITY_MODEL.md` | The single document that states SkyZoneBD's actual investor/partner business model in plain language — the decisive evidence source for ADR-008 (`docs/architecture-review/13_ADRs.md`). |

Even these four are historical evidence, not living documentation — if a claim in them conflicts with current source code or a ratified ADR, the code/ADR wins.

## If you're looking for something specific

Before searching this archive, check whether the topic is already covered in `docs/architecture-review/04_Module_Analysis.md` (per-module current state) or `05_Domain_Model.md` (business concepts) — most of what these legacy files describe has a current, verified equivalent there.

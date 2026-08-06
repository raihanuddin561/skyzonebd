# 06 — Coding Standards

Each standard below is stated generally, then applied specifically to SkyZoneBD's actual stack (Next.js App Router, TypeScript, Prisma/PostgreSQL) and grounded in a concrete finding from `docs/architecture-review/` showing what happens when it's not followed.

## 1. SOLID

- **Single Responsibility**: a route handler's job is auth check → validate → delegate to a domain/service function → shape the response. It is not the place for profit-margin math (the anti-pattern documented across most of `src/app/api/admin/*`).
- **Open/Closed**: extend the pricing engine's pattern (`src/utils/pricingEngine.ts`) — pure functions over well-typed inputs — for new business rules, rather than adding a new parallel calculator file.
- **Liskov Substitution**: if/when a `PaymentGateway` or `ShippingProvider` adapter interface is introduced (`docs/architecture-review/11_Target_Architecture.md` §7), every concrete implementation must be a true drop-in substitute — no gateway-specific branching in calling code.
- **Interface Segregation**: keep service interfaces narrow (e.g., a `ProfitCalculator` interface should not also expose ledger-posting methods).
- **Dependency Inversion**: routes/services depend on an abstraction over persistence where one exists (or, at minimum, on the **one** shared Prisma client — see §8) rather than instantiating their own.

## 2. DRY — with a specific, binding rule for this project

**Before writing new business logic, search for an existing implementation of the same concept and extend it.** This is not a general nicety here — it is the direct, mandatory countermeasure to the four profit calculators, three sale-recording models, and four auth mechanisms already documented. A Code Reviewer Agent finding of "this duplicates existing logic in file X" blocks approval; it is not a style nitpick.

## 3. KISS

Prefer the simplicity of `src/utils/stockCalculations.ts` (small, pure, single-purpose functions) over the complexity of maintaining two parallel PATCH-order-status implementations with different status whitelists (an existing, documented anti-pattern). Complexity must be essential to the business problem, not accidental to how the code evolved.

## 4. YAGNI — with a specific caution given this project's history

YAGNI does not mean "leave dead code in place because it might be useful later" — `src/services/orderFulfillmentService.ts` is the standing counter-example: fully-built, unused functionality is not "ready for later," it's confusion waiting to mislead the next engineer. Either wire it in (because it's genuinely needed now) or remove it. Don't build speculative abstraction for a requirement that hasn't been stated, but don't preserve speculative implementation either.

## 5. Domain-Driven Design

- New code respects the bounded contexts and aggregates documented in `docs/architecture-review/05_Domain_Model.md`. Crossing an aggregate boundary to write directly to another aggregate's owned entities (rather than going through that aggregate's own service) requires a documented reason.
- Value objects (money, date ranges, addresses) should be modeled as such in application code even where the current schema stores them as flat fields (`Order.shippingAddress` as a string) — don't propagate the schema's current looseness into new application logic; that's exactly the kind of gap `docs/architecture-review/05_Domain_Model.md` §3 flags for future cleanup.

## 6. Clean / Hexagonal Architecture

Maintain the direction: `app/api` (transport) → domain services/utils (business logic) → Prisma (persistence). Business logic does not live in route handlers for anything beyond the most trivial CRUD. External integrations (payment, shipping, email) sit behind an adapter interface, never called directly with vendor-specific shapes from domain code.

## 7. Package by feature (where practical, given current structure)

The current flat `src/utils/` (18 files, no subfolders) makes it hard to see which utility belongs to which business capability. New utilities should be organized by the feature/bounded context they serve rather than added to the flat top level; a broader reorganization of the existing flat structure is tracked as a debt item, not something every new task must fix unilaterally.

## 8. Infrastructure conventions

- **One Prisma client.** New code imports the single canonical client (post-consolidation per `docs/architecture-review/15_Implementation_Backlog.md` P1-4) — never instantiate a second one.
- **One auth mechanism.** New routes use the single canonical auth wrapper (post-consolidation per Phase 3 of `docs/architecture-review/12_Refactoring_Roadmap.md`) — never a bespoke inline JWT check.
- **Use `lib/validation.ts` (zod) for all input validation.** Manual truthiness checks are not acceptable for new code, given the documented consequence (a password-acceptance rule that doesn't actually enforce a minimum length because the real schema was never wired in).
- **Use `lib/error-handler.ts` for all error responses.** No new route hand-rolls its own `try/catch` returning raw `error.message` to the client.
- **Use `lib/paginationHelper.ts` for all list endpoints.** No new ad hoc pagination shape.

## 9. Immutable objects / meaningful naming

- Prefer returning new objects over mutating inputs, especially in pricing/financial calculations where an accidental mutation could silently corrupt a snapshot value (the exact kind of bug the current cost/profit snapshot logic is sensitive to).
- Names must be unambiguous given this project's history of ambiguity causing real confusion — e.g., a new field must not be named in a way that could be confused with `UserRole` vs. `UserType`, or with the free-string `paymentStatus` fields that already inconsistently coexist with the `PaymentStatus` enum. When in doubt, name it after the enum/type it should conform to.

## 10. Dependency injection

Where a service has an external dependency (email provider, payment gateway, Prisma client), inject it rather than importing a global singleton directly inside business logic — this is what makes the pure, well-tested style of `pricingEngine.ts` possible, and is exactly what's missing from the routes that call `prisma` directly inline with business logic.

## 11. High cohesion, low coupling

A module's public surface should express one coherent capability. `src/services/dataService.ts` sitting alongside its own abandoned `.bak` file is a symptom of low process discipline, not just a stray file — cohesion is a property of ongoing maintenance discipline (see `07_Quality_Gates.md`), not just initial design.

## 12. Defensive programming, validation, error handling

- Validate at every trust boundary: API input, admin-configurable business constants (tax rate, shipping cost — currently silently defaulting to 0 if unset, a documented finding), and any client-submitted price/quantity that will be persisted (following the existing, correct pattern in `POST /api/orders`, which re-derives price server-side rather than trusting the client).
- Fail loudly on missing required configuration (e.g., `JWT_SECRET`) rather than silently falling back to an insecure default — the opposite of the current, documented pattern.

## 13. Structured logging & observability

New code uses `src/lib/logger.ts` (once adopted as canonical), not raw `console.log` — the codebase currently has 120 `console.log` statements across 30 files that should never have shipped to production. Every new logged event should include enough structured context (request ID, user ID where applicable, entity ID) to be useful in the Runbook's incident-response procedures (`05_Documentation_Standards.md`).

## 14. How these standards are enforced

- **Automated where possible**: ESLint rules, TypeScript strict mode (already enabled), and CI (once stood up per `docs/architecture-review/15_Implementation_Backlog.md` P1-5) catch what tooling can catch.
- **Code Reviewer Agent** catches duplication-of-existing-logic, naming, and architectural-fit issues tooling can't.
- **Principal Engineer Agent** has final authority to reject a change for standards violations even if all automated checks pass — automation is a floor, not a ceiling.

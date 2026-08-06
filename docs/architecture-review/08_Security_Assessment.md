# 08 — Security Assessment

**This is the canonical security document for the review.** Every finding below was verified directly against current source code (file paths given). Severity uses a simple four-tier scale: **Critical** (unauthenticated data breach or privilege escalation), **High** (auth bypass under realistic conditions, or serious data exposure), **Medium** (defense-in-depth gap, not independently exploitable in isolation), **Low** (hygiene/hardening).

## 0. Executive summary

There is **no single, framework-enforced authentication gate**. `src/middleware.ts` performs no auth check whatsoever (it only sets an `X-Robots-Tag` header) — every one of ~105 API routes is individually responsible for its own authentication and authorization, and a substantial, enumerable subset has none at all, or a check that is trivially bypassable. If this application is internet-reachable in its current state, **the highest-severity items in §1 constitute active, exploitable vulnerabilities today**, not theoretical risks. This document's findings should be read alongside `07_API_Analysis.md` (which routes are affected) and acted on via `15_Implementation_Backlog.md` (P0 items).

## 1. Critical findings

### 1.1 Unauthenticated full account takeover / privilege escalation
**`PATCH /api/admin/users`** (`src/app/api/admin/users/route.ts`) has **no authentication check of any kind** and accepts `{userId, action:'update', data: {...arbitrary}}`, applying `data` directly to `prisma.user.update()`. Any caller can set `role: 'SUPER_ADMIN'` on any account (including their own, if self-registered), `isActive: true`, or overwrite the `password` field directly. The **same file's** GET (lists all users with PII) and DELETE (bulk-deletes users) verbs are equally unauthenticated. This single route fully bypasses the otherwise well-built, hierarchy-checked `PATCH /api/admin/users/[id]/role` endpoint that exists specifically to prevent unauthorized role escalation.
**Impact**: complete, unauthenticated compromise of the entire application (once SUPER_ADMIN is obtained, every other finding in this document becomes moot — the attacker already has full control).
**Fix**: add `requireAuth` + `isSuperAdmin()` (matching the pattern already correct in `users/[id]/role`) before any handler in this file executes. This is the single highest-priority fix in the entire codebase.

### 1.2 Authentication bypass via unverified `x-user-id` header
`src/middleware/permissionMiddleware.ts` (`checkPermission()`, ~line 28) reads `request.headers.get('x-user-id')` and uses it as the caller's identity **with no JWT/signature verification** — the function's own comment (`// TODO: Replace with your actual authentication method`) admits this was never finished. Because `hasPermission()` (`src/utils/permissions.ts`) auto-grants full access to any user whose DB role is `ADMIN`/`SUPER_ADMIN`, an attacker who knows or guesses any admin's `userId` (a Prisma `cuid`) can impersonate them for every route gated by this middleware.
**Affected routes**: `admin/permissions`, `admin/permissions/grant-role`, `admin/permissions/revoke-all` (privilege grants), `admin/costs`, `admin/employees`(`/[id]`), `admin/salaries`, `admin/profit-loss` (top-level).
**Impact**: privilege-grant forgery, and disclosure of employee PII (NID/TIN/bank account numbers), cost data, and P&L data to anyone who can obtain/guess a valid admin user ID.
**Fix**: replace `checkPermission()`'s identity source with a verified JWT (reuse `lib/auth.ts`'s `verifyToken`), or retire this middleware entirely in favor of the JWT-based helpers already used correctly elsewhere.

### 1.3 Unauthenticated read/write of live payment account numbers
**`GET/PUT /api/admin/payments`** (`src/app/api/admin/payments/route.ts`) reads and writes a JSON file (`data/payment-methods.json`) containing bKash/bank account numbers customers are told to pay into — **no auth check**. An attacker can redirect customer payments to an account they control with one unauthenticated `PUT` request.
**Fix**: add admin auth immediately; consider moving this data into the database with an audit trail, given its direct financial-fraud blast radius.

### 1.4 Unauthenticated order-detail disclosure (IDOR)
**`GET /api/orders/[id]`** (`src/app/api/orders/[id]/route.ts`) has no auth check — any caller with (or who enumerates/guesses) an order ID receives the customer's full name, email, phone, shipping/billing address, and order contents. `PATCH`/`DELETE` on the same file correctly require admin auth, confirming this is an oversight, not a design choice.
**Fix**: add `requireAuth` + ownership-or-admin check, matching the pattern already implemented correctly in `POST /api/orders/cancel`.

### 1.5 Unauthenticated RFQ surface
`GET /api/rfq` (lists every customer's name/email/phone/company/target price/items — no auth), `POST /api/rfq` (trusts a client-supplied `userId` with no verification — impersonation), `POST /api/rfq/[id]/respond` (lets anyone set a quote/status on any RFQ as if they were staff — no auth). All three fixes: require `requireAuth`; scope list/create to the authenticated user; require `requireAdmin` on respond.

### 1.6 Unauthenticated financial-control admin routes
No auth check at all on: `GET/POST/PUT/DELETE /api/admin/profit-config` (platform-wide profit percentage — explicitly TODO-flagged in the code itself), `GET/POST /api/admin/profits` (can trigger partner profit distribution), `GET/PATCH /api/admin/distributions` (can approve/pay a partner distribution), `GET/PATCH/DELETE /api/admin/partners/[id]` (can delete a partner or edit profit-share %), `GET/PUT /api/admin/settings` and `/shipping` (site-wide config incl. maintenance mode), `GET/PATCH/DELETE /api/admin/verification` (approve/reject B2B accounts), `GET /api/admin/stats`, `GET /api/admin/inventory` and `PATCH /api/admin/inventory/[id]` (silently overwrite any product's stock quantity), and the read half of `GET /api/admin/payment-config/[id]` (its own PATCH/DELETE siblings *are* protected — inconsistent within one file).
**Fix**: apply `requireAdmin()` uniformly across this list; treat this as one batch of nearly-identical, mechanical fixes.

## 2. High findings

### 2.1 Hardcoded JWT secret fallbacks (three different literal values)
`src/lib/auth.ts`, `src/app/api/auth/login/route.ts`, `src/app/api/auth/register/route.ts` all fall back to the literal string `'fallback-secret'` if `JWT_SECRET` is unset; `src/app/api/products/route.ts` independently falls back to `'secret'` — a *different* literal, meaning tokens signed under one code path can fail verification under the other if the env var is ever missing, and — far more seriously — if `JWT_SECRET` is ever unset in a real deployment, anyone can forge a valid admin JWT using a publicly-known constant. **Fix**: fail fast at boot if `JWT_SECRET` is unset; never fall back to a literal.

### 2.2 Password hash shipped to the browser
`GET /api/user/profile` (`src/app/api/user/profile/route.ts`) has no `select` clause on its `prisma.user.findUnique`, so the bcrypt password hash is included in the JSON response and lands in client-side application state on every profile load. **Fix**: add an explicit `select` (or a shared "safe user" projection) everywhere a `User` row is returned.

### 2.3 Global permissive CORS
`next.config.ts` sets `Access-Control-Allow-Origin: '*'` combined with `Access-Control-Allow-Credentials: 'true'` on **every** `/api/:path*` route, uniformly. Combined with §1's unauthenticated routes, this means any third-party website's client-side JavaScript can `fetch()` and read these responses in-browser, turning the Critical findings above into drive-by, mass-exfiltration vectors reachable from any page a victim's browser (or an automated scanner) visits — not just direct attacker requests. **Fix**: scope CORS per-route (public catalog/search endpoints can stay open; everything else should not carry a wildcard origin, and credentialed requests should never pair with a wildcard origin regardless).

### 2.4 Broken password-reset flow
The frontend (`src/app/auth/forgot-password/page.tsx`) calls `POST /api/auth/forgot-password` — **no such route exists** anywhere under `src/app/api/auth/`. This is a live, user-facing dead end, not merely an unimplemented feature; users who forget their password have no recovery path at all today.

### 2.5 Registration accepts effectively any password
`src/app/api/auth/register/route.ts` only checks password truthiness (`!password`); the zod `registerSchema` in `src/lib/validation.ts` that would enforce a minimum length is defined but **never imported by this route** — it's dead validation code. No rate limiting exists on registration or login either (`src/lib/rate-limiter.ts`'s `rateLimiters.auth` is fully built but never invoked anywhere in `src/app`), so both weak-password acceptance and brute-force are simultaneously unmitigated.

### 2.6 Stored-XSS vector via JSON-LD, compounded by localStorage token storage
`src/components/seo/ProductSchema.tsx` / `StructuredData.tsx` render `dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}` with unescaped `product.name`/`description` — `JSON.stringify` does not escape `</script>`, so a product name/description containing that sequence (settable by any `SELLER`/`MANAGER`/`ADMIN`-role account per `ROLE_PERMISSIONS`) could break out of the script tag. Because the JWT is stored in `localStorage` (not an httpOnly cookie — see §3), a successful injection here is a direct path to session/token theft, not just page defacement. (Note: `ProductSchema.tsx` itself is currently dead/unimported code per `04_Module_Analysis.md` — so this specific vector is **not live** today, but would become live the moment that component is wired in without first fixing the escaping.)

## 3. Medium findings

- **No CSRF protection** anywhere in the codebase. Partially mitigated in practice because auth is Bearer-header-based rather than cookie-based (classic form-submission CSRF against authenticated state doesn't directly apply), but this is incidental, not a designed mitigation, and would become relevant the moment any route relies on cookie-based session state.
- **JWT stored in `localStorage`**, not an httpOnly cookie — readable by any JavaScript on the page, meaning any future XSS finding is immediately an account-takeover primitive, not just a defacement one.
- **Two independent authorization systems that don't share a model**: a JWT + static role-hierarchy system (`lib/auth.ts`, `types/roles.ts`) and a DB-backed granular permission system (`utils/permissions.ts`, gated by the broken mechanism in §1.2) — a route's actual protection depends entirely on which (if either) the route's author happened to wire up. See `05_Domain_Model.md` and `09_Code_Quality_Report.md` for the architectural root cause.
- **Inconsistent role-check strictness**: some checks accept `ADMIN`+`SUPER_ADMIN`, others exclude `SUPER_ADMIN` (`activity-logs`), others require the literal string `'PARTNER'` and exclude `SELLER`/`ADMIN` (bespoke `verifyPartner()` in `partner/dashboard`, `partner/profits`) while the shared `requirePartner()` helper allows both — meaning the *same* nominal role can be granted or denied access to conceptually similar endpoints depending only on which of ~4 auth mechanisms the route happens to use.
- **Inconsistent role-string casing**: `login` stores role in original case; `register` stores `role.toLowerCase()`; some checks do case-insensitive comparison, others do exact-case comparison — a register-created account's role could silently fail exact-case checks.
- **No general API rate limiting** — the shared `rate-limiter.ts` module (strict/auth/standard/generous/write/deletion tiers, well-designed) is **entirely unused**; the only rate limiting live anywhere is a bespoke, in-memory (non-shared-state, resets on cold start) limiter inside the data-deletion-requests route.
- **Error-detail leakage in production**: `lib/error-handler.ts` correctly masks internal error messages when `NODE_ENV==='production'`, but is **not used** by most routes, which instead return `error instanceof Error ? error.message : ...` directly regardless of environment (`products`, `admin/costs`, `admin/employees`, `partner/financial/dashboard`, `admin/profit-loss`, and the unauthenticated `health` endpoint, which leaks raw DB connection error text to any caller).
- **Zod validation defined but unused**: `lib/validation.ts` has a comprehensive schema set (login/register/order/review/RFQ/discount/permission) that is not imported by the actual routes it should validate — real validation is manual, ad hoc, truthiness-based, and materially weaker than the schemas suggest.
- **Migration/seed endpoints gated by secrets that default to hardcoded strings**: `POST/GET /api/migrate` and `/api/db-sync` accept a bearer token compared against `MIGRATION_SECRET_KEY`, which (per `.env.example`'s own placeholder pattern and the route's fallback logic) can default to a known literal if unset — and this route shells out to run real schema migrations via `child_process.exec`. `/api/seed` similarly can wipe and reseed the Product/Category tables in production behind a comparable pattern.

## 4. Low findings

- `pg` package listed as a dependency with no application code using it (dead dependency, not a live risk, but worth removing to shrink the attack surface / dependency-audit noise).
- `GET /api/config` exposes `NODE_ENV` and other `NEXT_PUBLIC_*` values publicly — low risk, but unnecessary deployment-mode disclosure.
- `GET /api/hero-slides` and `GET /api/products/[id]` treat *presence* of an `Authorization: Bearer` header (not its validity) as an "is admin" signal, allowing any request with a garbage Bearer value to view inactive content — an information-disclosure bug, not a data-modification one.
- `GET /api/orders/debug` — a dead debug endpoint that should simply be deleted rather than secured.

## 5. What is done well (worth preserving, not just criticizing)

- Server-side price/stock re-validation at order creation (`POST /api/orders`) correctly discards client-submitted prices and recomputes via the pricing engine — a textbook defense against client-side price tampering.
- `src/app/api/admin/users/[id]/role/route.ts` and `.../status/route.ts` are genuinely well-built: JWT verification, `isActive` check, role-hierarchy validation, explicit self-role-change/self-deactivation prevention.
- `src/app/api/admin/data-deletion-requests/[id]/execute/route.ts` is transactional, status-guarded, and audit-logged — one of the most carefully written endpoints in the codebase.
- Prisma's parameterized query API is used throughout (no string-concatenated SQL found); the handful of `$queryRaw` usages found are tagged-template (parameterized), not string interpolation — SQL injection risk from application code is low.
- Password hashing uses bcrypt at a reasonable (if slightly dated) cost factor of 10.

## 6. Immediate recommendation

Treat §1 as a single emergency patch batch — every item is a straightforward "add the auth check that's already used correctly elsewhere in the same file or a sibling file" fix, not a design problem requiring new infrastructure. This should happen **before** any of the architectural consolidation work in `11_Target_Architecture.md`/`12_Refactoring_Roadmap.md`, independent of this review's broader schedule. See `15_Implementation_Backlog.md` for the itemized, ticket-ready version of this list.

# 07 — API Analysis

~105 route files reviewed in full (every `route.ts` under `src/app/api/`, customer-facing and admin). Authentication/authorization specifics that are security findings (not just consistency findings) are cross-referenced to `08_Security_Assessment.md` rather than repeated in full here.

## 1. Architectural facts about the API layer

- **No API versioning of any kind** — no `/api/v1/`, no header/query negotiation. Every route is flat under `/api/*`. Any breaking response-shape change affects all clients simultaneously with no migration path.
- **No framework-level auth gate** — `src/middleware.ts` only sets `X-Robots-Tag` headers; every route handler is independently responsible for checking who's calling it (see `08_Security_Assessment.md` for how inconsistently this is done).
- **Global permissive CORS** — `next.config.ts` applies `Access-Control-Allow-Origin: *` + `Access-Control-Allow-Credentials: true` to every `/api/:path*` route, uniformly, regardless of the route's sensitivity.
- **Two duplicate Prisma client singletons** (`lib/db.ts`, `lib/prisma.ts`) imported inconsistently across routes.
- **Four different auth-check mechanisms** coexist across routes (shared `lib/auth.ts` helpers, an inline deprecated `verifyAdminToken`, per-file bespoke `verifyPartner()` implementations, and an unauthenticated `x-user-id`-header-trusting `checkPermission()`) — full detail in `08_Security_Assessment.md`.

## 2. Response envelope consistency — inconsistent

At least three shapes are in live use simultaneously, with no shared response-builder:
1. `{success, data: {...}}` — the most common shape.
2. Flat top-level fields with no `data` wrapper, varying by route (`{success, user}`, `{success, addresses}`, `{hasPendingRequest, request}` with no `success` field at all, `{success, notices, reports, summary}`).
3. A more mature `{success, notices, data, pagination, meta}` shape used only by the `financial/*` family — a good pattern that was never generalized to the rest of the API.

Some mutation routes omit `success` entirely and return bare `{error}` on failure (`categories`, `hero-slides`, `products` POST/PUT/DELETE), meaning clients cannot rely on one parsing strategy across the API.

## 3. Pagination consistency — inconsistent

A well-built shared helper exists (`src/lib/paginationHelper.ts`: `getPaginationParams`/`createPaginationResponse`, caps `limit` at 100) and is correctly used by `partner/financial/distributions`, `partner/financial/sales-summary`, `partner/reviews`, `reviews/product/[id]`, `financial/cost-breakdown`, `financial/outstanding-payouts`, `financial/partner-comparison`. But:
- `products`, `search/products`, `search/companies` hand-roll their own `page`/`limit`/`skip` math with different field names (`hasNext`/`hasPrev` vs. `pages`).
- `partner/profits` uses raw `limit`/`offset` with a third, hand-rolled `hasMore` calculation.
- **No pagination at all** (unbounded `findMany`) on: `GET /api/orders` (admin branch), `GET /api/rfq`, `GET /api/data-deletion-request`, `GET /api/admin/employees`, `GET /api/admin/salaries`, `GET /api/admin/costs`, `GET /api/admin/distributions`, `GET /api/admin/partners`, `GET /api/admin/payment-config`, `GET /api/admin/stock`, `GET /api/admin/profit-reports`. This is a genuine scalability risk for `orders` GET specifically, which eagerly includes `orderItems.product` for every row.

## 4. REST compliance & status-code notes

- Mostly conventional status-code usage (200/201/400/401/403/404/409/500).
- `DELETE /api/categories` and `DELETE /api/products` take a comma-separated `ids` **query string** rather than a request body — workable but non-standard for bulk delete.
- Two routes (`GET /api/hero-slides`, `GET /api/products/[id]`) branch their filtering logic on **the mere presence of an `Authorization: Bearer` header without verifying it** — not a REST violation per se, but a correctness/security bug (see `08_Security_Assessment.md`).
- `admin/profit-config`, `admin/settings`, `admin/shipping` persist to flat JSON files on disk rather than the database — an architectural inconsistency versus every other admin resource, and (per `08_Security_Assessment.md`) unauthenticated on top of that.

## 5. Storefront / customer-facing surface — notable entries

(Full per-endpoint table available in the underlying research transcript; highlights below.)

| Endpoint | Issue |
|---|---|
| `GET /api/orders/[id]` | **No auth check at all** — any caller with an order ID gets full customer PII (name, email, phone, address). PATCH/DELETE on the same resource *do* require admin — confirming this is an oversight. |
| `GET /api/orders/debug` | Dead debug endpoint, no auth, references an in-memory store that no longer exists — should be deleted, not fixed. |
| `GET/POST /api/rfq`, `POST /api/rfq/[id]/respond` | No auth at all. List leaks every customer's contact info and quote requests; create trusts a client-supplied `userId` (impersonation risk); respond lets anyone quote/change status on any RFQ as if staff. |
| `/api/data-deletion` vs `/api/data-deletion-request` vs `/api/data-deletion-requests` | Three overlapping endpoints for the same feature, three different auth models. The unauthenticated one (`/api/data-deletion`) allows probing whether an email has an account via its GET handler. |
| `POST/GET /api/migrate`, `POST/GET /api/db-sync` | Gated by a static bearer secret (`MIGRATION_SECRET_KEY`) that **defaults to a hardcoded literal string if the env var is unset** — runs actual `prisma migrate deploy`/introspection via `child_process.exec`. |
| `POST/GET /api/seed` | Destructive (wipes and reseeds Product/Category tables), reachable in production, gated by JWT role or a separate `SEED_SECRET` depending on verb — two different gates on one resource. |
| `GET /api/user/profile` | Returns the raw Prisma `User` row with **no `select`**, including the bcrypt password hash. |
| `PATCH /api/user/profile` vs `PUT /api/user/profile/password` | Duplicate password-change logic at two different paths; the route's own doc-comment names the wrong path. |
| `GET /api/hero-slides`, `GET /api/products/[id]` | "Is this an admin?" determined by header *presence*, not verification — minor info-leak (inactive content visible). |
| `POST /api/orders` | The one clear **positive** example: server-side re-derives price via the pricing engine and re-checks stock; client-submitted price is discarded for the persisted record. |

## 6. Admin surface — notable entries

(~55 route files under `src/app/api/admin/`; full per-endpoint table in the research transcript.)

| Endpoint | Issue |
|---|---|
| `GET/PATCH/DELETE /api/admin/users` | **No authentication at all.** PATCH `action:'update'` applies an arbitrary client-supplied `data` object directly to `prisma.user.update` — the single most severe finding in this review (full detail in `08_Security_Assessment.md`). |
| `GET/PATCH/DELETE /api/admin/partners/[id]` | No auth, despite the collection route (`/admin/partners`) being correctly gated — inconsistent within one feature, and this one can delete a partner or edit profit-share percentage. |
| `GET/PUT /api/admin/payments` | No auth; reads and writes live bKash/bank account numbers used for customer payments to/from a JSON file. |
| `GET/PUT /api/admin/settings`, `GET/PUT /api/admin/shipping` | No auth; unauthenticated write access to maintenance-mode/guest-checkout/tax-rate and shipping-zone config. |
| `GET/POST/PUT/DELETE /api/admin/profit-config` | No auth at all — every handler carries a `// TODO: Add admin authentication middleware` comment. Controls the platform-wide default profit percentage. |
| `GET/POST /api/admin/profits`, `GET/PATCH /api/admin/distributions` | No auth — an unauthenticated caller can trigger partner profit distribution or approve/pay a payout. |
| `GET/PATCH/DELETE /api/admin/verification` | No auth — unauthenticated approve/reject of B2B wholesale account applications. |
| `/api/admin/permissions`, `/grant-role`, `/revoke-all` | Gated by `checkPermission()`, which trusts an unverified `x-user-id` header — the highest-severity instance of this bug, since it directly gates privilege *grants*. |
| `/api/admin/costs`, `/api/admin/employees`, `/api/admin/salaries`, `/api/admin/profit-loss` (top-level) | Same unverified-header gate; `employees`/`salaries` additionally return raw, unselected rows including NID/TIN/bank-account fields. |
| `/api/admin/activity-logs`(`/stats`) | Role check excludes `SUPER_ADMIN` (`!== 'ADMIN'` only) — the inverse bug (over-restrictive), still evidence of no shared/tested auth helper. |
| `PATCH /api/admin/payouts/[id]` | Any plain `ADMIN` (not a stricter finance role) can mark a payout `PAID` — no maker-checker separation anywhere in the payout-approval chain. |
| `POST /api/admin/payouts/generate` | Idempotent against an *exact* duplicate `(partnerId, startDate, endDate)`, but not against overlapping-but-different ranges — a double-generate with slightly different dates can still double-pay. |
| `POST /api/admin/sales/generate` | Correctly idempotent (existence check before create) — a positive example. |
| `GET/PATCH/DELETE /api/admin/reviews`(`/[id]`) | **Fully implemented**, contrary to a stale internal doc claiming this is a placeholder — real queries, pagination, moderation side-effects. Worth calling out since the stale claim could otherwise misdirect future work. |
| `manual-sales/[id]` DELETE | Correctly requires `SUPER_ADMIN` specifically (stricter than plain admin) — one of only two places in the entire admin surface with a tier above plain ADMIN for a financial action (the other being the partner profit-share >100% override). |

## 7. Cross-cutting recommendation

Before any new endpoint is added, this review recommends establishing **one** canonical request-handling wrapper (auth check → validation → business logic → typed response) and migrating existing routes to it incrementally, rather than continuing to hand-roll each of these concerns per route. `lib/auth.ts`, `lib/validation.ts`, and `lib/error-handler.ts` already contain most of what's needed for this wrapper — the gap is adoption, not missing infrastructure. See `11_Target_Architecture.md` and `12_Refactoring_Roadmap.md`.

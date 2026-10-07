# Operations UI - 05 October 2026

Product management update (07 October): create/edit forms, multiple images,
gallery cover/order/removal and public/private visibility are implemented.
See [Product Management UI](product-management.md) for the current contract.

Current handoff for priorities 1-6. Backend source, media and secrets stay in
the separate backend repo. Each repo builds from its root; local workspace
still has separate frontend/ and backend/ folders.

Canonical business/rollout contract:
[backend Operations Rollout](https://github.com/thien-dev-77/baotin-backend/blob/main/docs/operations-rollout.md).
Local counterpart is backend/docs/operations-rollout.md in the parent workspace.
Do not use old preview-only backlog as the current live API contract.

## Implemented Screens

| URL | Purpose |
| --- | --- |
| /admin/pricing | Branch/customer/group policy, dates, discount, SKU override, revision |
| /admin/ledger | On-hand/reserved/available stock, debt/credit reservations, adjustments, payment terms, ledger history |
| /admin/users | Staff creation/edit, roles/branches, disable and password reset |
| /admin/settings | Staff password change |
| /account/settings | B2B notifications and password change |
| /account/credit | Actual credit balance, reserved credit and recent movements/CSV |
| /forgot-password | Request recovery email; clear error if SMTP not configured, neutral receipt once configured |
| /reset-password#token=... | One-use reset token; password confirmation |
| /admin/orders/:id/edit | Edit pending website order with server requote and expected total |
| /admin/integrations | Kiot configuration status, preview, explicit mapping, price import, export and reconciliation |

FE hides new management links by role. BE remains authoritative for role/branch
checks. New resources clear old branch results while loading and ignore stale
responses. The shared refresh control reloads independent operations resources.
Same-resource refresh retains current data; retries retain their error/button
until the request settles. Admin API buttons use the shared loading spinner,
disable repeat clicks, and preserve their label/size. Command pending state is
keyed by action, resource ID and payload so only the clicked action spins.
Save dialogs block dismissal while pending and recover on error. Run
`QA_BASE_URL=http://127.0.0.1:3010 npm run test:admin-loading` in API mode for
delayed/error mocked-API browser tests that never mutate the real database.
Global account/security screens do not show branch/report filters; pricing,
ledger and integrations hide the irrelevant report-period selector. Mutation
forms guard repeated submits and show backend validation.
Customer IDs/password hashes/privileged fields from read responses are NOT
spread blindly into user DTOs. Staff edits send the current user revision and
reject stale forms. Password fields can reveal/hide for input checks.

Pricing displayed during purchase comes from personalized catalog/quote;
API mode no longer invents a 10 percent discount. Preview mode preserves its
old fixture discount. Draft Sales lines can show a provisional retail/snapshot
price while the latest server quote is pending; save remains disabled until a
valid quote matches the current draft. Website customer/source are immutable.
Shipping and original coupon are recomputed in the server quote.

## Framework And Images

Next 16.3.8 / React 19.3.0, async params/searchParams, flat ESLint. Build uses
webpack, dev Turbopack with repository root specified. Node LTS >=22.13.
Next creates AGENTS.md/CLAUDE.md with instructions to read bundled docs; keep them.
Root catalog remains public, cookie-free, no-store SSR. Public routes have no
loading.tsx Suspense boundary that requires JS to reveal their HTML. Account
and admin still have loading states. New APIs do not alter lazy image behavior:
offscreen cards lazy-load, initial hero/gallery are prioritized, unvisited
hero slides are deferred. Image qualities 75/85/90 are explicitly allowed.

## Local Checks

Start backend with ignored .env.local (PostgreSQL 127.0.0.1, not Supabase) and
start FE with NEXT_PUBLIC_API_MODE=true and BACKEND_URL pointing at that API.

```sh
npm run typecheck
npm run lint
npm run test:domain
QA_BASE_URL=http://localhost:3010 npm run test:ssr
QA_BACKEND_DIR=../backend QA_BASE_URL=http://localhost:3010 npm run test:connected
QA_BACKEND_DIR=../backend QA_BASE_URL=http://localhost:3010 npm run test:operations
NEXT_DIST_DIR=.next-build npm run build
npm audit --omit=dev
```

Connected QA creates/deletes local test orders. Operations UI QA creates/edits
and deletes one temporary local staff user, and checks screenshots/forms at
1440/768/390/320 pixels in /private/tmp/baotin-operations-ui. Never point these
scripts at a production API or a localhost API using the Supabase database.
BE has separate unit and disposable-schema operations API tests.
Run auth suites sequentially with at least 60 seconds between suites against
one API, or isolated QA APIs; the real login rate limit must remain enabled.

Runtime audit reports zero vulnerabilities. Full FE audit still has seven high
dev findings via braces 3.0.3; no patched version available during verification.
Only run build/lint tools on trusted inputs. Do not force an audit downgrade.

## External Acceptance Required

- KIOTVIET_RETAILER/CLIENT_ID/CLIENT_SECRET/BRANCH_MAP in BE env, then verify
  correct retailer IDs, units, shipping/tax, preview/mappings and a test order.
- SMTP_URL/EMAIL_FROM/FRONTEND_URL in BE env, verify delivery and reset link.
- Back up and reconcile opening stock/debt/legacy orders before changing schema.
  New schema and write tests in this release were applied to local DB only.
- Stage the new FE/BE together with HTTPS cookies, explicit frontend origins,
  persistent media and SEED_MOCK_DATA=false in production.

Kiot is a manual connector with durable outbox; no automatic stock/debt/status
sync, remote image import, or invoice issuance. No live vendor call/email
delivery verified yet. Banking/refunds, MFA, customer exception requests,
CMS/review persistence and production operations remain outside this release.

# Admin Data Loading - 12 October 2026

## Admin read optimization — 20 October 2026

Deploy the backend before the frontend; this release adds read endpoints. No
schema migration, seed, upload relocation or production data rewrite is needed.
Legacy endpoints retain their previous response contracts.

- Staff authentication joins the session and current user in one SQL query.
  Session revocation/expiry, disabled accounts and current role/branch grants
  remain live; authentication and financial values are not cached server-side.
- `GET /api/admin/product-metadata?branch=...` returns categories and brands.
  A database fingerprint detects changed category data/revisions and brand values
  across processes/imports; unchanged metadata reuses the server projection.
  The frontend privately caches this response separately from page results.
- Product list clients send `metadata=false` to `/api/admin/browse`. Omission
  preserves the legacy metadata response. Product pages and editor group reads
  start independently of category dictionaries. Editor reads use the existing
  access-scoped cache; explicit refresh/save invalidates subscribed reads.
- `GET /api/admin/order-editor?branch=...&id=...` requires admin/boss/sales.
  Omit `id` for creation. It returns branch customers, categories and only the
  selected order's related records/SKUs, with long product content omitted.
  The product picker requests published SKUs in pages of 10, debounces search,
  and retains selected SKU records while changing pages. Quotes and commands
  still validate live prices, stock, credit and revisions on the server.
  A refreshed order revision blocks saving the old draft; reloading explicitly
  uses the existing unsaved-change confirmation.
- `GET /api/admin/ledger/page?branch=...&tab=stock|credit|entries&page=1&pageSize=10&q=...`
  returns only the active tab with pagination. Allowed sizes: 10/25/50. Stock
  projects ID/code/name/unit/stock and calculates on-hand/reserved/available for
  that page. Customer finance is calculated for paged customers; receipt/order
  reads project only finance fields. Warehouse access excludes credit and
  filters history to stock entries. Adjustments retain balance/branch guards.
- Reports issue three independent reads: customer finance, period-only order
  fields, and all-time unpaid credit rows joined to posted receipts. Aging keeps
  opening balances, old orders and unknown due dates. Maps replace repeated
  customer/order/receipt scans. Detail dependencies and warehouse counts overlap;
  count/page reads run in parallel and still clamp out-of-range pages.
- CKEditor initializes within 200 px of the viewport, or on explicit activation.
  Parent form state preserves unmounted editor values; activated editors stay
  mounted across tab switches. Refresh errors preserve editable draft content.

Read-only service measurements on 730 current products / 111 categories:

| Read | Before | After |
| --- | ---: | ---: |
| Product page, 10 SKUs | 38.5 KiB | 7.7 KiB + separately cached 30.9 KiB metadata |
| New order initial JSON | 2005.7 KiB | 32.5 KiB |
| Ledger initial JSON | 1980.3 KiB / 730 SKUs | 1.7 KiB / 10 SKUs |
| Report resource SQL reads, excluding auth | 7 | 3 |
| Staff auth SQL reads | 2 | 1 |

Measurements used an explicit READ ONLY transaction and rolled back; only
aggregate counts/sizes were saved. One pinned connection serialized parallel
queries, so these are payload/query comparisons, not production HTTP latency
claims. The current measured branch had no orders. Disposable tests add history,
reservations, partial/pending/voided receipts, opening debt, negative balances,
and old credit orders to verify finance. Pool size and transaction locks remain
unchanged. Current EXPLAIN results did not justify adding speculative indexes.

Validation: `npm run test:admin-performance` in each repository; backend build,
admin-resources/operations integration tests on disposable PostgreSQL; frontend
build/typecheck/lint plus admin loading, filters, cache, editor content and SKU
linking regressions. Legacy resource endpoints remain available for other screens.

## Paged Read Models And Admin UX

This section supersedes the list/dashboard behavior in the historical resource
contract below. Deploy the backend first, then the matching frontend.

Product-list optimization (14 October 2026):

- The list loads only category metadata through `/admin/resources`, alongside
  its bounded browse page. Category filters remain available while products load.
- Menu hover, keyboard focus or pointer intent prepares the first product page
  in the existing private read cache. Navigating and returning reuse that request
  and cached data for 60 seconds, scoped to the staff user and branch.
- The visible filter panel combines keyword, hierarchical category (including
  descendants), product group (`subcategory`) and publication status. Changes
  reset pagination; changing category clears the group. Clear filters restores
  the unfiltered URL. CSV and bulk selection use the same query.
- Product pages omit long content and galleries; inventory reservations arrive
  as SQL aggregates for the listed SKUs. Editing still loads full product data.
- Row edit links defer prefetching and the editor loads CKEditor dynamically,
  keeping editor assets out of product-list navigation.
- Local QA: `tests/admin-products-performance-ui.spec.ts`, read-cache/resource
  specs, selected admin-loading regressions and backend admin/operations tests.

- Main product, order, customer, credit and warehouse screens now call
  `GET /api/admin/browse?resource=...&branch=...&page=1&pageSize=10`.
  Accepted page sizes: 10, 25, 50. Search and filters run in SQL. Responses include
  `pagination: { resource, total, page, pageSize, totalPages, ids }`.
- Orders default to all time, with optional inclusive `from` / `to` dates.
  Old pending orders are no longer excluded by the dashboard's reporting period.
- Customer pages receive directory/account metadata, Sales assignees and finance
  summaries with the page itself. They do not also call `/admin/customers`.
- Warehouse totals count the whole authorized branch, not just the current page.
- `GET /api/admin/orders/:id?branch=...` loads one order and its needed SKUs,
  customer, approvals and receipts. Existing command/revision guards remain.
- `GET /api/admin/dashboard?branch=...&days=7` returns metrics, chart bins and at
  most five recent orders. Pending queues are all-time; revenue follows the period.
- `app/(storefront)/layout.tsx` owns public SSR catalog loading. The root layout
  and admin layout no longer wait for the storefront catalog. Admin commerce does
  not load public orders, preferences or B2B catalog data.
- `AdminReadCache` caches dedicated reads for 60 seconds per auth scope, branch
  and query, deduplicates requests, and refreshes mounted affected readers after
  writes. It never persists private responses or JWTs in browser storage.
- Same-scope query changes and refreshes retain rows while fetching; branch or
  access changes clear old rows. Errors retain usable data and a busy retry button.
- Filters/pagination are in the URL; product editor return links retain them.
  Search is debounced 300 ms. Pagination renders a bounded window of page buttons.
- CSV export still exports all matching rows, reading batches of 50 only when
  requested. It aborts on unmount and rejects detected mid-export list changes.
- Quote requests contain pricing fields only, debounce 300 ms and abort superseded
  reads. Notes/contact edits do not requote. Saving still validates full contacts.
- Product/Sales forms protect unsaved changes and keep save actions visible on
  mobile. Admin modals protect X/Escape/backdrop and marked cancel buttons.
  Browser reload uses its native warning; Back/Forward uses Navigation API where
  supported, with a history fallback. No private draft is persisted.
  The guard mounts in the root layout before auth resolves, so fallback history
  listeners are installed early; form protection is enabled on admin routes only.
- Mobile action tables keep identity and action columns visible when scrolled.

Local disposable-schema sample (55 additional QA products, not production):

| Read | JSON bytes |
| --- | ---: |
| Legacy full state | 84,407 |
| Order page | 6,947 |
| Product page plus categories | 8,116 |
| Customer page plus directory/finance | 9,303 |
| Dashboard summary | 609 |

These sizes vary with fixtures/page size. They do not establish production latency.
Tests: `admin-ux`, `admin-read-cache`, `admin-loading`, auth/customer/category/
experience/navigation regressions, backend admin/operations tests and production
SSR performance tests. Test APIs and databases are local only.

The old resource endpoint is retained for compatibility and editor dictionaries,
pricing, approvals, accounting and integration flows. Dedicated content/review/
consultation APIs keep their existing list contracts. This is not a claim that
every admin collection has server pagination. Very large editor dictionaries and
CSV exports can still benefit from search-based pickers or streaming exports.

## Historical Resource Contract

## API Contract

The frontend no longer requests `/admin/state`. That endpoint remains available
for older clients, not as a prerequisite for any other API.

`GET /api/admin/resources?branch=...&include=orders,customers,approvals`
authenticates staff, checks the requested branch against current database grants,
and returns `today` plus only the requested resource fields:

| Resource | Fields |
| --- | --- |
| products | products, stockByBranch for the selected branch |
| categories | categories |
| customers | customers with current debt, overdue and reservations |
| orders | orders, warehouse records, paymentDueDates |
| approvals | approvals |
| receipts | receipts |

Unknown resources, invalid branches and unknown query parameters are rejected.
Warehouse reads retain financial redaction and only expose active warehouse orders.
Orders internally read scoped approvals to preserve effective approved prices;
those approvals are not added to the response unless requested.

`POST /api/admin/commands` now accepts `returnState: false`. The frontend sends
this on every command and receives `{ id }`, then refreshes affected cached
resources. Omitting the flag preserves the legacy `{ id, state }` response.
Backend validation dependencies are determined by the action, not by the client.
Revision, role, branch, stock, credit and transaction guards remain authoritative.

## Frontend Behavior

`lib/admin-resources.ts` owns the route dependency map, command invalidation map
and in-memory cache. `ApiAdminProvider` owns one cache per user ID/role/branch grants:

- Product screens load products/categories, not customer finance or receipts.
- Order/warehouse lists initially load orders only. Opening an order dialog loads
  its additional dependencies with a loading state and request deduplication.
- Dashboard loads orders/customers/approvals without the product dictionary.
- Users/settings/notifications/reports/categories use their dedicated resources
  without waiting for an aggregate admin request.
- Each resource is keyed by branch, fresh for 60 seconds, and reused on client
  navigation. Expiry is checked when requested, not by a timer or focus listener.
  No automatic window-focus reload remains.
- Explicit refresh invalidates cached resources and reloads only the active
  screen and an open order dialog. Dedicated resource hooks refresh independently.
- Writes invalidate affected resources; product visibility invalidates all
  authorized branches. Previously loaded rows remain visible during refresh and
  failures, with retry. Scope changes discard the cache immediately.
- Resource versions reject reads started before invalidation; late responses from
  an old access scope cannot overwrite the current one.

This is private UI caching, not an HTTP/shared server cache or persistent auth
storage. Redux still owns authentication, with JWT in its HttpOnly cookie.
No additional `/auth/session` request is introduced by data loading or commands.

## Backend Work

Resource queries filter branches in SQL, skip unrelated tables and overlap
independent reads. Customer finance queries select only requested customers and
their orders/posted receipts/credit entries. Maps replace repeated per-customer
and per-order array scans. Indexes cover customer/approval/receipt branch filters,
orders.customerId and ledger_entries(kind, resourceId), alongside existing stock
and order branch indexes.

Local seeded-fixture sample, including HTTP/auth, not production latency:

| Read | JSON bytes | Time |
| --- | ---: | ---: |
| Legacy full state | 51,789 | 9 ms |
| Dashboard dependencies, Quy Nhon | 9,706 | 3 ms |
| Products/categories, Quy Nhon | 35,303 | 3 ms |

Products/categories execute four resource SQL queries and do not read customer
finance, receipts or approvals. These measurements do not establish the cause
of the reported six-second production request or promise equivalent timings
over Hostinger/Supabase networking.

## Verification And Deployment

Backend: `npm run test:admin-resources` plus operations, customer, catalog and
product suites on disposable local schemas. Frontend: admin resource unit tests,
loading/auth/customer/category/navigation suites and production build.

Deploy backend first, then frontend. Back up and review TypeORM synchronization
on staging before adding indexes; do not reseed or delete production data.
In the browser Network panel, verify no `/admin/state` calls, branch-specific
resource requests, no focus reload, cache reuse and targeted post-write refresh.
Measure production TTFB and query/pool/network latency again after deployment.

The new paged read models above replace unbounded resource reads for main lists
and dashboards. The legacy endpoint remains broad for compatibility and workflows
which require reference dictionaries.

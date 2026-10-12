# Admin Data Loading - 12 October 2026

## Paged Read Models And Admin UX

This section supersedes the list/dashboard behavior in the historical resource
contract below. Deploy the backend first, then the matching frontend.

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

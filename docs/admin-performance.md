# Admin Data Loading - 08 October 2026

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

Lists within each selected resource are not yet server-paginated. Large order
histories/product dictionaries can still require pagination and separate
server-side dashboard aggregates. Dedicated resources keep their existing
contracts; this change does not claim to paginate every admin screen.

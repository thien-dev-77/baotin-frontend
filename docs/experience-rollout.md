# UI/API Completion - 07 October 2026

This document supersedes the notification/CMS/review/self-service-price/PDF/report
backlog in earlier preview documents. Implemented and verified locally; not a
certification of production deployment or commercial acceptance.

## Screens

| Screen | Function | Access |
| --- | --- | --- |
| `/admin/notifications` | Inbox, filters, unread count, individual/all read | Authenticated staff; own notifications only |
| `/account/notifications` | B2B inbox and own order/credit links | Authenticated B2B |
| `/account/price-requests` | Per-SKU price request for a pending own order; history | Active B2B |
| `/account/products`, `/account` | Frequent products from issued/completed own orders | Active B2B |
| Order detail / admin order dialog | Download quote and order PDF | Order owner, guest cookie owner, authorized staff |
| `/admin/consultations` | Contact requests, status, assignee, notes | Admin/boss/sales in branch |
| `/admin/content` | Banner/guide/solution CRUD, image, rank, draft/publication | Admin/boss |
| `/admin/reviews` | Approve or hide persisted reviews | Admin/boss |
| `/admin/reports` | 7/30/90-day KPIs, aging, CSV and overdue reminder | Admin/boss/sales/accountant in branch |
| `/admin/integrations` -> balance comparison | Mapped stock/debt/order-status snapshots | Admin/boss in branch |

The bell in storefront/admin fetches only `/notifications/count` after login and
polls that count every 30 seconds while the document is visible. The paginated
`/notifications` list loads only inside `/admin/notifications` or
`/account/notifications`; hovering the bell does not fetch the list. Marking read
refreshes the count and, only if the inbox is still mounted, its current list.
Invalid count responses retain the last valid badge; auth-scope changes clear it.
No WebSocket delivery or `/auth/session` on focus/navigation. Redux auth and the
existing HttpOnly JWT cookie are preserved. F5 verifies authentication once.

## API Contracts

Backend paths below have `/api` prefix. Browser calls use `/api/backend`.

| Endpoint | Payload / response |
| --- | --- |
| GET `/notifications/count` | `{unreadCount}`; authenticated recipient/current role/allowed branches, unread only |
| GET `/notifications?page=1&unread=false&type=` | `{items,total,page,pageSize:20,unreadCount}` |
| PATCH `/notifications/read` | `{id}` or `{}` for all this recipient's unread notifications |
| GET `/account/frequently-bought` | `{products}` with current visibility, stock and personalized prices |
| GET `/account/price-requests` | `{items,orders}`: own approvals and pending orders with revision |
| POST `/account/price-requests` | `{orderId,revision,reason,prices:{productId:integerVnd}}` |
| GET `/orders/:id/document?kind=quote|order` | Private `application/pdf` |
| GET `/admin/orders/:id/document?kind=quote|order` | Branch/role-protected private PDF |
| GET `/contact/consultations?branch=...` | `{items,assignees}`; replaces earlier array response |
| PATCH `/contact/consultations/:id` | `{revision,status,assignedTo,note}` |
| GET `/content` | `{items}`: public banner/guide/solution entries only |
| GET/POST `/admin/content`; PATCH `/:id` | Entry data, immutable kind, published; revision on update |
| POST `/admin/content/initialize` | Insert-only defaults; never overwrite existing entries |
| GET `/reviews/:productId` | `{items}`: published reviews, no private user IDs |
| POST `/reviews/:productId` | `{stars,text}`; verified B2B purchase; pending moderation |
| GET `/admin/reviews`; PATCH `/:id` | List; update `{revision,status:published|rejected}` |
| GET `/admin/reports?branch=...&days=30` | KPIs, cancellations, unresolved shortages, aging |
| POST `/admin/reports/remind` | `{branch,customerId}`; server-derived amount; daily deduplication |
| GET `/admin/integrations/kiotviet/reconciliation?branch=...` | `{polling,run,lastAttempt}`; last successful snapshot retained |
| POST `/admin/integrations/kiotviet/pull` | `{branch}`; read-only comparison |

Price requests reuse staff approvals; the customer cannot change purchase prices
directly. Reviews require moderation. CMS body is plain text, not arbitrary HTML.
Status/revision/role/ownership guards are enforced on the server.

Deploy the backend count endpoint before this frontend change. It uses one SQL
COUNT rather than loading inbox rows. TypeORM synchronize adds a partial unread
index; back up the database and verify the schema update in staging first.

## Shared Components

- `components/notifications.tsx`: provider, bell and shared admin/account inbox.
- `lib/use-api-resource.ts`: retains same-scope data during refresh; ignores stale
  responses after auth changes. Admin keeps its existing resource hook.
- `components/order-document-buttons.tsx`: shared PDF download controls.
- `components/frequently-bought.tsx`: ranked product read model/view.
- `components/admin/admin-resource.tsx`: loading/error/retry without clearing tables.
- `components/ui.tsx`: stable loading buttons, busy modals, icon-only sizing.
- `lib/api-client.ts`: JSON client plus validated PDF downloader.
- `lib/backend-proxy.ts`: strict JSON checks; private PDF permitted only on the
  two order-document routes and only with a valid PDF signature.

Homepage banners/solutions/guides and guide pages load published CMS data on the
server via `lib/server-api.ts`. Preview retains mock defaults. API mode never
falls back to fake content on upstream error. An empty CMS is genuinely empty:
initialize and review content before production traffic. Images remain next/image,
with offscreen lazy loading and hero priority.

## Storefront Catalog Wiring - 08 October 2026

With `NEXT_PUBLIC_API_MODE=true`, storefront views use API products rather than
mock SKUs or a fixed brand list. The latest revision uses bounded bootstrap,
paginated search and targeted SKU reads, not a full `/catalog` preload. See
[orders-catalog-pagination.md](orders-catalog-pagination.md) for the coordinated
backend/frontend contract and schema update.

- Legacy order detail resolves current names/images/links from API products, including
  newly created admin SKUs. Every original order line remains visible even when
  a product becomes private, disappears from the public catalog or sells out.
  Quantities, unit prices and totals remain the order's historical values.
- Reorder adds only products currently present and in stock, caps quantities at
  current available stock and uses current catalog prices in the cart. Skipped
  lines are reported; the button is disabled when none can be purchased again.
  Checkout still revalidates authoritative stock/prices on the backend.
- Cart suggestions use up to four in-stock API products not already in the cart.
  Empty catalogs do not restore mock recommendations.
- Brand filters, search results and header autocomplete derive unique brands
  from visible API products. All links use the same `slugify` helper. Brand pages
  resolve the brand server-side and render products without JavaScript. Unknown
  brands, or brands with no public products, return 404. Layout and brand page
  share bootstrap metadata; the brand page has its own cached product-page read.

New order lines now contain a server-authored name/code/slug/image/unit snapshot.
Order details/admin/PDF retain these labels through catalog renames/hiding.
Legacy lines without snapshots use current metadata or an ID placeholder, never
fabricated history. Reorder refreshes the current SKU IDs before adding products.

Preview mode retains its fixtures intentionally. These changes do not make
database seed data production-approved. Frontend code must be deployed before
the live website reflects this wiring.

## Deploy And Test

1. Deploy matching backend first to staging with database/media backup.
2. Review the three new tables and lead columns before enabling TypeORM sync.
3. Keep production `SEED_MOCK_DATA=false`. Explicitly initialize CMS from admin
   or author approved content; verify backend images and persistent uploads.
4. Deploy FE with `NEXT_PUBLIC_API_MODE=true`, full HTTPS `BACKEND_URL`, HTTPS
   cookies and correct backend origins. Do not cache API paths.
5. Verify permissions, ownership, PDF Vietnamese text, draft visibility,
   notifications and the complete order/price approval flow.

```sh
npm run lint
npm run typecheck
npm run test:domain
QA_BASE_URL=http://127.0.0.1:3010 npm run test:auth
QA_BASE_URL=http://127.0.0.1:3010 npm run test:admin-loading
QA_BASE_URL=http://127.0.0.1:3010 npm run test:experience
QA_BASE_URL=http://127.0.0.1:3010 npm run test:ssr
QA_BASE_URL=http://127.0.0.1:3010 npm run test:catalog-api
NEXT_DIST_DIR=.next-build npm run build
npm run test:performance
```

Experience UI tests intercept every client mutation. Screenshots at
1440/768/390/320px: `/private/tmp/baotin-experience`. SSR tests read the local API.
Never point tests at production.

Catalog UI QA uses intercepted API responses with new/updated/missing/out-of-stock
SKUs and a new accented brand at 1440/390/320 px. It verifies historical totals,
current reorder pricing/stock, empty states, filter/search/autocomplete links and
no horizontal overflow. Screenshots: `/private/tmp/baotin-api-wiring-*`.
Production-build performance QA also checks server-rendered brand pages and
visibility invalidation against an isolated fake API, never production writes.

## Remaining External Work

Kiot credentials, mappings/units, vendor acceptance and accountant-approved opening
balances are still required. Optional polling saves comparisons; it does NOT
automatically overwrite website stock/debt or advance orders. Legacy invoices
without dates stay in the unknown aging bucket.
Bank import/refunds/returns, MFA, email/Zalo notifications, invoice issuance,
global pagination, retention/observability/backups and production acceptance
remain separate work. B2C guest reviews are not supported in this release.

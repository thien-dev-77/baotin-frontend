# Storefront Performance - 08 October 2026

Implemented and verified locally. Production is unchanged until both repositories
are deployed; local timings are not promises about Hostinger or Supabase latency.

## Changes

- Public SSR catalog/category DTOs use a 15-second Next Data Cache; published CMS
  uses 60 seconds. Cache keys include the backend URL and category slug when used.
  Only validated responses are cached. Malformed JSON, HTML, null and errors do
  not poison the cache. This uses the compatible `unstable_cache` API without
  enabling Cache Components across the existing application.
- Server reads never forward visitor cookies. Customer prices are removed before
  caching. Browser APIs, JWT/session, account data, orders, checkout and admin
  responses remain private/no-store. Complete HTML remains dynamically rendered.
- Successful storefront-affecting commands through `/api/backend` expire tags
  immediately with `revalidateTag(tag, { expire: 0 })`. Rejected writes and quotes
  do not invalidate. Catalog/category/product/ledger/integration/order mutations
  expire catalog data; CMS mutations expire content. Invalidation failure does
  not falsely report an already committed backend command as failed.
- A product-detail lookup stays uncached, including visibility/404. Checkout still
  verifies current stock and prices on the backend; displayed snapshots never
  authorize a price, credit or reservation.
- Inter variable replaces five static weights. Vietnamese subset precedence avoids
  downloading Latin Extended just for overlapping Vietnamese glyphs. English,
  Vietnamese and Latin Extended remain supported, with swap display and system
  fallback. No Google font request is needed at build time or in the browser.
- Product links no longer prefetch every visible SKU. Images retain Next/Image,
  offscreen lazy loading, first-hero priority and unvisited-slide deferral. Category
  banner image sizes now match the half-width image area on mobile.
- Homepage lock rows read current catalog/categories rather than static lock
  fixtures, with at most five items per group and no empty banners. Brand labels,
  names, prices and visible categories follow current data.
- The showcase uses actual `featured` products under **Nổi bật**, not a fabricated
  bestseller ranking. **Thường mua** uses the customer's existing endpoint only
  when selected; anonymous visitors see login and empty/error/loading states.
- Cart restoration validates against server catalog products, including new admin
  SKUs, rather than requiring every SKU to exist in the original mock catalog.
  Well-formed saved lines survive a temporary SSR catalog failure and recover
  without trying to render a missing mock product.
- Order details/reorder, cart recommendations and brand filters/search/pages now
  use API catalog data too. Brand pages share the layout's request-local catalog
  read, preserve SSR and respect product visibility. See
  [Storefront Catalog Wiring](experience-rollout.md#storefront-catalog-wiring---08-october-2026)
  for historical-order behavior and the current API contract limitation.

## Backend

Stock calculations select only inventory for requested SKUs and orders whose
status still reserves stock. The two independent queries run concurrently and
product maps are built once, replacing repeated scans per product. Exclusions,
branch isolation, zero-stock clamping and duplicate-line semantics are preserved.
Catalog authentication/products/categories reads also overlap safely.

TypeORM indexes added: `orders_branch_idx` on orders.branch and
`inventory_branch_product_idx` on inventory_balances(branch, productId). Back up
and review synchronization on staging before applying these with the approved
`DB_SYNCHRONIZE` procedure. Do not reseed or delete production data.

## Measured Locally

Production baseline before deployment: first desktop HTML 4.5 s/LCP 4.9 s;
subsequent desktop HTML about 1.6 s; a throttled mobile run LCP 7.4 s. This is a
small lab sample, not CrUX or a production percentile.

The optimized production-build QA uses a local controlled API with 200 ms added
delay per catalog/content call. One measured run: cold full HTML 335 ms, warm HTML
27 ms. Actual API calls prove reuse, immediate hide/update/CMS invalidation and
recovery from malformed responses without waiting for TTL. Homepage fonts at
1440/390/320 px: **2 files / 58,508 bytes**, versus baseline **14 / 290,136 bytes**.
Screenshots and raw measurements are in `/private/tmp/baotin-optimized-*`.

## Verification And Deploy

```sh
npm run lint
npm run typecheck
npm run test:domain
NEXT_DIST_DIR=.next-build npm run build
npm run test:performance
QA_BASE_URL=http://127.0.0.1:3010 npm run test:ssr
```

Performance QA starts isolated servers on 3041/4011, mutates only a fake API and
reads images from the local backend on 4000. It refuses remote image backends.
Auth/admin-loading/category/navigation suites also remain green. Backend domain,
runtime, operations and optimized stock integration tests use disposable local
PostgreSQL schemas only.

Deploy matching backend first, then FE; retain the Next Data Cache directory if
the hosting service supports persistence. Recheck public/private visibility,
stock and B2B pricing before repeating the production measurements. Multiple FE
instances need a shared Next cache handler/invalidation mechanism; local process
cache tags alone must not be treated as cross-instance invalidation. Writes that
bypass the FE proxy rely on timed stale-while-revalidate and are not immediately
propagated. Route such admin writes through FE or add an authenticated invalidation
webhook before requiring immediate cross-service visibility.

## Remaining Work

Admin aggregate loading has also been replaced with route/branch-scoped reads;
see [Admin Performance](admin-performance.md) for caching, command invalidation,
query counts and deployment ordering.

A cold SSR request still waits for the public API. Profile production query times,
pool waits and hosting cold starts after deploy; this change does not establish
their individual contributions. Hostinger bot challenges observed on raw HTTP
clients are a separate infrastructure concern and were not disabled here.
Storefront pagination and bounded bootstrap are now implemented; see
[orders-catalog-pagination.md](orders-catalog-pagination.md) for contracts and
remaining server-side candidate-ranking costs. Other endpoints' pagination,
real sales rankings, curated product documents/bundles and authoritative Kiot
synchronization remain separate feature work.

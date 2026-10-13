# Product Batch Actions

The product list at `/admin/products` has checkboxes for admin, boss and sales
in API mode. Select individual SKU, a visible page or all filtered results
(up to 500). Selection persists between pages and resets when search, category,
visibility, branch or user changes. Revisions are captured at selection time.
Select-all calls `/admin/products/selection` once for compact ID/code/revision
data, rather than downloading every full product browse page.

The action bar offers:

- Public: validate price, specifications, category and stored images before
  publishing. Valid SKU are published even when others fail validation. Incomplete
  SKU keep their status/revision and appear in a persistent result list with code,
  reason and an editor link. The result shows saved and skipped counts.
- Private: hide selected SKU from the public catalog.
- Edit discount: apply B2C and/or B2B percentages independently to each list price.
  Unchecked discount fields keep their stored values.

Each action has a confirmation dialog and submits one
`POST /admin/products/bulk`. Buttons show a loading spinner and prevent repeated
submission. Tables keep cached rows while refreshing. Successful writes refresh
product browse/detail/dashboard caches and storefront catalog; failed writes
preserve selection and display the API message. No `/admin/state` reload is
required. Customer/group/branch price policies still override SKU-default B2B.

Publication validation skips are not request errors. The backend returns
`skipped: [{ id, code, name, reason }]` alongside successful `products`, `updated`
and `hiddenCategories`. When all selected SKU are invalid, show "Chưa công khai
sản phẩm nào" and the full skip list; do not reload unchanged catalog data.
Missing IDs, stale revisions and authorization failures still stop the request
and preserve selection. Discounts and private actions remain all-or-nothing.
Deploy the backend before the frontend for partial publication support.

Category visibility is managed at `/admin/categories`. Publishing products in
a hidden category does not automatically expose the category; the response/toast
reports hidden category count. Unselected variants are unchanged.

## Fulco Source Data

The first-sheet import created 242 private SKU, 28 hidden categories and 41
variant groups in Supabase. B2C/B2B both use the source 60%/65% discounts. Stock
is zero. 19 rows have no source gallery and placeholder names to review.

Product editor preserves `alternateCode`, `sourceUrl`, `shortDescription`,
`technicalDetails`, `usageGuide` and `warranty`. Detail overview displays source
short content, full specifications appear below the gallery, and instructions
appear in the documents tab. Warranty is per product, not a fixed 24 months.
Gallery supports 20 images; each upload request is still limited to 10 files.

Backend must be deployed first so DTO validation accepts the source fields and
the bulk endpoint exists. Then deploy frontend. The importer is an operator CLI
in the backend repo; the Excel download button is not an Excel upload screen.

## Checks

```sh
npm run typecheck
npx playwright test tests/product-bulk-ui.spec.ts tests/product-pricing-ui.spec.ts --workers=1
```

Browser tests mock all writes and verify desktop/mobile selection, loading,
publish/private, discount omission, stale-error behavior, and twelve-image editing.

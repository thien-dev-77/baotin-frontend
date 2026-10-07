# Product Management UI - 07 October 2026

## Screens

- `/admin/products`: search, category and public/private filters, CSV export,
  add action and links to edit individual products.
- `/admin/products/new`: new product form, private by default.
- `/admin/products/:id/edit`: content, pricing, gallery and visibility editor.

Admin, boss and sales can edit. Other roles cannot use write controls or APIs.
Forms write actual API/database data in API mode; disconnected preview mode
does not fake a successful save. Existing preview records remain readable.

## Components

- `components/admin/admin-products.tsx`: product list only.
- `components/admin/product-editor.tsx`: form, validation and save flow.
- `components/admin/product-image-upload.tsx`: multi-file upload, gallery,
  cover selection, move-left/right and removal.

The editor includes name, SKU, brand, category/subcategory, unit, slug, retail
and old prices, description, technical specification, material, size, color,
origin, featured flag and public/private mode. Name initially generates a slug;
manual slug edits are preserved. Stock is read-only and linked to the ledger.

API categories populate selects. New photos upload before save and remain
unattached until the product is saved. Maximum 10 photos, 5 MB per photo;
JPEG/PNG/WebP. First gallery photo is the cover. Thumbnails use next/image.
Description changes appear on the storefront description tab as plain text.

Saving refreshes admin state and storefront catalog, then returns to the list.
The form retains its original revision; concurrent changes show a reload action
instead of silently replacing unsaved data or overwriting someone else's edit.
Private products are excluded from guest and B2B storefront routes and quoting.
Related products use the current public catalog rather than static mock records.

Backend contract and media retention/security notes:
[Product API](https://github.com/thien-dev-77/baotin-backend/blob/develop/docs/product-management.md).
Private mode hides a product listing; it does not make a known image URL secret.

## QA

Start local PostgreSQL, backend using `.env.local`, and frontend in API mode.
Ensure `BACKEND_URL` and `FRONTEND_ORIGINS` match the running local servers.

```sh
QA_BASE_URL=http://localhost:3010 QA_BACKEND_DIR=../backend npm run test:products
```

QA refuses nonlocal frontend/database targets. It exercises real UI/API
create/edit, multiple image uploads, cover/removal, public/private SSR, filters
and image rendering at 1440/768/390/320 pixels. Only its own temporary product,
audit entries and uploaded files are removed. Screenshots are kept under
`/private/tmp/baotin-products-ui`, outside Git.

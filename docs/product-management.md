# Product Management UI - 07 October 2026

## Screens

- `/admin/products`: search, category and public/private filters, CSV export,
  add action and links to edit individual products.
- `/admin/products/new`: new product form, private by default.
- `/admin/products/:id/edit`: content, pricing, gallery and visibility editor.
- `/admin/products/new?variantOf=:id`: prefilled form for a new SKU in a
  product's variant group.

Admin, boss and sales can edit. Other roles cannot use write controls or APIs.
Forms write actual API/database data in API mode; disconnected preview mode
does not fake a successful save. Existing preview records remain readable.

## Components

- `components/admin/admin-products.tsx`: product list only.
- `components/admin/product-editor.tsx`: form, validation and save flow.
- `components/admin/product-pricing-fields.tsx`: list price, B2C/B2B discounts
  and read-only final prices; see [pricing contract](product-pricing.md).
- `components/admin/product-variant-fields.tsx`: dynamic attribute rows and
  links between SKUs in the same group.
- `components/admin/product-image-upload.tsx`: multi-file upload, gallery,
  cover selection, move-left/right and removal.

The editor includes name, SKU, brand, category/subcategory, unit, slug, list
price and independent B2C/B2B discounts, description, technical specification, material, size, color,
origin, featured flag and public/private mode. Name initially generates a slug;
manual slug edits are preserved. Stock is read-only and linked to the ledger.

To create a group, add one or more attribute rows to a product (for example
`Kích thước khoang tủ (T): 600mm`, optionally `Màu sắc: Bạc`) and save it.
Open that product again and select **Tạo biến thể**. The next form copies the
group's content, photos, price and attribute names; enter a unique value
combination, SKU and slug, adjust its own pricing/photos, then save. Repeat for
other combinations. Each SKU's stock is managed separately in the ledger.
Set **Nhãn hiển thị biến thể** on each SKU to customize its option label (for
example, `FCL303-R` can display `Phải`). Leave it blank to display the SKU code.
The label is used in the admin group's links and single-attribute choices;
new variants start with a blank label rather than copying the root's label.
Groups with several attributes display one selector per attribute, using its
values (for example, `Hướng: Trái / Phải`), without a combined SKU picker.

After saving a SKU, use **Áp dụng cho biến thể khác** above the edit form to
reuse its saved content. Choose the recipient SKUs in the same group and the
individual fields to replace: name, short/full description, guide, warranty,
technical details, gallery, material or origin. Nonempty name/descriptions,
guide and warranty are selected initially; technical details and images require
an explicit selection because they may contain SKU-specific information.
Empty source fields start unchecked and warn that selecting them clears the
recipient's content. Technical details also copy their plain listing summary;
gallery changes copy the cover image. Price, stock, SKU, slug, variant values,
custom labels and publication state are preserved. Unsaved edits must be saved
first. One request applies all chosen changes atomically; stale source/target
revisions stop the entire request and provide a reload action. Maximum 500
recipient SKUs. This requires the backend copy endpoint to be deployed first.

Use **Thiết lập loại biến thể** in the product editor to open
`/admin/products/:id/variants`. Add **Màu sắc**, **Hướng**, **Kích thước**, or
a custom type (up to six), rename/remove existing types, and fill each SKU's
values in separate columns. Save applies the full configuration to every SKU,
including private SKUs. This also works for products without a variant group;
after saving, use **Tạo SKU biến thể** to add another combination. Duplicate
combinations or stale SKU revisions prevent the whole configuration from saving.
The customer detail page renders the options above the purchase panel, and
switching options navigates to the matching SKU with its own image, price and
inventory. Multi-attribute selection picks an existing compatible SKU.
The catalog displays one representative per group; filters can select another
matching SKU. The admin list and CSV keep all SKUs visible.

The Excel v2 file is still a reference template; it does not import products
or define variant groups automatically. Use the admin editor/API for variants.

API categories populate selects. New photos upload before save and remain
unattached until the product is saved. Maximum 10 photos, 5 MB per photo;
JPEG/PNG/WebP. First gallery photo is the cover. Thumbnails use next/image.
Rich descriptions render on the storefront with HTML filtering; legacy plain
text retains line breaks.

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
create/edit, multiple image uploads, cover/removal, public/private SSR, filters,
dynamic variant creation, selection and adding the selected SKU to the cart.
It checks layouts at 1440/768/390/320 pixels. Its temporary SKUs, stock,
audit entries and uploaded files are removed. Screenshots are kept under
`/private/tmp/baotin-products-ui`, outside Git.

# Category Management

## Screens

- `/admin/categories`: global category management, available in the Admin sidebar
  and via the Category link on the product list.
- `/categories`: all visible website categories.
- `/category/[slug]`: category metadata loaded server-side from the backend;
  missing/hidden categories use the normal 404 page.

Admin and boss can create/edit. Sales and accountant can inspect categories but
cannot mutate. Warehouse and B2B cannot access the management screen. API access
enforces the same permissions; hiding buttons alone is not authorization.

## UI Behavior

Create/edit uses a separate `CategoryEditor` component with name, immutable saved
slug, description, backend cover upload, editable group list, position and
visibility checkbox. A new slug is generated from the name until manually edited.
Groups can be added/removed; the backend blocks removal of a group in use.

Mutations/upload show spinners and disable conflicting controls. A synchronous
submit lock prevents duplicate requests; dismissal/Escape is blocked while busy.
Failed saves preserve the draft. Background reads keep the existing table,
filters and editor mounted. Conflicting edits report the backend 409 message;
close the editor, refresh and reopen before retrying against the new revision.

After saving, reload the category list, admin state and public catalog. A failed
public reload reports that the mutation was saved but the website needs refresh;
it does not repeat the successful mutation. Names, cover images and new groups
become available to product/CMS/Sales forms without rebuilding the frontend.

## Dynamic Public Catalog

Header links, dropdown, mobile navigation, home sidebar and home category cards
use CommerceProvider categories, initially rendered from the public server-side
catalog. The sidebar scrolls when more categories are added. Icons are mapped by
slug, not by array position; custom categories use a standard Package icon.
All category images use `next/image` and native lazy loading.

The category page calls GET /api/categories/:slug from the server without cookies
or caching. The product breadcrumb uses API category data and safely omits an
unavailable category. API-mode load failures do not replace empty categories with
the old mock list. Mock categories remain available in offline preview mode.

`visible=false` hides the category from navigation and makes its category page
404. It does not make its products private; products can still be found through
search/direct links. Product visibility remains a separate control.

## API Handoff

- GET /admin/categories -> `{ items: AdminCategory[] }`.
- POST /admin/categories -> `{ category: Category }`.
- PATCH /admin/categories/:slug -> `{ category: Category }`, required revision.
- POST /media/product-images accepts one multipart `images` file for a cover.
- GET /categories and GET /categories/:slug are public backend routes.

`Category` extends existing fields with optional `visible`, `sortOrder`,
`revision` for old preview fixtures. Admin responses always populate them and
include `productCount`. See backend `docs/category-management.md` for validation,
storage and schema rollout. Deploy backend first; no shared-folder dependency.

## Verification

`npm run test:categories` uses local Playwright fixtures to cover category creation,
image upload, immediate product-form/menu availability, busy states, duplicate
submit prevention, draft retention, visibility, read-only roles and responsive
screens at 1440/768/390/320 px. API tests exercise real isolated local PostgreSQL.
Run frontend lint, typecheck and production build before deployment.

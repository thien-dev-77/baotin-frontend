# Customer Management UI

Local implementation, 07 October 2026. Route: `/admin/customers`.
The existing credit view `/admin/credit` and financial commands remain separate.

## Screens And Controls

- Add/edit company name, contact, phone, email, tax ID, address, group, branch
  (read-only), Sales owner, pilot flag and care notes.
- Filter by status, group, Sales owner/unassigned, pilot/non-pilot; text search
  remains. CSV exports the filtered rows and pilot/ownership fields.
- Pilot badge and Sales column appear in the existing customer table.
- Profile detail includes notes, ownership, contact metadata, account presence,
  balances and recent orders. Existing activation/suspension remains available.
- New customers can have an initial B2B login or an offline profile only.
  Offline profiles have a separate create-account action in their detail dialog.
- Email is optional for creation. Linked login email is read-only in the profile
  editor. Phone login works without email; account activation remains a separate
  approval. No automatic password delivery, email invite or OTP is implied.

Admin/boss/sales can mutate scoped profiles. Accountant can view/export only.
Backend checks roles and branch ownership independently of visible controls.
Financial values are never submitted by the profile editor.

## Component And API Ownership

`components/admin/admin-customers.tsx`: table, filters, profile detail and action
coordination. `customer-editor.tsx`: profile/account forms, password confirmation,
loading/duplicate-submit guard. `lib/customer-management.ts`: directory contracts.

The actual customer table continues to use `/admin/state`, enriched with profile
fields/revisions. Directory metadata uses `/admin/customers?branch=...` through
the scoped API resource hook. After a successful write, the existing admin state
refresh updates every other customer consumer, including Sales/order/credit.

Forms retain a metadata snapshot while open; a background refresh does not
unmount them or discard a draft. Saving disables form inputs/dismissal and shows
a stable spinner. API errors stay inline and preserve entered data. Revision
conflicts require reopening the latest profile after reviewing the competing
change. Existing table/filters remain visible during refresh. Scope changes hide
the old form. No repeated auth/session refresh is added.

New mutation controls are API-mode only. Preview mode keeps its existing customer
view/status flow; it does not pretend that customer/account writes succeeded.

## Verification And Deployment

`npm run test:customers`: mocked Playwright checks at 1440/768/390/320px, real form
behavior, loading/duplicate clicks, failures/conflicts, preserved drafts during
background refresh, filtered pilot list, updates, offline onboarding and read-only
accountant access. No mutation reaches a real database. Existing auth/admin-loading
suites must also pass.

Deploy the backend schema/API first. Backend schema delta: customer revision and
nullable unique user email. See the backend repository's
`docs/customer-management.md` for contracts, financial safeguards and rollout.
This work does not implement the remaining Kiot/KPI/B2C solution requirements.

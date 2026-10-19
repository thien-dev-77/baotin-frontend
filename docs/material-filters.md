# Material filter UI

The storefront groups the raw `facets.material` values into short material
choices instead of showing every imported description as a checkbox. The first
six choices are visible initially; expansion scrolls within a 256px list. Selected
groups remain in the collapsed list and can be removed with `Bỏ chọn`.

The group definitions and aliases live in `lib/material-groups.ts`. They match
the backend's definitions, including explicit 304 grades, unspecified inox,
stainless versus ordinary steel, and products containing multiple materials.
Only groups present in published metadata or already selected are shown.
Product cards and details keep the original material text. Admin forms now also
support explicit group selections; see `docs/product-filter-attributes.md`.

New selections use repeated `materialGroup` URL parameters, retain other filters
and reset pagination. Old exact `material` parameters still work and appear as
removable selected labels. Choosing a grouped option removes the old exact
material constraint. The same controls work in the desktop sidebar and mobile
filter drawer, with keyboard-native checkboxes.

Deploy the compatible backend before this frontend. Older clients continue to
use exact `material` filters against the updated API; no data migration is needed.

```sh
npm run test:materials
```

The UI suite launches a localhost frontend and a read-only mock API. It verifies
bounded expansion, aliases, keyboard selection, URL scope/page reset, reload,
old links and mobile filtering. The backend separately tests real SQL matching.

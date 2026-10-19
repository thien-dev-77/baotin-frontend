# Material, color and origin selectors

Product creation/editing contains a `Phân loại bộ lọc` section with three boxed
selectors. Each keeps its detailed description and supports multiple canonical
choices. Until the first checkbox edit, the choices follow the description;
`Dùng tự động` clears the override. Clearing every checkbox deliberately stores
an empty array. Missing descriptions are never filled from brand assumptions.
Unsaved changes cover both descriptions and manual/automatic mode, and choices
persist across tabs, saving and reloads. New variants inherit their template's
selections, except a new color dimension starts in automatic mode and follows
its own value. The color description still comes from the variant dimension.

The storefront uses the same vocabulary in the sidebar and mobile drawer.
Published effective groups from API metadata are authoritative, with text
inference retained for older metadata. Groups are collapsed after six choices,
expanded lists scroll within 256px, and selected options remain visible.
Existing exact-text links remain removable. New grouped choices clear only the
corresponding legacy text constraint, retain other filters, and reset pagination.
The size facet is no longer shown in the listing filter panel.

Deploy the compatible backend before this frontend, because new saves include
the three nullable selection arrays and public filters include `colorGroup` and
`originGroup`. Product text and SKU variant identity are preserved.

```sh
npm run test:product-filters
```

The browser tests own local mock APIs and frontend processes, verify desktop
and mobile flows, and never write production data. Backend tests independently
verify actual persistence, filtering and the optional all-product sync command.

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
inference retained for older metadata. Group choices follow the current category
(including descendants), brand and search across all matching products, rather
than the global catalog or only the current result page. Empty facets are hidden;
selected values remain removable even if the current scope has no matches.
Groups are collapsed after six choices,
expanded lists scroll within 256px, and selected options remain visible.
Existing exact-text links remain removable. New grouped choices clear only the
corresponding legacy text constraint, retain other filters, and reset pagination.
The size facet is no longer shown in the listing filter panel.

While a listing navigation or personalized API request is pending, product cards
become skeletons in the current grid/list layout. The previous card count and
disabled pagination keep the layout stable. Placeholders have no product links
or actions, are hidden from screen readers, and respect reduced-motion settings.
The loading state ends on success, an empty result, or an API failure.

Deploy the compatible backend before this frontend, because new saves include
the three nullable selection arrays and public filters include `colorGroup` and
`originGroup`. Product text and SKU variant identity are preserved.

```sh
npm run test:product-filters
```

The browser tests own local mock APIs and frontend processes, verify desktop
and mobile flows, and never write production data. Backend tests independently
verify actual persistence, filtering and the optional all-product sync command.

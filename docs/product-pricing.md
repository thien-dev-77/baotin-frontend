# Product Pricing - 12 October 2026

## Admin

`/admin/products` displays and exports five columns:

| Column | Editable | API field |
| --- | --- | --- |
| Gia niem yet (VND) | Yes | `listPrice` |
| Chiet khau B2C (%) | Yes | `b2cDiscount` |
| Gia sau CK B2C (VND) | Computed | `price` |
| Chiet khau B2B (%) | Yes | `b2bDiscount` |
| Gia sau CK B2B (VND) | Computed, product default | Not persisted |

The new/edit form uses `ProductPricingFields` and `lib/product-pricing.ts`.
Only admin, boss and sales may save products. Warehouse sees no pricing columns
or pricing data in CSV. Stock remains managed separately in the ledger.

Both discounts apply independently to list price, not to the other discounted
price. Example: list `100000`, B2C `20`, B2B `35` gives `80000` and `65000`.
Discounts accept 0-99.99 with at most two decimal places; money is whole VND,
0-999999999999. Calculations round to nearest whole VND, half up, and retain
at least 1 VND when list price is positive. Zero is permitted for private drafts,
not published products.

Send all three editable pricing fields together. Backend derives `price` and
`oldPrice` itself; `b2bPrice` is a display/export value, not an accepted DTO field.
Do not trust a client-submitted final purchase price.

## Customer Prices

The B2B column in admin is the product default, not a quote for every customer.
Existing applicable policy priority is preserved:

1. Customer-specific policy.
2. Customer-group policy.
3. Branch default policy.
4. Product default B2B discount when no policy applies.

Within the selected policy, an explicit SKU price takes precedence over the
policy percentage. Policy percentages use list price on configured products.
On legacy products, their original retail-price basis remains unchanged.
Inactive or anonymous customers use B2C prices.

Storefront cards, search filters, cart and detail purchase panels use
`customerPrice` from the authenticated API. Product detail shows the effective
B2B percentage and price, including group/customer overrides. A special price
above list price is labeled `Gia rieng`, not shown as a negative discount.
Guests cannot see the default B2B rate; login is required. Logout removes
`customerPrice` and `b2bDiscount` from frontend product state.

## Legacy Data

There is no bulk price rewrite. Products without the three new pricing fields
keep their exact `price`/`oldPrice`. Admin derives a reference B2C percentage
from the legacy values, displays B2B as unconfigured, and does not infer a B2B
discount from customer or group policies.

Editing only content, photos or visibility preserves the original values.
Editing any pricing input explicitly converts the product to the new model.
The reference percentage is rounded to two decimal places, so conversion can
slightly change the legacy price; the form previews the resulting price before
save. Existing order item snapshots and totals are never recalculated by a
catalog edit.

## Excel And Deployment

Use [catalog template v2](../public/templates/bao-tin-catalog-mau-v2.xlsx).
It includes independent B2C/B2B formulas and protected calculated cells.
See [Excel contract](catalog-excel-template.md). Upload/import of a workbook
is not implemented yet; the sample prepares data and never writes a database.

Deploy the backend accepting the new DTO fields before this frontend.
No JSONB migration or seed rewrite is needed. Existing active branch/group
policies continue to override product default discounts until edited or disabled.
Kiot retail imports cannot silently replace configured list/discount pricing;
if the remote price differs, update the admin pricing configuration first.

## Verification

```sh
npm run test:pricing
npm run test:catalog-template
```

Browser tests mock all writes and cover four viewport widths, read-only final
prices, fractional discounts, legacy preservation, CSV and guest/B2B detail.
Backend pricing, catalog and checkout tests run only against disposable local
schemas. See the backend [pricing contract](https://github.com/thien-dev-77/baotin-backend/blob/develop/docs/product-pricing.md).

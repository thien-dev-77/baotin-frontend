import { expect, test } from "@playwright/test";
import { catalog, categoryCatalog } from "../lib/catalog";
import { homeShowcaseProducts } from "../lib/home-showcase";

test("Feature flags take priority; an uncurated catalog falls back to real, diverse products", () => {
  const products = catalog.map(product => ({ ...product, featured: false }));
  const snapshot = JSON.stringify(products);
  const selected = homeShowcaseProducts(products, categoryCatalog);
  expect(selected.featured).toHaveLength(10);
  expect(new Set(selected.featured.slice(0, 5).map(product => product.category)).size).toBe(5);
  expect(JSON.stringify(products)).toBe(snapshot);
  const marked = { ...products[4], featured: true };
  expect(homeShowcaseProducts([marked, ...products], categoryCatalog).featured).toEqual([marked]);
});

test("No duplicate variants, hidden categories or incomplete products are recommended", () => {
  const product = catalog[0];
  const sibling = { ...product, id: "sibling", variantGroupId: product.id };
  const group = { ...product, variantGroupId: product.id };
  const result = homeShowcaseProducts([sibling, group, { ...product, id: "bad", image: "" }], categoryCatalog);
  expect(result.recommended.map(product => product.id)).toEqual([product.id]);
  expect(homeShowcaseProducts([product], categoryCatalog.map(category => ({ ...category, visible: false }))).recommended).toEqual([]);
  const categories = categoryCatalog.map(category => category.slug === product.category ? { ...category, parentSlug: "new-root" } : category);
  categories.push({ ...categoryCatalog[0], slug: "new-root", visible: false });
  expect(homeShowcaseProducts([product], categories).recommended).toEqual([]);
});

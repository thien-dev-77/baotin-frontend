import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { catalog } from "../lib/catalog";
import { ProductVariantSelector } from "../components/product-detail/product-variant-selector";
import { ProductVariantFields } from "../components/admin/product-variant-fields";
import { chooseVariant } from "../lib/product-variants";

const base = catalog[0];
const variants = [
  { ...base, id: "600-silver", slug: "600-silver", variantGroupId: "600-silver", variantAttributes: [{ name: "Kích thước khoang tủ (T)", value: "600mm" }, { name: "Màu sắc", value: "Bạc" }] },
  { ...base, id: "800-silver", slug: "800-silver", variantGroupId: "600-silver", variantAttributes: [{ name: "Kích thước khoang tủ (T)", value: "800mm" }, { name: "Màu sắc", value: "Bạc" }] },
  { ...base, id: "600-black", slug: "600-black", variantGroupId: "600-silver", variantAttributes: [{ name: "Kích thước khoang tủ (T)", value: "600mm" }, { name: "Màu sắc", value: "Đen" }] },
];

test("Storefront labels point to each SKU even when custom labels are identical", () => {
  const options = [
    { ...variants[0], code: "FCL303-L", variantAttributes: [{ name: "Phiên bản", value: "FCL303-L" }] },
    { ...variants[1], code: "FCL303-R", variantLabel: "Phải", variantAttributes: [{ name: "Phiên bản", value: "FCL303-R" }] },
    { ...variants[2], code: "FCL303-R2", variantLabel: "Phải", variantAttributes: [{ name: "Phiên bản", value: "FCL303-R2" }] },
  ];
  const html = renderToStaticMarkup(createElement(ProductVariantSelector, { product: options[1], variants: options }));
  assert.ok(html.includes('href="/products/600-silver">FCL303-L</a>'));
  assert.ok(html.includes('href="/products/800-silver">Phải</a>'));
  assert.ok(html.includes('href="/products/600-black">Phải</a>'));
  assert.equal(html.match(/aria-current="page"/g)?.length, 1);
});

test("Multi-attribute selection renders independent dimensions without a combined SKU picker", () => {
  const product = { ...variants[0], variantLabel: "<Phải>" };
  const html = renderToStaticMarkup(createElement(ProductVariantSelector, { product, variants: [product, ...variants.slice(1)] }));
  assert.ok(!html.includes('&lt;Phải&gt;'));
  assert.equal(html.match(/<fieldset>/g)?.length, 2);
  assert.ok(html.includes('>800mm</a>'));
  assert.ok(html.includes('>Đen</a>'));
});

test("Admin offers a custom label and uses SKU fallback in sibling links", () => {
  const html = renderToStaticMarkup(createElement(ProductVariantFields, {
    attributes: variants[0].variantAttributes, onChange: () => {}, label: "Phải", onLabelChange: () => {},
    groupId: variants[0].id, siblings: [{ ...variants[0], variantLabel: "Phải" }, { ...variants[1], code: "FCL303-L" }],
    currentId: variants[0].id, returnTo: "/admin/products", schemaLocked: true,
  }));
  assert.ok(html.includes('name="variantLabel"'));
  assert.ok(html.includes('value="Phải"'));
  assert.ok(html.includes('>Phải</a>'));
  assert.ok(html.includes('>FCL303-L</a>'));
});

test("Removing a type keeps every SKU with the same remaining values selectable", () => {
  const options = [
    { ...variants[0], code: "SHARED-A", variantAttributes: [{ name: "Kích thước", value: "600mm" }] },
    { ...variants[1], code: "SHARED-B", variantLabel: "Bản đặc biệt", variantAttributes: [{ name: "Kích thước", value: "600mm" }] },
    { ...variants[2], code: "SHARED-C", variantAttributes: [{ name: "Kích thước", value: "700mm" }] },
  ];
  assert.equal(chooseVariant(options, options[1], 0, "600mm")?.id, options[1].id);
  assert.equal(chooseVariant(options, options[1], 0, "700mm")?.id, options[2].id);
  const html = renderToStaticMarkup(createElement(ProductVariantSelector, { product: options[1], variants: options }));
  assert.ok(!html.includes("Phiên bản"));
  assert.ok(html.includes('aria-label="Chọn mã SHARED-A"'));
  assert.ok(html.includes('aria-label="Chọn mã SHARED-B"'));
  assert.ok(!html.includes('aria-label="Chọn mã SHARED-C"'));
  assert.ok(html.includes("Bản đặc biệt"));
  assert.ok(html.includes("SHARED-B"));
  assert.ok(html.includes(">600mm</span>"));
});

test("A group with no types still links to each SKU without restoring a removed type", () => {
  const options = variants.map((product, index) => ({ ...product, code: `SHARED-${index}`, variantAttributes: [] }));
  const html = renderToStaticMarkup(createElement(ProductVariantSelector, { product: options[1], variants: options }));
  assert.ok(!html.includes("Phiên bản"));
  assert.ok(!html.includes("Kích thước"));
  assert.equal(html.match(/<fieldset>/g)?.length, 1);
  for (const option of options) assert.ok(html.includes(`aria-label="Chọn mã ${option.code}"`));
});


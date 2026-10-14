import { expect, test } from "@playwright/test";
import { catalog } from "../lib/catalog";
import { chooseVariant, variantDimension, variantLabel } from "../lib/product-variants";
import { getProductRecommendations } from "../lib/product-detail";

const base = catalog[0];
test("Variant labels prefer custom text and fall back to the exact SKU", () => {
  expect(variantLabel({ code: "FCL303-R", variantLabel: "  Phải  " })).toBe("Phải");
  for (const label of [undefined, "", "  "]) expect(variantLabel({ code: "FCL303-R", variantLabel: label })).toBe("FCL303-R");
});
const variants = [
  { ...base, id: "600-silver", slug: "600-silver", variantGroupId: "600-silver", variantAttributes: [{ name: "Kích thước khoang tủ (T)", value: "600mm" }, { name: "Màu sắc", value: "Bạc" }] },
  { ...base, id: "800-silver", slug: "800-silver", variantGroupId: "600-silver", variantAttributes: [{ name: "Kích thước khoang tủ (T)", value: "800mm" }, { name: "Màu sắc", value: "Bạc" }] },
  { ...base, id: "600-black", slug: "600-black", variantGroupId: "600-silver", variantAttributes: [{ name: "Kích thước khoang tủ (T)", value: "600mm" }, { name: "Màu sắc", value: "Đen" }] },
];

test("Changing one attribute retains compatible choices and selects an existing SKU", () => {
  expect(chooseVariant(variants, variants[0], 0, "800mm")?.id).toBe("800-silver");
  expect(chooseVariant(variants, variants[1], 1, "Đen")?.id).toBe("600-black");
  expect(chooseVariant(variants, variants[0], 0, "900mm")).toBeUndefined();
});

test("Flexible dimension names map to catalog size and color facets", () => {
  expect(variantDimension(variants[0].variantAttributes, "size")?.value).toBe("600mm");
  expect(variantDimension(variants[0].variantAttributes, "color")?.value).toBe("Bạc");
  expect(variantDimension([{ name: "Chất liệu", value: "Inox 304" }], "size")).toBeUndefined();
});

test("Other SKUs in the selected group are not related products", () => {
  const recommendations = getProductRecommendations(variants[0], [...variants, { ...base, id: "other-shelf" }]);
  expect(recommendations.related.map(product => product.id)).toEqual(["other-shelf"]);
});

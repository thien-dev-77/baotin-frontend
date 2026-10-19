import test from "node:test";
import assert from "node:assert/strict";
import { availableMaterialGroups, materialGroups, matchesMaterialGroups } from "../lib/material-groups";
import { catalog, categoryCatalog } from "../lib/catalog";
import { listingParams, previewCatalogPage } from "../lib/catalog-query";

const cases: [string, string[]][] = [
  ["SUS304", ["inox-304"]],
  ["SUS 304", ["inox-304"]],
  ["INOX 304 xước mờ", ["inox-304"]],
  ["Inox SUS304 và nhựa ABS", ["inox-304", "plastic"]],
  ["khung Inox 304 xước mờ. Vách + hộp lực bằng thép sơn tĩnh", ["inox-304", "steel"]],
  ["Khung sườn bằng nhôm, ray bằng thép không gỉ", ["inox-other", "aluminum"]],
  ["Thép không gỉ", ["inox-other"]],
  ["Thép / Nhựa", ["steel", "plastic"]],
  ["Nhôm và nhựa", ["aluminum", "plastic"]],
  ["Hợp kim kẽm + nắp nhựa", ["plastic", "alloy"]],
  ["- Thân Zamak; - Đầu chia nước Neoperl", ["alloy"]],
  ["Đồng mạ crôm và đá granite", ["copper", "stone"]],
  ["Cửa kính toàn phần, 3 lớp cách nhiệt", ["glass"]],
  ["Mặt gốm thủy tinh SCHOTT Ceran", ["glass"]],
  ["Polyamid", ["plastic"]],
  ["Cao su tổng hợp", ["rubber"]],
  ["Thanh chắn: Nhôm; ron: Silicone, tự dập lửa", ["aluminum", "rubber"]],
  ["Gỗ MDF", ["wood"]],
  ["Sứ", ["ceramic"]],
  ["Màu kem", ["other"]],
  ["Inox, kích thước 304mm", ["inox-other"]],
  ["Inox 201", ["inox-other"]],
  ["Vật liệu chưa xác định", ["other"]],
  ["", []],
  ["  ", []],
];

for (const [value, expected] of cases) {
  test("Material tags: " + JSON.stringify(value), () => {
    assert.deepEqual(materialGroups(value), expected);
  });
}

test("Compound materials use OR within material groups, preserving the source", () => {
  const raw = "Inox SUS304 và nhựa ABS";
  assert.equal(matchesMaterialGroups(raw, ["plastic"]), true);
  assert.equal(matchesMaterialGroups(raw, ["inox-304", "steel"]), true);
  assert.equal(matchesMaterialGroups(raw, ["steel"]), false);
  assert.equal(matchesMaterialGroups(raw, []), true);
  assert.equal(raw, "Inox SUS304 và nhựa ABS");
});

test("Options deduplicate spelling variations and retain selected groups", () => {
  assert.deepEqual(availableMaterialGroups(["SUS304", "SUS 304", "Inox 304 xước mờ", "Polyamid"], ["copper"]).map(group => group.value),
    ["inox-304", "plastic", "copper"]);
  assert.deepEqual(availableMaterialGroups(["", " "]), []);
});

test("Preview filtering preserves grouped OR matching, exact links and brand scope", () => {
  const products = ["SUS304", "SUS 304", "Inox 304 và nhựa ABS", "Polyamid", "Thép không gỉ", "Thép"].map((material, index) => ({ ...catalog[0], id: `QA-${index}`, slug: `qa-${index}`, material, brand: index === 5 ? "Fulco" : "HAFELE" }));
  const before = structuredClone(products);
  const groups = previewCatalogPage(products, categoryCatalog, new URLSearchParams("brand=HAFELE&materialGroup=inox-304&materialGroup=plastic"));
  assert.deepEqual(groups.products.map(row => row.id), ["QA-0", "QA-1", "QA-2", "QA-3"]);
  const exact = previewCatalogPage(products, categoryCatalog, new URLSearchParams("material=SUS304"));
  assert.deepEqual(exact.products.map(row => row.id), ["QA-0"]);
  assert.deepEqual(products, before);
  const params = listingParams({ materialGroup: ["inox-304", "plastic"], brand: "HAFELE", sort: "high" }, { brand: "Fulco" });
  assert.deepEqual(params.getAll("materialGroup"), ["inox-304", "plastic"]);
  assert.equal(params.get("brand"), "Fulco");
  assert.equal(params.get("sort"), "high");
});

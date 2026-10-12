import assert from "node:assert/strict";
import test from "node:test";
import ExcelJS from "exceljs";
import { CATALOG_TEMPLATE_FILENAME, CATALOG_TEMPLATE_SHEETS } from "../lib/catalog-template.mjs";
import { createCatalogTemplate, CATEGORY_COLUMNS, PRODUCT_COLUMNS, TEMPLATE_ROWS } from "../scripts/generate-catalog-template.mjs";

async function storedTemplate() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(new URL(`../public/templates/${CATALOG_TEMPLATE_FILENAME}`, import.meta.url).pathname);
  return workbook;
}

test("Generated and downloadable workbooks have the same five sheets and schema", async () => {
  const generated = await createCatalogTemplate();
  const stored = await storedTemplate();
  for (const workbook of [generated, stored]) {
    assert.deepEqual(workbook.worksheets.map((sheet) => sheet.name), CATALOG_TEMPLATE_SHEETS);
    assert.deepEqual(workbook.getWorksheet("DanhMuc").getRow(1).values.slice(1), CATEGORY_COLUMNS.map((column) => column.key));
    assert.deepEqual(workbook.getWorksheet("SanPham").getRow(1).values.slice(1), PRODUCT_COLUMNS.map((column) => column.key));
    for (const sheet of workbook.worksheets) sheet.eachRow((row) => row.eachCell((cell) => assert.notEqual(cell.type, ExcelJS.ValueType.Formula)));
  }
});

test("Input sheets are empty, retain text SKU formatting and validate 500 rows", async () => {
  const workbook = await storedTemplate();
  for (const name of ["DanhMuc", "SanPham"]) {
    const sheet = workbook.getWorksheet(name);
    assert.equal(sheet.views[0].state, "frozen");
    assert.equal(sheet.views[0].ySplit, 1);
    for (let row = 2; row <= TEMPLATE_ROWS + 1; row++) sheet.getRow(row).eachCell({ includeEmpty: true }, (cell) => assert.equal(cell.value, null));
  }
  const products = workbook.getWorksheet("SanPham");
  assert.equal(products.getCell("B2").numFmt, "@");
  assert.equal(products.getCell(`B${TEMPLATE_ROWS + 1}`).numFmt, "@");
  assert.equal(products.getCell("H2").dataValidation.type, "whole");
  assert.equal(products.getCell("R2").dataValidation.type, "list");
  assert.deepEqual(products.getCell(`R${TEMPLATE_ROWS + 1}`).dataValidation.formulae, ['"TRUE,FALSE"']);
  assert.match(products.getCell("P1").note, /10 URL/);
  assert.match(products.getCell("B1").note, /Text/);
  const headers = products.getRow(1).values;
  for (const forbidden of ["stock", "customerPrice", "id", "revision"]) assert.equal(headers.includes(forbidden), false);
});

test("Examples are private, reference valid groups and preserve gallery order", async () => {
  const workbook = await storedTemplate();
  const categorySheet = workbook.getWorksheet("ViDuDanhMuc");
  const productSheet = workbook.getWorksheet("ViDuSanPham");
  const categories = new Map();
  categorySheet.eachRow((row, index) => {
    if (index === 1) return;
    categories.set(row.getCell(1).value, row.getCell(5).value.split(" | "));
    assert.equal(row.getCell(6).value, false);
  });
  assert.equal(categories.size, 8);
  assert.equal(productSheet.rowCount, 5);
  productSheet.eachRow((row, index) => {
    if (index === 1) return;
    assert.equal(categories.get(row.getCell(4).value).includes(row.getCell(5).value), true);
    assert.equal(row.getCell(18).value, false);
    assert.match(row.getCell(2).value, /^MAU-/);
    assert.equal(typeof row.getCell(8).value, "number");
    assert.ok(row.getCell(9).value === null || row.getCell(9).value >= row.getCell(8).value);
  });
  assert.equal(productSheet.getCell("P2").value.split(" | ")[0], "/images/catalog/led-strip-hd.jpg");
  assert.match(workbook.getWorksheet("HuongDan").getCell("B2").value, /chưa có upload\/import Excel/);
});

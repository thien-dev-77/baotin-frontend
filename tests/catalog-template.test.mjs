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
const column = (sheet, key) => sheet.getRow(1).values.indexOf(key);
const productCell = (sheet, row, key) => sheet.getCell(row, column(sheet, key));

test("Generated and downloadable workbooks have the same five sheets and schema", async () => {
  const generated = await createCatalogTemplate();
  const stored = await storedTemplate();
  for (const workbook of [generated, stored]) {
    assert.deepEqual(workbook.worksheets.map((sheet) => sheet.name), CATALOG_TEMPLATE_SHEETS);
    assert.deepEqual(workbook.getWorksheet("DanhMuc").getRow(1).values.slice(1), CATEGORY_COLUMNS.map((column) => column.key));
    assert.deepEqual(workbook.getWorksheet("SanPham").getRow(1).values.slice(1), PRODUCT_COLUMNS.map((column) => column.key));
    for (const sheet of workbook.worksheets) sheet.eachRow((row) => row.eachCell((cell) => {
      if (cell.type === ExcelJS.ValueType.Formula) assert.ok(["SanPham", "ViDuSanPham"].includes(sheet.name) && ["price", "b2bPrice"].includes(sheet.getCell(1, cell.col).value));
    }));
  }
});

test("Input sheets are empty, retain text SKU formatting and validate 500 rows", async () => {
  const workbook = await storedTemplate();
  for (const name of ["DanhMuc", "SanPham"]) {
    const sheet = workbook.getWorksheet(name);
    assert.equal(sheet.views[0].state, "frozen");
    assert.equal(sheet.views[0].ySplit, 1);
    for (let row = 2; row <= TEMPLATE_ROWS + 1; row++) sheet.getRow(row).eachCell({ includeEmpty: true }, (cell) => {
      if (cell.type !== ExcelJS.ValueType.Formula) assert.equal(cell.value, null);
    });
  }
  const products = workbook.getWorksheet("SanPham");
  assert.equal(products.getCell("B2").numFmt, "@");
  assert.equal(products.getCell(`B${TEMPLATE_ROWS + 1}`).numFmt, "@");
  assert.equal(products.getCell("H2").dataValidation.type, "whole");
  assert.equal(productCell(products, 2, "published").dataValidation.type, "list");
  assert.deepEqual(productCell(products, TEMPLATE_ROWS + 1, "published").dataValidation.formulae, ['"TRUE,FALSE"']);
  assert.match(productCell(products, 1, "gallery").note, /10 URL/);
  assert.equal(productCell(products, 2, "b2cDiscount").dataValidation.type, "custom");
  assert.match(productCell(products, 2, "b2cDiscount").dataValidation.formulae[0], /99\.99/);
  assert.equal(productCell(products, 2, "price").protection?.locked ?? true, true);
  assert.equal(productCell(products, 2, "b2bPrice").protection?.locked ?? true, true);
  assert.equal(products.sheetProtection.sheet, true);
  assert.equal(productCell(products, 2, "listPrice").protection.locked, false);
  assert.match(productCell(products, 2, "price").formula, /H2.*I2/);
  assert.match(productCell(products, 2, "b2bPrice").formula, /H2.*K2/);
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
    assert.equal(productCell(productSheet, index, "published").value, false);
    assert.match(row.getCell(2).value, /^MAU-/);
    assert.equal(typeof productCell(productSheet, index, "listPrice").value, "number");
    assert.equal(productCell(productSheet, index, "price").result, Math.round(productCell(productSheet, index, "listPrice").value * (100 - productCell(productSheet, index, "b2cDiscount").value) / 100));
    assert.equal(productCell(productSheet, index, "b2bPrice").result, Math.round(productCell(productSheet, index, "listPrice").value * (100 - productCell(productSheet, index, "b2bDiscount").value) / 100));
  });
  assert.equal(productCell(productSheet, 2, "gallery").value.split(" | ")[0], "/images/catalog/led-strip-hd.jpg");
  assert.match(workbook.getWorksheet("HuongDan").getCell("B2").value, /chưa có upload\/import Excel/);
});

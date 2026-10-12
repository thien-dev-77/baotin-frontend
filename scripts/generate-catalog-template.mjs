import ExcelJS from "exceljs";
import { mkdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CATALOG_TEMPLATE_FILENAME, CATALOG_TEMPLATE_SHEETS } from "../lib/catalog-template.mjs";

export const TEMPLATE_ROWS = 500;
export const ARRAY_SEPARATOR = " | ";
const MAX_PRICE = 999999999999;
const COLORS = { primary: "FF123359", accent: "FF147AD6", text: "FF243B53", border: "FFDCE5EF", stripe: "FFF4F8FC", white: "FFFFFFFF" };
const ROOT = fileURLToPath(new URL("../", import.meta.url));

const text = (key, title, limit, required = false, note = "", width = 24) => ({ key, title, limit, required, note, width, type: "text" });
const integer = (key, title, max, required = true, note = "") => ({ key, title, max, required, note, width: 22, type: "integer" });
const boolean = (key, title, note) => ({ key, title, required: true, note, width: 20, type: "boolean" });

export const CATEGORY_COLUMNS = [
  text("slug", "Mã danh mục", 80, true, "Chữ thường không dấu, số và dấu gạch nối; không trùng danh mục đã có."),
  text("name", "Tên danh mục", 120, true, "Từ 2 đến 120 ký tự, không trùng tên danh mục đã có.", 30),
  text("image", "Ảnh đại diện", 500, false, "URL tương đối của ảnh đã có trên backend. Bắt buộc khi visible=TRUE.", 50),
  text("description", "Mô tả danh mục", 2000, false, "Văn bản thuần, không HTML.", 50),
  text("subcategories", "Nhóm sản phẩm", 5100, false, "Ngăn cách bằng |. Tối đa 50 nhóm, mỗi nhóm 1-100 ký tự, không trùng nhau.", 65),
  boolean("visible", "Hiển thị danh mục", "TRUE: hiện trên website. FALSE: ẩn danh mục; không tự ẩn sản phẩm."),
  integer("sortOrder", "Thứ tự hiển thị", 100000, true, "Số nhỏ đứng trước; điền 0, 10, 20..."),
];
export const PRODUCT_COLUMNS = [
  text("name", "Tên sản phẩm", 200, true, "Từ 2 đến 200 ký tự.", 38),
  text("code", "Mã hàng / SKU", 80, true, "Giữ định dạng Text, kể cả mã có số 0 đầu. Không trùng SKU đã có."),
  text("slug", "Đường dẫn sản phẩm", 200, true, "Chữ thường không dấu, số và dấu gạch nối; không trùng đường dẫn đã có.", 38),
  text("category", "Mã danh mục", 80, true, "Dùng slug của danh mục, không dùng tên. Danh mục phải tồn tại hoặc được tạo trước."),
  text("subcategory", "Nhóm sản phẩm", 100, false, "Phải khớp tên nhóm thuộc danh mục; không bắt buộc."),
  text("brand", "Thương hiệu", 80, true),
  text("unit", "Đơn vị tính", 30, true, "Ví dụ: cái, bộ, m, thanh. Không kèm dấu /.", 18),
  integer("price", "Giá bán lẻ (VND)", MAX_PRICE, true, "Số nguyên, không ký hiệu tiền hoặc dấu phân cách. Công khai cần giá > 0."),
  integer("oldPrice", "Giá cũ (VND)", MAX_PRICE, false, "Có thể bỏ trống; nếu điền phải >= price."),
  text("specification", "Thông số kỹ thuật", 500, false, "Bắt buộc khi published=TRUE.", 44),
  text("material", "Chất liệu", 100),
  text("color", "Màu sắc", 100),
  text("size", "Kích thước", 100),
  text("origin", "Xuất xứ", 100),
  text("description", "Mô tả sản phẩm", 10000, false, "Văn bản thuần, không HTML.", 55),
  text("gallery", "Danh sách ảnh", 5100, false, "Tối đa 10 URL ảnh trên backend, ngăn cách bằng |; ảnh đầu là ảnh đại diện. Công khai cần ít nhất 1 ảnh.", 65),
  boolean("featured", "Sản phẩm nổi bật", "Điền TRUE hoặc FALSE; nên dùng FALSE khi mới nhập."),
  boolean("published", "Công khai sản phẩm", "FALSE: riêng tư. TRUE: công khai khi đã đủ giá, thông số và ảnh."),
];

function validation(column) {
  const common = {
    allowBlank: !column.required, showErrorMessage: true, errorStyle: "stop",
    errorTitle: "Giá trị không hợp lệ", showInputMessage: true,
    promptTitle: column.title, prompt: column.note.slice(0, 250),
  };
  if (column.type === "boolean") return { ...common, type: "list", formulae: ['"TRUE,FALSE"'], error: "Chọn TRUE hoặc FALSE." };
  if (column.type === "integer") return { ...common, type: "whole", operator: "between", formulae: [0, column.max], error: `Nhập số nguyên từ 0 đến ${column.max}.` };
  return { ...common, type: "textLength", operator: "between", formulae: [column.required ? (column.key === "name" ? 2 : 1) : 0, column.limit], error: `Nhập văn bản tối đa ${column.limit} ký tự.` };
}

function dataSheet(workbook, name, columns, examples = []) {
  const sheet = workbook.addWorksheet(name, {
    properties: { tabColor: { argb: examples.length ? COLORS.accent : COLORS.primary } },
    views: [{ state: "frozen", ySplit: 1, xSplit: name.includes("SanPham") ? 2 : 1 }],
  });
  sheet.columns = columns.map((column) => ({ header: column.key, key: column.key, width: column.width }));
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
  sheet.getRow(1).height = 30;
  columns.forEach((column, index) => {
    const cell = sheet.getCell(1, index + 1);
    cell.note = `${column.title}\n${column.required ? "Bắt buộc" : "Có thể bỏ trống"}\n${column.note}`;
    cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: COLORS.white } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: column.required ? COLORS.primary : COLORS.accent } };
    cell.alignment = { vertical: "middle" };
  });
  const lastRow = examples.length ? examples.length + 1 : TEMPLATE_ROWS + 1;
  for (let row = 2; row <= lastRow; row++) {
    sheet.getRow(row).height = examples.length ? 48 : 24;
    columns.forEach((column, index) => {
      const cell = sheet.getCell(row, index + 1);
      const value = examples[row - 2]?.[column.key];
      cell.value = Array.isArray(value) ? value.join(ARRAY_SEPARATOR) : value ?? null;
      cell.numFmt = column.type === "integer" ? "#,##0" : "@";
      cell.font = { name: "Calibri", size: 11, color: { argb: COLORS.text } };
      cell.alignment = { vertical: "middle", wrapText: true };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: row % 2 ? COLORS.stripe : COLORS.white } };
      cell.border = { bottom: { style: "hair", color: { argb: COLORS.border } } };
      cell.dataValidation = validation(column);
    });
  }
  return sheet;
}

function instructions(workbook) {
  const sheet = workbook.addWorksheet(CATALOG_TEMPLATE_SHEETS[0], { views: [{ showGridLines: false }] });
  sheet.columns = [{ width: 28 }, { width: 50 }, { width: 65 }];
  sheet.mergeCells("A1:C1");
  sheet.getCell("A1").value = "BẢO TÍN | MẪU EXCEL CATALOG";
  sheet.getCell("A1").font = { name: "Calibri", size: 18, bold: true, color: { argb: COLORS.white } };
  sheet.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.primary } };
  sheet.getRow(1).height = 40;
  const notes = [
    ["Phạm vi", "File chuẩn bị dữ liệu catalog v1. Admin hiện chưa có upload/import Excel tự động. Điền file không tự ghi dữ liệu vào hệ thống."],
    ["Sheet nhập liệu", "Điền DanhMuc và SanPham từ hàng 2. Giữ nguyên tên sheet và hàng tiêu đề. Hai sheet này đang trống để không nhập nhầm dữ liệu ví dụ."],
    ["Dữ liệu tham khảo", "ViDuDanhMuc và ViDuSanPham chỉ là ví dụ dựa trên mock catalog, không phải danh sách hiện tại trên database. Không nhập hai sheet ví dụ."],
    ["Thứ tự chuẩn bị", "Danh mục trước, sản phẩm sau. Nếu dùng danh mục đã có, lấy đúng slug và nhóm trong admin; không tạo lại các danh mục ví dụ."],
    ["Cột dữ liệu", "Tiêu đề tiếng Anh khớp DTO backend. Xem ghi chú ở mỗi tiêu đề và bảng giải thích phía dưới. Cột xanh đậm bắt buộc; cột xanh nhạt có thể trống, trừ điều kiện công khai."],
    ["Mã hàng và đường dẫn", "Mã hàng là Text để giữ số 0 đầu. slug chỉ dùng chữ thường không dấu, số, dấu -. Mã hàng và slug phải duy nhất; tránh dùng mã MAU- của ví dụ."],
    ["Giá", "Điền số nguyên VND, ví dụ 45000; không gõ 45.000đ. oldPrice có thể trống, nếu có phải >= price. Sản phẩm công khai cần price > 0."],
    ["Trạng thái", "Chọn TRUE/FALSE. Nên để published=FALSE khi chuẩn bị sản phẩm. visible=FALSE chỉ ẩn danh mục, không tự ẩn sản phẩm thuộc danh mục."],
    ["Nhiều ảnh / nhóm", "gallery và subcategories dùng dấu |, ví dụ /media/uploads/a.webp | /media/uploads/b.webp. gallery tối đa 10 ảnh, ảnh đầu là đại diện. subcategories tối đa 50 nhóm, không trùng."],
    ["Hình ảnh", "Chỉ dùng URL tương đối của ảnh đã upload trên backend: /images/... hoặc /media/images/... hoặc /media/uploads/.... JPEG/PNG/WebP. Không dùng URL ngoài, tên file local hay chèn ảnh trong Excel."],
    ["Công khai", "published=TRUE cần tên, SKU, danh mục, thương hiệu, đơn vị, giá > 0, specification và gallery hợp lệ. visible=TRUE cần image đã có trên backend."],
    ["Không nhập ở đây", "Không có cột tồn kho, giá riêng B2B, công nợ, id hay revision. Tồn kho thuộc nghiệp vụ kho; cập nhật sản phẩm cũ cần luồng kiểm tra revision riêng."],
    ["Giới hạn mẫu", `Có định dạng và kiểm tra ô cho ${TEMPLATE_ROWS} dòng nhập mỗi sheet. Có thể thêm dòng, nhưng đây không phải giới hạn đã được một API import xác nhận.`],
  ];
  for (const [title, detail] of notes) {
    const row = sheet.addRow([title, detail]);
    sheet.mergeCells(row.number, 2, row.number, 3);
    row.height = 44;
    row.alignment = { vertical: "middle", wrapText: true };
    row.font = { name: "Calibri", size: 11, color: { argb: COLORS.text } };
    row.getCell(1).font = { ...row.font, bold: true };
  }
  for (const [name, columns] of [["DanhMuc", CATEGORY_COLUMNS], ["SanPham", PRODUCT_COLUMNS]]) {
    const heading = sheet.addRow([name, "Ý nghĩa / bắt buộc", "Quy tắc"]);
    heading.font = { name: "Calibri", bold: true, color: { argb: COLORS.white } };
    heading.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.primary } };
    heading.height = 28;
    for (const column of columns) {
      const row = sheet.addRow([column.key, `${column.title} · ${column.required ? "Bắt buộc" : "Có thể trống"}`, column.note || `Văn bản tối đa ${column.limit} ký tự.`]);
      row.height = 36;
      row.alignment = { vertical: "middle", wrapText: true };
      row.font = { name: "Calibri", size: 11, color: { argb: COLORS.text } };
    }
  }
  return sheet;
}

export async function createCatalogTemplate() {
  const examples = JSON.parse(await readFile(new URL("./catalog-template-examples.json", import.meta.url), "utf8"));
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Bao Tin";
  workbook.title = "Bao Tin Catalog Template v1";
  instructions(workbook);
  dataSheet(workbook, CATALOG_TEMPLATE_SHEETS[1], CATEGORY_COLUMNS);
  dataSheet(workbook, CATALOG_TEMPLATE_SHEETS[2], PRODUCT_COLUMNS);
  dataSheet(workbook, CATALOG_TEMPLATE_SHEETS[3], CATEGORY_COLUMNS, examples.categories);
  dataSheet(workbook, CATALOG_TEMPLATE_SHEETS[4], PRODUCT_COLUMNS, examples.products);
  return workbook;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = resolve(ROOT, "public/templates", CATALOG_TEMPLATE_FILENAME);
  await mkdir(dirname(output), { recursive: true });
  const workbook = await createCatalogTemplate();
  await workbook.xlsx.writeFile(output);
  console.log(`Created ${output}`);
}

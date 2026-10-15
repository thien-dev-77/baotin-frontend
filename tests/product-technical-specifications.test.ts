import test from "node:test";
import assert from "node:assert/strict";
import { getTechnicalSpecificationRows } from "../lib/product-technical-specifications";

test("Technical text creates one row per label and keeps later colons in the value", () => {
  const content = "Model: FULCO FC-ML338i\nLoại sản phẩm: Bếp từ đôi âm\nĐiện áp: 220–240V ~ 50–60Hz\nHỗ trợ: https://example.test:8443/guide\nBảo hành: 5 năm";
  assert.deepEqual(getTechnicalSpecificationRows(content), [
    ["Model", "FULCO FC-ML338i"],
    ["Loại sản phẩm", "Bếp từ đôi âm"],
    ["Điện áp", "220–240V ~ 50–60Hz"],
    ["Hỗ trợ", "https://example.test:8443/guide"],
    ["Bảo hành", "5 năm"],
  ]);
});

test("CKEditor paragraphs, breaks and list items become rows with decoded text", () => {
  const content = '<p><strong>Model:</strong>&nbsp;FULCO FC-ML338i<br>Chức năng nấu: Giữ ấm &amp; Giã đông</p><ul><li>* Công suất: &lt; 2800W</li><li>Kích thước：730 × 430 mm</li></ul><p>Bảo hành: 5 năm</p>';
  assert.deepEqual(getTechnicalSpecificationRows(content), [
    ["Model", "FULCO FC-ML338i"],
    ["Chức năng nấu", "Giữ ấm & Giã đông"],
    ["Công suất", "< 2800W"],
    ["Kích thước", "730 × 430 mm"],
    ["Bảo hành", "5 năm"],
  ]);
});

test("Continuation lines stay with their value, including URLs and empty labels", () => {
  assert.deepEqual(getTechnicalSpecificationRows("Chức năng:\nGiữ ấm\nGiã đông\nHướng dẫn:\nhttps://example.test/manual\nBảo hành: 5 năm"), [
    ["Chức năng", "Giữ ấm\nGiã đông"],
    ["Hướng dẫn", "https://example.test/manual"],
    ["Bảo hành", "5 năm"],
  ]);
});

test("Imported CKEditor tables retain cell text even with paragraphs and merged cells", () => {
  assert.deepEqual(getTechnicalSpecificationRows('<table><thead><tr><th>Model</th><th>FC-ML338i</th></tr></thead><tbody><tr><th><p>Điện áp</p></th><td><p>220–240V</p><p>50–60Hz</p></td></tr><tr><td colspan="2">Ghi chú: Lắp đặt âm bàn</td></tr></tbody></table>'), [
    ["Model", "FC-ML338i"],
    ["Điện áp", "220–240V 50–60Hz"],
    ["Ghi chú", "Lắp đặt âm bàn"],
  ]);
});

test("Content without separators and duplicate labels are preserved", () => {
  assert.deepEqual(getTechnicalSpecificationRows("Công suất < 2800W\nDùng cho bếp đôi\nVùng nấu: Trái\nVùng nấu: Phải"), [
    ["Thông số", "Công suất < 2800W\nDùng cho bếp đôi"],
    ["Vùng nấu", "Trái"],
    ["Vùng nấu", "Phải"],
  ]);
});

test("Executable and style content is discarded before parsing", () => {
  assert.deepEqual(getTechnicalSpecificationRows('<p onclick="alert(1)">Model: <strong>FC225</strong><img src="x" onerror="alert(1)"></p><script>Injected: bad</script><style>Injected: bad</style><p>Hỗ trợ: <a href="javascript:alert(1)">Tư vấn</a></p>'), [
    ["Model", "FC225"],
    ["Hỗ trợ", "Tư vấn"],
  ]);
});

test("Empty editor markup produces no rows instead of legacy specifications", () => {
  for (const content of [undefined, "", " \n ", "<p>&nbsp;</p>", "<p><br></p>"]) {
    assert.deepEqual(getTechnicalSpecificationRows(content), []);
  }
});

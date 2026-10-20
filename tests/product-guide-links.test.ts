import test from "node:test";
import assert from "node:assert/strict";
import DOMPurify from "isomorphic-dompurify";
import { safeHtml } from "../lib/safe-html";
import { productContentHtml } from "../lib/product-content";

const options = { autoLink: true, linksInNewTab: true };
const pdf = "https://www.hafele.com.vn/hap-live/static/WFS/Haefele-HVN-Site/-/Hafele/vi_VN/pim/documents/mf_info-04986451.pdf";
const catalog = "https://www.hafele.com.vn/hap-live/web/WFS/Haefele-HVN-Site/vi_VN/-/VND/Static-View/pdfcatalog/vi_VN/catalogs/index.php?catalog=Door_Hardware2022&startpage=176";
const parse = (html: string) => DOMPurify.sanitize(html, { RETURN_DOM: true, ADD_ATTR: ["target"] }) as HTMLElement;

test("Imported manual text becomes clickable PDF/catalog URLs with intact query parameters and line breaks", () => {
  const body = parse(safeHtml(productContentHtml(`${pdf}\nDoor_Hardware2022 Trang sản phẩm176: ${catalog}`), options));
  const links = Array.from(body.querySelectorAll("a"));
  assert.deepEqual(links.map(link => link.getAttribute("href")), [pdf, catalog]);
  assert.deepEqual(links.map(link => link.textContent), [pdf, catalog]);
  assert.equal(body.querySelectorAll("br").length, 1);
  assert.ok(body.textContent?.includes("Door_Hardware2022 Trang sản phẩm176:"));
  for (const link of links) {
    assert.equal(link.getAttribute("target"), "_blank");
    assert.equal(link.getAttribute("rel"), "noopener noreferrer");
  }
});

test("Rich formatting and existing link labels survive without nested or duplicate anchors", () => {
  const body = parse(safeHtml(`<h3>Tài liệu</h3><ul><li><strong>PDF:</strong> ${pdf}</li><li><a href="${catalog.replace(/&/g, "&amp;")}" target="_self" rel="opener">Hướng dẫn lắp đặt</a></li></ul><table><tbody><tr><td>${pdf}</td></tr></tbody></table>`, options));
  assert.equal(body.querySelectorAll("a").length, 3); assert.equal(body.querySelectorAll("a a").length, 0);
  assert.equal(body.querySelectorAll("strong, h3, ul, table").length, 4);
  assert.equal(body.querySelectorAll("a")[1].textContent, "Hướng dẫn lắp đặt");
  for (const link of Array.from(body.querySelectorAll("a"))) {
    assert.equal(link.getAttribute("target"), "_blank"); assert.equal(link.getAttribute("rel"), "noopener noreferrer");
  }
});

test("Addresses exclude prose punctuation while retaining valid parentheses, accents, fragments and www addresses", () => {
  const body = parse(safeHtml(productContentHtml("Tài liệu (https://example.test/manual(v2).pdf). Xem www.example.test/docs#page=2; thêm https://example.test/hướng-dẫn?a=1&b=2!"), options));
  const links = Array.from(body.querySelectorAll("a"));
  assert.deepEqual(links.map(link => link.getAttribute("href")), ["https://example.test/manual(v2).pdf", "https://www.example.test/docs#page=2", "https://example.test/h%C6%B0%E1%BB%9Bng-d%E1%BA%ABn?a=1&b=2"]);
  assert.ok(body.textContent?.endsWith("a=1&b=2!")); assert.ok(body.textContent?.includes("manual(v2).pdf)."));
});

test("Link detection cannot introduce executable markup, unsafe hrefs or event handlers", () => {
  const body = parse(safeHtml(`<p>https://example.test/manual?file=&quot;onclick=alert(1)</p><a href="javascript:alert(1)" onclick="alert(1)">Lỗi</a><a href="data:text/html,test">Dữ liệu</a><script>window.injected=true</script><img src=x onerror=alert(1)>`, options));
  assert.equal(body.querySelectorAll("script, img, [onclick], [onerror], [href^='javascript:'], [href^='data:']").length, 0);
  assert.deepEqual(Array.from(body.querySelectorAll("a[href]")).map(link => link.getAttribute("href")), ["https://example.test/manual?file="]);
});

test("Automatic links are opt-in and do not change other product rich text", () => {
  const html = `<p>${pdf} <a href="/guides" target="_self">Tài liệu</a></p>`;
  const body = parse(safeHtml(html));
  assert.equal(body.querySelectorAll("a").length, 1);
  assert.equal(body.querySelector("a")?.getAttribute("target"), "_self");
  assert.equal(body.querySelector("a")?.getAttribute("href"), "/guides");
});

test("Malformed addresses remain readable text without creating a broken anchor", () => {
  const body = parse(safeHtml(productContentHtml("Kiểm tra https:// và https://[invalid. Tài liệu mới: https://example.test/guide.pdf"), options));
  assert.equal(body.querySelectorAll("a").length, 1); assert.ok(body.textContent?.includes("https://[invalid."));
});

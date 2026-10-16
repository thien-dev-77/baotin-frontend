import { expect, test, type Page } from "@playwright/test";
import { createServer, type Server } from "node:http";
import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { mkdir, readFile } from "node:fs/promises";
import { catalog, categoryCatalog } from "../lib/catalog";
import type { ApiAdminState } from "../lib/api-types";
import { previewCatalogPage } from "../lib/catalog-query";
import { adminReadFixture } from "./admin-read-fixtures";
import type { ProductVariantCopyField } from "../lib/product-variant-copy";

const base = "http://127.0.0.1:3054";
const staff = { id: "qa-admin", name: "QA Admin", email: "qa@example.test", role: "admin", branches: ["Quy Nhơn"], customer: null };
const initialProduct = { ...catalog[0], id: "qa-rich-specification", slug: "qa-rich-specification", code: "QA-RICH", published: true, revision: 1, description: "Mô tả cũ", technicalDetails: "Kích thước: 730 × 430\nCông suất < 2800W", shortDescription: "", usageGuide: "", gallery: [catalog[0].image], showAuthenticityLabel: undefined as boolean | undefined };
let product = { ...initialProduct };
let server: Server;
let child: ChildProcess;
let logs = "";
test.setTimeout(120000);
test.use({ actionTimeout: 20000 });

test.beforeAll(async () => {
  server = createServer((incoming, outgoing) => {
    const url = new URL(incoming.url!, base);
    let body: unknown = {};
    if (url.pathname === "/api/health") body = { ready: true };
    else if (url.pathname === "/api/catalog/bootstrap" || url.pathname === "/api/catalog/selection") body = { products: [product], categories: categoryCatalog };
    else if (url.pathname.startsWith("/api/catalog/product/")) body = product;
    else if (url.pathname === "/api/catalog/search") body = previewCatalogPage([product], categoryCatalog, url.searchParams);
    else if (url.pathname === "/api/content" || url.pathname.startsWith("/api/reviews/")) body = { items: [] };
    outgoing.writeHead(200, { "Content-Type": "application/json" }); outgoing.end(JSON.stringify(body));
  });
  server.listen(0, "127.0.0.1"); await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("QA backend did not start.");
  child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "-p", "3054", "-H", "127.0.0.1"], {
    env: { ...process.env, BACKEND_URL: `http://127.0.0.1:${address.port}`, NEXT_PUBLIC_API_MODE: "true", NEXT_DIST_DIR: ".next-product-editor-qa" }, stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout?.on("data", data => { logs += data; }); child.stderr?.on("data", data => { logs += data; });
  for (let attempt = 0; attempt < 150; attempt++) {
    if (child.exitCode !== null) throw new Error(logs);
    if (await fetch(`${base}/api/backend/health`).then(response => response.ok).catch(() => false)) return;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`QA frontend startup failed: ${logs}`);
});
test.afterAll(async () => {
  if (child?.exitCode === null) { child.kill("SIGTERM"); await once(child, "exit"); }
  if (server?.listening) { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
});

async function mockEditor(page: Page, overrides: Partial<typeof initialProduct> = {}, options: { siblings?: ApiAdminState["products"]; copyError?: string; copyGate?: Promise<void> } = {}) {
  product = { ...initialProduct, ...overrides };
  const state: ApiAdminState = { products: [product, ...options.siblings || []], categories: categoryCatalog, orders: [], customers: [], approvals: [], receipts: [], warehouse: {}, paymentDueDates: {}, today: "2026-10-15" };
  const writes: Record<string, unknown>[] = [];
  const copies: { revision: number; fields: ProductVariantCopyField[]; products: { id: string; revision: number }[] }[] = [];
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  const imageFixture = await readFile("public/product-placeholder.svg");
  await page.route("**/_next/image?**", route => route.fulfill({ contentType: "image/svg+xml", body: imageFixture }));
  await page.route("**/api/backend/**", async route => {
    const request = route.request(), url = new URL(request.url());
    const path = url.pathname.slice("/api/backend".length);
    if (request.method() === "PATCH" && path === `/admin/products/${product.id}`) {
      const payload = request.postDataJSON() as Record<string, unknown>;
      writes.push(payload);
      product = { ...product, ...payload, revision: product.revision + 1 } as typeof product;
      state.products = state.products.map(item => item.id === product.id ? product : item);
      await route.fulfill({ json: { id: product.id, product } }); return;
    }
    if (request.method() === "POST" && path === `/admin/products/${product.id}/copy-to-variants`) {
      const payload = request.postDataJSON() as typeof copies[number]; copies.push(payload);
      if (options.copyGate) await options.copyGate;
      if (options.copyError) { await route.fulfill({ status: 409, json: { message: options.copyError } }); return; }
      const changes = Object.fromEntries(payload.fields.map(field => [field, product[field] ?? ""]));
      if (payload.fields.includes("technicalDetails")) changes.specification = product.specification;
      if (payload.fields.includes("gallery")) changes.image = product.gallery[0];
      state.products = state.products.map(item => payload.products.some(target => target.id === item.id) ? { ...item, ...changes, revision: (item.revision || 1) + 1 } : item);
      await route.fulfill({ json: { updated: payload.products.length } }); return;
    }
    if (request.method() !== "GET") { errors.push(`Unexpected write: ${path}`); await route.fulfill({ status: 405, json: {} }); return; }
    const responses: Record<string, unknown> = {
      "/auth/session": { user: staff }, "/admin/resources": state, "/admin/users": { users: [] },
      "/catalog/bootstrap": { products: [product], categories: categoryCatalog }, "/catalog/selection": { products: [product] },
      "/catalog/search": previewCatalogPage([product], categoryCatalog, url.searchParams),
      "/orders": [], "/account": { favorites: [] }, "/notifications/count": { unreadCount: 0 },
    };
    const body = adminReadFixture(url, state) || (path.startsWith("/catalog/product/") ? product : path.startsWith("/reviews/") ? { items: [] } : responses[path]);
    if (!body) errors.push(`Unexpected read: ${path}`);
    await route.fulfill({ status: body ? 200 : 404, json: body || {} });
  });
  return { writes, copies, errors, state };
}

for (const width of [1440, 390]) test(`Authenticity checkbox persists visibility on cards, gallery and zoom at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  const api = await mockEditor(page);
  await page.goto(`${base}/admin/products/${product.id}/edit`);
  const checkbox = page.getByRole("checkbox", { name: "Hiển thị nhãn phân phối chính hãng", exact: true });
  await expect(checkbox).toBeChecked();
  await expect(page.getByRole("textbox", { name: /Thông số kỹ thuật/ })).toBeVisible();
  await checkbox.uncheck();
  await expect(page.locator("form[data-unsaved=true]")).toHaveCount(1);
  await page.getByRole("button", { name: "Lưu sản phẩm", exact: true }).click();
  await expect.poll(() => api.writes.length).toBe(1);
  expect(api.writes[0].showAuthenticityLabel).toBe(false);
  await expect(checkbox).not.toBeChecked();
  await expect(page.locator("form[data-unsaved=true]")).toHaveCount(0);
  await page.goto(`${base}/search?q=${encodeURIComponent(product.code)}`);
  const card = page.locator(".bt-product-card").first();
  await expect(card).toBeVisible();
  await expect(card.locator("[data-product-authenticity]")).toHaveCount(0);
  await page.goto(`${base}/products/${product.slug}`);
  const gallery = page.getByRole("region", { name: "Hình ảnh sản phẩm", exact: true });
  await expect(gallery).toBeVisible();
  await expect(gallery.locator("[data-product-authenticity]")).toHaveCount(0);
  await gallery.getByRole("button", { name: "Phóng to ảnh", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("[data-product-authenticity]")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.goto(`${base}/admin/products/${product.id}/edit`);
  await expect(checkbox).not.toBeChecked();
  await expect(page.getByRole("textbox", { name: /Thông số kỹ thuật/ })).toBeVisible();
  await checkbox.check();
  await page.getByRole("button", { name: "Lưu sản phẩm", exact: true }).click();
  await expect.poll(() => api.writes.length).toBe(2);
  expect(api.writes[1].showAuthenticityLabel).toBe(true);
  await expect(checkbox).toBeChecked();
  await expect(page.locator("form[data-unsaved=true]")).toHaveCount(0);
  await page.goto(`${base}/search?q=${encodeURIComponent(product.name)}`);
  await expect(card.locator("[data-product-authenticity]")).toBeVisible();
  await page.goto(`${base}/products/${product.slug}`);
  await expect(gallery.locator("[data-product-authenticity]")).toBeVisible();
  await gallery.getByRole("button", { name: "Phóng to ảnh", exact: true }).click();
  await expect(dialog.locator("[data-product-authenticity]")).toBeVisible();
  await page.keyboard.press("Escape");
  expect(api.errors).toEqual([]);
});

test("New products enable the authenticity label by default", async ({ page }) => {
  await mockEditor(page);
  await page.goto(`${base}/admin/products/new`);
  await expect(page.getByRole("checkbox", { name: "Hiển thị nhãn phân phối chính hãng", exact: true })).toBeChecked();
});

for (const width of [1440, 390]) test(`Editor tabs retain content and save formatted technical details at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  const api = await mockEditor(page);
  await page.goto(`${base}/admin/products/${product.id}/edit`);
  const basic = page.getByRole("tab", { name: "Thông tin cơ bản", exact: true });
  const content = page.getByRole("tab", { name: "Nội dung chi tiết", exact: true });
  const media = page.getByRole("tab", { name: "Hình ảnh", exact: true });
  await expect(basic).toHaveAttribute("aria-selected", "true"); await expect(basic).toHaveCSS("background-color", "rgb(26, 26, 26)");
  const editor = page.getByRole("textbox", { name: /Thông số kỹ thuật/ });
  await expect(editor).toBeVisible(); await expect(editor).toContainText("Công suất < 2800W"); await expect(editor.locator("br")).toHaveCount(1);
  await expect(page.locator("form[data-unsaved=true]")).toHaveCount(0);
  await page.getByLabel("Tên sản phẩm", { exact: false }).fill("Bếp từ giữ nội dung qua tab");
  await editor.click(); await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.press("ControlOrMeta+B"); await page.keyboard.insertText("Công suất 2800W"); await page.keyboard.press("ControlOrMeta+B");
  await page.keyboard.press("Enter"); await page.keyboard.insertText("Kích thước 730 × 430mm");
  await expect(editor.locator("strong")).toHaveText("Công suất 2800W");
  await content.click(); await expect(content).toHaveAttribute("aria-selected", "true"); await expect(basic).toHaveAttribute("aria-selected", "false");
  await media.click(); await expect(media).toHaveAttribute("aria-selected", "true");
  await basic.click(); await expect(editor.locator("strong")).toHaveText("Công suất 2800W");
  await expect(page.getByLabel("Tên sản phẩm", { exact: false })).toHaveValue("Bếp từ giữ nội dung qua tab");
  await content.click(); await page.getByRole("button", { name: "Lưu sản phẩm", exact: true }).click();
  await expect.poll(() => api.writes.length).toBe(1);
  expect(api.writes[0]).toMatchObject({ name: "Bếp từ giữ nội dung qua tab", brand: initialProduct.brand, code: initialProduct.code, technicalDetails: "<p><strong>Công suất 2800W</strong></p><p>Kích thước 730 × 430mm</p>", specification: "Công suất 2800W Kích thước 730 × 430mm" });
  await expect(page.getByRole("textbox", { name: /Thông số kỹ thuật/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await mkdir("/private/tmp/baotin-product-editor-content", { recursive: true });
  await page.screenshot({ path: `/private/tmp/baotin-product-editor-content/editor-${width}.png`, fullPage: true });
  await page.goto(`${base}/products/${product.slug}`);
  const technicalDetails = page.getByRole("table", { name: "Thông số kỹ thuật", exact: true });
  await expect(technicalDetails.getByRole("rowheader", { name: "Mã hàng", exact: true })).toBeVisible();
  await expect(technicalDetails.getByRole("rowheader", { name: "Thương hiệu", exact: true })).toBeVisible();
  await expect(technicalDetails).toContainText("Công suất 2800W");
  await expect(technicalDetails).toContainText("Kích thước 730 × 430mm");
  expect(api.errors).toEqual([]);
});

test("Legacy specifications remain editable and clearing a draft saves empty content", async ({ page }) => {
  const api = await mockEditor(page, { technicalDetails: "", specification: "Inox 304 · Dài 600mm", published: false });
  await page.goto(`${base}/admin/products/${product.id}/edit`);
  const editor = page.getByRole("textbox", { name: /Thông số kỹ thuật/ });
  await expect(editor).toHaveText("Inox 304 · Dài 600mm");
  await editor.click(); await page.keyboard.press("ControlOrMeta+A"); await page.keyboard.press("Backspace");
  await expect(page.locator("form[data-unsaved=true]")).toBeVisible();
  await page.getByRole("button", { name: "Lưu sản phẩm", exact: true }).click();
  await expect.poll(() => api.writes.length).toBe(1);
  expect(api.writes[0]).toMatchObject({ specification: "", technicalDetails: "" });
  expect(api.errors).toEqual([]);
});

test("A published product requires meaningful technical text", async ({ page }) => {
  const api = await mockEditor(page);
  await page.goto(`${base}/admin/products/${product.id}/edit`);
  const editor = page.getByRole("textbox", { name: /Thông số kỹ thuật/ });
  await editor.click(); await page.keyboard.press("ControlOrMeta+A"); await page.keyboard.press("Backspace");
  await page.getByRole("button", { name: "Lưu sản phẩm", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "thông số" })).toBeVisible(); expect(api.writes).toEqual([]);
});

test("Invalid basic fields reveal their tab when saving from the content tab", async ({ page }) => {
  const api = await mockEditor(page);
  await page.goto(`${base}/admin/products/${product.id}/edit`);
  await page.getByLabel("Tên sản phẩm", { exact: false }).fill("");
  await page.getByRole("tab", { name: "Nội dung chi tiết", exact: true }).click();
  await page.getByRole("button", { name: "Lưu sản phẩm", exact: true }).click();
  await expect(page.getByRole("tab", { name: "Thông tin cơ bản", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByLabel("Tên sản phẩm", { exact: false })).toBeFocused(); expect(api.writes).toEqual([]);
});

test("Storefront technical content becomes rows without executable markup", async ({ page }) => {
  await mockEditor(page, { slug: "qa-safe-rich-specification", technicalDetails: '<p>Thông số: <strong>Thông số chuẩn</strong></p><ul><li>Chất liệu: Inox 304</li></ul><table><tbody><tr><td colspan="2">600mm</td></tr></tbody></table><img src="x" onerror="window.qaInjected=true"><script>window.qaInjected=true</script><a href="javascript:alert(1)">Không thực thi</a>' });
  await page.goto(`${base}/products/${product.slug}`);
  const details = page.getByRole("table", { name: "Thông số kỹ thuật", exact: true });
  await expect(details).toContainText("Thông số chuẩn"); await expect(details).toContainText("Inox 304");
  await expect(details).toContainText("600mm");
  await expect(details.locator("script, img, [onerror], [href^='javascript:']")).toHaveCount(0);
});

const technicalRows = [
  ["Model", "FULCO FC-ML338i"], ["Loại sản phẩm", "Bếp từ đôi âm"], ["Xuất xứ", "Made in Malaysia"],
  ["Số vùng nấu", "2 vùng nấu từ"], ["Mặt kính", "KANGER cao cấp vát 4 cạnh"],
  ["Điều khiển", "Cảm ứng trượt độc lập 12 mức công suất"], ["Công nghệ", "Smart Inverter"],
  ["Chức năng Booster", "2400W mỗi vùng nấu"], ["Chức năng nấu", "Giữ ấm, Giã đông, Chiên rán"],
  ["Điện áp", "220–240V ~ 50–60Hz"], ["Công suất lò trái", "2200W (Booster 2400W)"],
  ["Công suất lò phải", "2200W (Booster 2400W)"], ["Kích thước sản phẩm", "730 × 430 mm"],
  ["Kích thước khoét đá", "680 × 395 mm"], ["Bảo hành", "5 năm"],
];

for (const width of [1440, 390]) test(`Storefront replaces legacy specifications with CKEditor label/value rows at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  const api = await mockEditor(page, {
    slug: `qa-technical-table-${width}`, specification: "Thông số cũ không hiển thị",
    technicalDetails: `<p>${technicalRows.map(([label, value]) => `${label}: ${value}`).join("<br>")}</p>`,
  });
  await page.goto(`${base}/products/${product.slug}`);
  const table = page.getByRole("table", { name: "Thông số kỹ thuật", exact: true });
  await expect(table.getByRole("row")).toHaveCount(technicalRows.length);
  await expect(table.getByRole("rowheader")).toHaveText(technicalRows.map(([label]) => label));
  await expect(table.getByRole("cell")).toHaveText(technicalRows.map(([, value]) => value));
  await expect(table.getByRole("rowheader", { name: "Mã hàng", exact: true })).toHaveCount(0);
  await expect(page.getByRole("tabpanel")).not.toContainText("Thông số cũ không hiển thị");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await mkdir("/private/tmp/baotin-technical-table", { recursive: true });
  await table.screenshot({ path: `/private/tmp/baotin-technical-table/table-${width}.png` });
  await page.getByRole("tab", { name: "Tài liệu / Hướng dẫn", exact: true }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Tải bảng thông số", exact: true }).click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(path).not.toBeNull();
  const csv = await readFile(path!, "utf8");
  expect(csv).toContain('"Model","FULCO FC-ML338i"');
  expect(csv).toContain('"Kích thước khoét đá","680 × 395 mm"');
  expect(csv).not.toContain("Thông số cũ không hiển thị");
  expect(csv).not.toContain('"Mã hàng"');
  expect(api.writes).toEqual([]); expect(api.errors).toEqual([]);
});

test("Empty technical details hide the legacy table and its download", async ({ page }) => {
  await mockEditor(page, { slug: "qa-empty-technical-table", technicalDetails: "<p>&nbsp;</p>", specification: "Thông số cũ không hiển thị" });
  await page.goto(`${base}/products/${product.slug}`);
  await expect(page.getByRole("table", { name: "Thông số kỹ thuật", exact: true })).toHaveCount(0);
  await expect(page.getByText("Thông số kỹ thuật đang được cập nhật.", { exact: true })).toBeVisible();
  await expect(page.getByRole("tabpanel")).not.toContainText("Thông số cũ không hiển thị");
  await page.getByRole("tab", { name: "Tài liệu / Hướng dẫn", exact: true }).click();
  await expect(page.getByRole("button", { name: "Tải bảng thông số", exact: true })).toHaveCount(0);
});

test("Long technical content saves in full with a bounded plain-text listing summary", async ({ page }) => {
  const api = await mockEditor(page);
  await page.goto(`${base}/admin/products/${product.id}/edit`);
  const editor = page.getByRole("textbox", { name: /Thông số kỹ thuật/ });
  await editor.click(); await page.keyboard.press("ControlOrMeta+A");
  const text = "Thông số kỹ thuật 🔧 ".repeat(40).trim();
  await page.keyboard.insertText(text);
  await page.getByRole("button", { name: "Lưu sản phẩm", exact: true }).click();
  await expect.poll(() => api.writes.length).toBe(1);
  expect(api.writes[0].technicalDetails).toBe(`<p>${text}</p>`);
  expect(Array.from(String(api.writes[0].specification)).length).toBeLessThanOrEqual(500);
  expect(Array.from(String(api.writes[0].specification)).length).toBeGreaterThan(480);
  expect(text.startsWith(String(api.writes[0].specification))).toBe(true);
});

test("Oversized technical content shows a validation message before sending a write", async ({ page }) => {
  const api = await mockEditor(page);
  await page.goto(`${base}/admin/products/${product.id}/edit`);
  const editor = page.getByRole("textbox", { name: /Thông số kỹ thuật/ });
  await editor.click(); await page.keyboard.press("ControlOrMeta+A"); await page.keyboard.insertText("A".repeat(10001));
  await page.getByRole("button", { name: "Lưu sản phẩm", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Thông số kỹ thuật quá dài" })).toBeVisible(); expect(api.writes).toEqual([]);
});

const copySource = { ...initialProduct, id: "copy-root", code: "NSP-00179", variantGroupId: "copy-root", variantAttributes: [{ name: "Kích thước", value: "700mm" }], shortDescription: "", usageGuide: "", warranty: "", description: "<p>Mô tả chung đã sửa</p>" };
const copyTargets = [
  { ...copySource, id: "copy-800", code: "NSP-00180", name: "Giá bát 800", price: 12765500, stock: 80, revision: 2, variantAttributes: [{ name: "Kích thước", value: "800mm" }], description: "Nội dung riêng 800" },
  { ...copySource, id: "copy-900", code: "NSP-00181", name: "Giá bát 900", price: 13744500, stock: 90, revision: 3, variantAttributes: [{ name: "Kích thước", value: "900mm" }], description: "Nội dung riêng 900" },
];

for (const width of [1440, 390]) test(`Select content and sibling SKU for copying at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  const api = await mockEditor(page, copySource, { siblings: [...copyTargets, { ...copyTargets[0], id: "other-group", code: "OUTSIDE", variantGroupId: "other-group" }] });
  await page.goto(`${base}/admin/products/${product.id}/edit`);
  await page.getByRole("button", { name: "Áp dụng cho biến thể khác", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Áp dụng nội dung cho biến thể", exact: true });
  await expect(dialog.getByRole("checkbox", { name: "Áp dụng cho NSP-00179", exact: true })).toHaveCount(0);
  await expect(dialog.getByRole("checkbox", { name: "Áp dụng cho OUTSIDE", exact: true })).toHaveCount(0);
  await expect(dialog.getByRole("checkbox", { name: "Tên sản phẩm", exact: true })).toBeChecked();
  await expect(dialog.getByRole("checkbox", { name: "Thông số kỹ thuật", exact: true })).not.toBeChecked();
  await expect(dialog.getByRole("checkbox", { name: "Hình ảnh", exact: true })).not.toBeChecked();
  await dialog.getByRole("checkbox", { name: "Áp dụng cho NSP-00181", exact: true }).uncheck();
  await dialog.getByRole("checkbox", { name: "Thông số kỹ thuật", exact: true }).check();
  await expect(page.locator("form[data-unsaved=true]")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await mkdir("/private/tmp/baotin-variant-copy", { recursive: true });
  await dialog.screenshot({ path: `/private/tmp/baotin-variant-copy/copy-${width}.png` });
  await dialog.getByRole("button", { name: "Áp dụng cho 1 SKU", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  expect(api.copies).toEqual([{ revision: 1, fields: ["name", "description", "technicalDetails"], products: [{ id: "copy-800", revision: 2 }] }]);
  expect(api.state.products.find(item => item.id === "copy-800")).toMatchObject({ name: copySource.name, description: copySource.description, price: copyTargets[0].price, stock: 80, code: "NSP-00180", variantAttributes: copyTargets[0].variantAttributes });
  expect(api.state.products.find(item => item.id === "copy-900")).toEqual(copyTargets[1]);
  expect(api.writes).toEqual([]); expect(api.errors).toEqual([]);
});

test("Unsaved changes must be saved before copying the latest source revision", async ({ page }) => {
  const api = await mockEditor(page, copySource, { siblings: copyTargets });
  await page.goto(`${base}/admin/products/${product.id}/edit`);
  await page.getByLabel("Tên sản phẩm", { exact: false }).fill("Tên chung đã sửa");
  const trigger = page.getByRole("button", { name: "Áp dụng cho biến thể khác", exact: true });
  await expect(trigger).toBeDisabled();
  await expect(page.getByText("Lưu sản phẩm trước khi áp dụng nội dung cho biến thể khác.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Lưu sản phẩm", exact: true }).click();
  await expect.poll(() => api.writes.length).toBe(1); await expect(trigger).toBeEnabled();
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Áp dụng nội dung cho biến thể", exact: true });
  await dialog.getByRole("button", { name: "Áp dụng cho 2 SKU", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  expect(api.copies[0].revision).toBe(2);
  expect(api.state.products.find(item => item.id === "copy-800")?.name).toBe("Tên chung đã sửa");
  expect(api.state.products.find(item => item.id === "copy-900")?.name).toBe("Tên chung đã sửa");
  expect(api.errors).toEqual([]);
});

test("Copy conflicts retain the selection and do not update any sibling", async ({ page }) => {
  const api = await mockEditor(page, copySource, { siblings: copyTargets, copyError: "Một SKU đã thay đổi ở phiên khác. Tải lại nhóm trước khi áp dụng." });
  await page.goto(`${base}/admin/products/${product.id}/edit`);
  await page.getByRole("button", { name: "Áp dụng cho biến thể khác", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Áp dụng nội dung cho biến thể", exact: true });
  await dialog.getByRole("button", { name: "Áp dụng cho 2 SKU", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("Một SKU đã thay đổi");
  await expect(dialog.getByRole("checkbox", { name: "Áp dụng cho NSP-00180", exact: true })).toBeChecked();
  await expect(dialog.getByRole("button", { name: "Tải lại nhóm biến thể", exact: true })).toBeVisible();
  expect(api.state.products.filter(item => item.id !== product.id)).toEqual(copyTargets);
  expect(api.copies).toHaveLength(1); expect(api.writes).toEqual([]);
});

test("Copy requires a field and target, and submits only once while busy", async ({ page }) => {
  let release!: () => void;
  const copyGate = new Promise<void>(resolve => { release = resolve; });
  const api = await mockEditor(page, copySource, { siblings: copyTargets, copyGate });
  try {
    await page.goto(`${base}/admin/products/${product.id}/edit`);
    await page.getByRole("button", { name: "Áp dụng cho biến thể khác", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Áp dụng nội dung cho biến thể", exact: true });
    await dialog.getByRole("checkbox", { name: "Tên sản phẩm", exact: true }).uncheck();
    await dialog.getByRole("checkbox", { name: "Mô tả chi tiết", exact: true }).uncheck();
    await expect(dialog.getByRole("button", { name: "Áp dụng cho 2 SKU", exact: true })).toBeDisabled();
    await dialog.getByRole("checkbox", { name: "Tên sản phẩm", exact: true }).check();
    await dialog.getByRole("button", { name: "Bỏ chọn tất cả", exact: true }).click();
    await expect(dialog.getByRole("button", { name: "Áp dụng cho 0 SKU", exact: true })).toBeDisabled();
    await dialog.getByRole("button", { name: "Chọn tất cả", exact: true }).click();
    await dialog.getByRole("button", { name: "Áp dụng cho 2 SKU", exact: true }).click();
    await expect.poll(() => api.copies.length).toBe(1);
    await expect(dialog.getByRole("button", { name: "Hủy", exact: true })).toBeDisabled();
    await expect(dialog.getByRole("checkbox", { name: "Tên sản phẩm", exact: true })).toBeDisabled();
    await page.keyboard.press("Escape"); await expect(dialog).toBeVisible();
    release(); await expect(dialog).not.toBeVisible(); expect(api.copies).toHaveLength(1);
  } finally { release(); }
});

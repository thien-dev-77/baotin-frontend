import { expect, test, type Page } from "@playwright/test";
import { createServer, type Server } from "node:http";
import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { mkdir } from "node:fs/promises";
import { catalog, categoryCatalog } from "../lib/catalog";
import type { ApiAdminState } from "../lib/api-types";
import { previewCatalogPage } from "../lib/catalog-query";
import { adminReadFixture } from "./admin-read-fixtures";

const base = "http://127.0.0.1:3054";
const staff = { id: "qa-admin", name: "QA Admin", email: "qa@example.test", role: "admin", branches: ["Quy Nhơn"], customer: null };
const initialProduct = { ...catalog[0], id: "qa-rich-specification", slug: "qa-rich-specification", code: "QA-RICH", published: true, revision: 1, description: "Mô tả cũ", technicalDetails: "Kích thước: 730 × 430\nCông suất < 2800W", shortDescription: "", usageGuide: "", gallery: [catalog[0].image] };
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

async function mockEditor(page: Page, overrides: Partial<typeof initialProduct> = {}) {
  product = { ...initialProduct, ...overrides };
  const state: ApiAdminState = { products: [product], categories: categoryCatalog, orders: [], customers: [], approvals: [], receipts: [], warehouse: {}, paymentDueDates: {}, today: "2026-10-15" };
  const writes: Record<string, unknown>[] = [];
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/_next/image?**", route => route.fulfill({ contentType: "image/png", body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aSu8AAAAASUVORK5CYII=", "base64") }));
  await page.route("**/api/backend/**", async route => {
    const request = route.request(), url = new URL(request.url());
    const path = url.pathname.slice("/api/backend".length);
    if (request.method() === "PATCH" && path === `/admin/products/${product.id}`) {
      const payload = request.postDataJSON() as Record<string, unknown>;
      writes.push(payload);
      product = { ...product, ...payload, revision: product.revision + 1 } as typeof product;
      state.products = [product];
      await route.fulfill({ json: { id: product.id, product } }); return;
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
  return { writes, errors };
}

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
  const technicalDetails = page.getByRole("table", { name: "Thông số kỹ thuật", exact: true }).locator(".bt-product-rich-text");
  await expect(technicalDetails.locator("strong")).toHaveText("Công suất 2800W");
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

test("Storefront technical HTML preserves tables and strips executable markup", async ({ page }) => {
  await mockEditor(page, { slug: "qa-safe-rich-specification", technicalDetails: '<p><strong>Thông số chuẩn</strong></p><ul><li>Inox 304</li></ul><table><tbody><tr><td colspan="2">600mm</td></tr></tbody></table><img src="x" onerror="window.qaInjected=true"><script>window.qaInjected=true</script><a href="javascript:alert(1)">Không thực thi</a>' });
  await page.goto(`${base}/products/${product.slug}`);
  const details = page.getByRole("table", { name: "Thông số kỹ thuật", exact: true }).locator(".bt-product-rich-text");
  await expect(details.locator("strong")).toHaveText("Thông số chuẩn"); await expect(details.locator("li")).toHaveCSS("list-style-type", "disc");
  await expect(details.locator("td")).toHaveAttribute("colspan", "2");
  await expect(details.locator("script, img, [onerror], [href^='javascript:']")).toHaveCount(0);
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

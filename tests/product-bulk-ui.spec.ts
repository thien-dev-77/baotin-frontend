import { test, expect, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { catalog, categoryCatalog } from "../lib/catalog";
import { adminReadFixture } from "./admin-read-fixtures";
import type { ApiAdminState } from "../lib/api-types";

const base = process.env.QA_BASE_URL || "http://127.0.0.1:3010";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname)) throw new Error("Bulk UI QA is local only.");
test.setTimeout(60000);
async function mock(page: Page, options: { count?: number; invalidCount?: number } = {}) {
  const user = { id: "qa-admin", name: "QA Admin", email: "qa@example.test", role: "admin", branches: ["Quy Nhơn"], customer: null };
  const products = Array.from({ length: options.count ?? 12 }, (_, index) => ({ ...catalog[0], id: `BULK-${index}`, code: `BULK-${index}`, slug: `bulk-${index}`, name: `Sản phẩm Fulco ${index}`, published: false, revision: 1, listPrice: 100000, b2cDiscount: 60, b2bDiscount: 60, price: 40000 }));
  const state: ApiAdminState = { products, categories: categoryCatalog, customers: [], orders: [], approvals: [], receipts: [], warehouse: {}, paymentDueDates: {}, today: "2026-10-13" };
  const writes: Record<string, unknown>[] = [], errors: string[] = [];
  let resolveWrite: (() => void) | undefined;
  let nextError = "";
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/_next/image?**", route => route.fulfill({ contentType: "image/png", body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aSu8AAAAASUVORK5CYII=", "base64") }));
  await page.route("**/api/backend/**", async route => {
    const url = new URL(route.request().url()), path = url.pathname.slice("/api/backend".length);
    if (route.request().method() === "GET" && path === "/admin/products/selection") {
      const items = products.filter(product => !url.searchParams.get("status") || url.searchParams.get("status") === "all" || product.published === (url.searchParams.get("status") === "published"));
      await route.fulfill({ json: { products: items.map(({ id, code, revision }) => ({ id, code, revision })), count: items.length } }); return;
    }
    if (route.request().method() === "POST" && path === "/admin/products/bulk") {
      const body = route.request().postDataJSON(); writes.push(body);
      await new Promise<void>(resolve => { resolveWrite = resolve; });
      if (nextError) { await route.fulfill({ status: 409, json: { message: nextError } }); nextError = ""; return; }
      const skipped: { id: string; code: string; name: string; reason: string }[] = [];
      const saved: { id: string; revision: number; published: boolean }[] = [];
      for (const item of body.products) {
        const product = products.find(row => row.id === item.id)!;
        if (body.action === "publish" && products.indexOf(product) < (options.invalidCount ?? 0)) {
          skipped.push({ id: product.id, code: product.code, name: product.name, reason: "Thiếu thông tin hoặc ảnh sản phẩm hợp lệ. Vui lòng bổ sung." }); continue;
        }
        if (body.action !== "discounts") product.published = body.action === "publish";
        else { product.b2cDiscount = body.b2cDiscount ?? product.b2cDiscount; product.b2bDiscount = body.b2bDiscount ?? product.b2bDiscount; }
        product.revision++;
        saved.push({ id: product.id, revision: product.revision, published: product.published });
      }
      await route.fulfill({ json: { updated: saved.length, action: body.action, hiddenCategories: [], products: saved, skipped } }); return;
    }
    if (route.request().method() !== "GET") { errors.push(`Unexpected write ${path}`); await route.fulfill({ status: 500, json: { message: "Blocked QA write" } }); return; }
    const result = adminReadFixture(url, state) || ({ "/auth/session": { user }, "/admin/resources": state, "/notifications/count": { unreadCount: 0 }, "/catalog/bootstrap": { products: [], categories: categoryCatalog } } as Record<string, unknown>)[path];
    if (!result) { errors.push(`Unexpected read ${path}`); await route.fulfill({ status: 500, json: { message: "Unknown QA read" } }); return; }
    await route.fulfill({ json: result });
  });
  return { products, writes, release: () => { resolveWrite?.(); }, failNext: (message: string) => { nextError = message; }, check: () => expect(errors).toEqual([]) };
}

for (const width of [1440, 390]) {
  test(`Batch selection, publish/private and CK updates keep the table at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const api = await mock(page);
    await page.goto(`${base}/admin/products`);
    await page.getByRole("checkbox", { name: "Chọn tất cả sản phẩm trên trang", exact: true }).check();
    await expect(page.getByText("Đã chọn 10", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Chọn tất cả 12", exact: true }).click();
    await expect(page.getByText("Đã chọn 12", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Công khai", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Áp dụng", exact: true }).click();
    await expect(dialog.getByRole("button", { name: "Áp dụng", exact: true })).toHaveAttribute("aria-busy", "true");
    await expect(page.locator(".bt-admin-products-table tbody tr")).toHaveCount(10);
    await expect.poll(() => api.writes.length).toBe(1);
    await expect(page.getByRole("checkbox", { name: "Chọn sản phẩm BULK-0", exact: true })).toBeDisabled();
    api.release(); await expect(dialog).not.toBeVisible();
    await expect(page.getByText("Đã chọn 0", { exact: true })).toBeVisible();
    expect(api.writes[0]).toMatchObject({ action: "publish" });
    expect((api.writes[0].products as unknown[]).length).toBe(12);
    await expect(page.locator(".bt-admin-products-table tbody tr").first()).toContainText("Công khai");
    await page.getByRole("checkbox", { name: "Chọn sản phẩm BULK-0", exact: true }).check();
    await page.getByRole("button", { name: "Chỉnh CK", exact: true }).click();
    await dialog.getByRole("checkbox", { name: "Áp dụng CK B2B", exact: true }).uncheck();
    await dialog.getByLabel("Chiết khấu B2C (%)", { exact: true }).fill("12.34");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await mkdir("/private/tmp/baotin-bulk-ui", { recursive: true });
    await page.screenshot({ path: `/private/tmp/baotin-bulk-ui/discount-${width}.png`, fullPage: true });
    await dialog.getByRole("button", { name: "Áp dụng", exact: true }).click();
    await expect.poll(() => api.writes.length).toBe(2);
    expect(api.writes[1]).toMatchObject({ action: "discounts", b2cDiscount: 12.34, products: [{ id: "BULK-0", revision: 2 }] });
    expect(api.writes[1]).not.toHaveProperty("b2bDiscount");
    api.release(); await expect(dialog).not.toBeVisible();
    await page.getByRole("checkbox", { name: "Chọn sản phẩm BULK-0", exact: true }).check();
    await page.getByRole("button", { name: "Riêng tư", exact: true }).click();
    await dialog.getByRole("button", { name: "Áp dụng", exact: true }).click();
    await expect.poll(() => api.writes.length).toBe(3); api.release(); await expect(dialog).not.toBeVisible();
    await expect(page.locator(".bt-admin-products-table tbody tr").first()).toContainText("Riêng tư");
    api.check();
  });
}

test("Batch failure preserves the selection, table and server error", async ({ page }) => {
  const api = await mock(page);
  await page.goto(`${base}/admin/products`);
  await page.getByRole("checkbox", { name: "Chọn sản phẩm BULK-0", exact: true }).check();
  api.failNext("Sản phẩm đã thay đổi. Làm mới và chọn lại.");
  await page.getByRole("button", { name: "Công khai", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Áp dụng", exact: true }).click();
  await expect.poll(() => api.writes.length).toBe(1); api.release();
  await expect(dialog.getByRole("alert")).toHaveText("Sản phẩm đã thay đổi. Làm mới và chọn lại.");
  await expect(page.getByText("Đã chọn 1", { exact: true })).toBeVisible();
  await expect(page.locator(".bt-admin-products-table tbody tr")).toHaveCount(10);
  api.check();
});

for (const width of [1440, 390, 320]) {
  test(`Publishing 242 selected products updates 223 and reports 19 skipped at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const api = await mock(page, { count: 242, invalidCount: 19 });
    await page.goto(`${base}/admin/products`);
    await page.getByRole("button", { name: "Chọn tất cả 242", exact: true }).click();
    await expect(page.getByText("Đã chọn 242", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Công khai", exact: true }).click();
    const confirmation = page.getByRole("dialog", { name: "Công khai sản phẩm", exact: true });
    await expect(confirmation).toContainText("Sản phẩm chưa đủ điều kiện được bỏ qua");
    await confirmation.getByRole("button", { name: "Áp dụng", exact: true }).click();
    await expect.poll(() => api.writes.length).toBe(1);
    await expect(confirmation.getByRole("button", { name: "Áp dụng", exact: true })).toHaveAttribute("aria-busy", "true");
    await expect(page.locator(".bt-admin-products-table tbody tr")).toHaveCount(10);
    api.release();
    await expect(confirmation).not.toBeVisible();
    const report = page.getByRole("region", { name: "Kết quả công khai sản phẩm", exact: true });
    await expect(report).toContainText("Đã công khai 223 sản phẩm.");
    await expect(report).toContainText("Bỏ qua 19 sản phẩm");
    await expect(report.getByRole("list", { name: "Sản phẩm chưa công khai" }).getByRole("listitem")).toHaveCount(19);
    await expect(report.getByRole("link", { name: "Sửa sản phẩm bị bỏ qua BULK-0", exact: true })).toHaveAttribute("href", "/admin/products/BULK-0/edit");
    await expect(report).toContainText("Thiếu thông tin hoặc ảnh sản phẩm");
    expect(api.products.slice(0, 19).every(product => !product.published && product.revision === 1)).toBe(true);
    expect(api.products.slice(19).every(product => product.published && product.revision === 2)).toBe(true);
    await expect(page.getByText("Đã chọn 0", { exact: true })).toBeVisible();
    await expect(page.locator(".bt-admin-products-table tbody tr").first()).toContainText("Riêng tư");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await mkdir("/private/tmp/baotin-partial-publish", { recursive: true });
    await page.screenshot({ path: `/private/tmp/baotin-partial-publish/result-${width}.png`, fullPage: true });
    expect(api.writes).toHaveLength(1);
    api.check();
  });
}

test("All invalid products return a visible report without a false success or state changes", async ({ page }) => {
  const api = await mock(page, { invalidCount: 12 });
  await page.goto(`${base}/admin/products`);
  await page.getByRole("button", { name: "Chọn tất cả 12", exact: true }).click();
  await page.getByRole("button", { name: "Công khai", exact: true }).click();
  const confirmation = page.getByRole("dialog", { name: "Công khai sản phẩm", exact: true });
  await confirmation.getByRole("button", { name: "Áp dụng", exact: true }).click();
  await expect.poll(() => api.writes.length).toBe(1); api.release();
  const report = page.getByRole("region", { name: "Kết quả công khai sản phẩm", exact: true });
  await expect(report).toContainText("Chưa công khai sản phẩm nào.");
  await expect(report).toContainText("Bỏ qua 12 sản phẩm");
  expect(api.products.every(product => !product.published && product.revision === 1)).toBe(true);
  await report.getByRole("button", { name: "Đóng kết quả công khai", exact: true }).click();
  await expect(report).toHaveCount(0);
  api.check();
});

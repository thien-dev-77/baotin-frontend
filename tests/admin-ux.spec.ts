import { expect, test, type Page } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";
import { catalog, categoryCatalog } from "../lib/catalog";
import { adminCustomers, adminOrders, previewDate } from "../lib/admin-preview";
import { adminReadFixture } from "./admin-read-fixtures";

const base = process.env.QA_BASE_URL || "http://127.0.0.1:3010";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname)) throw new Error("Admin UX QA runs locally only.");
test.use({ viewport: { width: 1440, height: 900 } });
test.setTimeout(30000);
async function setup(page: Page) {
  const state = { products: Array.from({ length: 55 }, (_, i) => ({ ...catalog[0], id: `QA-${i}`, code: `QA-${i}`, name: `Sản phẩm ${i}`, gallery: [catalog[0].image], published: true, revision: 1 })), categories: categoryCatalog, customers: structuredClone(adminCustomers), orders: [...structuredClone(adminOrders), { ...adminOrders[2], id: "QA-OLD", date: "2026-01-01", revision: 1 }], approvals: [], receipts: [], warehouse: {}, paymentDueDates: {}, today: previewDate };
  const calls: URL[] = [], errors: string[] = [], quotes: Record<string, unknown>[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/api/backend/**", async route => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname.slice("/api/backend".length);
    calls.push(url);
    if (request.method() === "POST" && path === "/admin/orders/quote") {
      const payload = request.postDataJSON(); quotes.push(payload);
      const items = payload.items.map((item: { productId: string; quantity: number }) => ({ ...item, unitPrice: 1000 }));
      const total = items.reduce((sum: number, item: { quantity: number; unitPrice: number }) => sum + item.quantity * item.unitPrice, 0);
      await route.fulfill({ json: { items, subtotal: total, total, shipping: 0, discount: 0 } }); return;
    }
    const read = request.method() === "GET" ? adminReadFixture(url, state) : undefined;
    if (read) { await route.fulfill({ json: read }); return; }
    const resources: Record<string, unknown> = { "/auth/session": { user: { id: "qa-admin", name: "QA Admin", email: "qa@example.test", role: "admin", branches: ["Quy Nhơn", "Tuy Hòa"], customer: null } }, "/notifications/count": { unreadCount: 0 }, "/admin/resources": state, "/admin/users": { users: [] } };
    if (request.method() !== "GET" || !(path in resources)) { errors.push(`Unexpected ${request.method()} ${path}`); await route.fulfill({ status: 500, json: { message: "Unexpected QA request" } }); return; }
    await route.fulfill({ json: resources[path] });
  });
  return { state, calls, quotes, check: () => expect(errors).toEqual([]), visit: async (path: string) => { await page.goto(`${base}${path}`); await expect(page.getByRole("button", { name: "Làm mới dữ liệu", exact: true })).toBeEnabled(); } };
}
const menu = (page: Page, path: string) => page.locator(`nav[aria-label="Quản trị nội bộ"] a[href="${path}"]`).first();

test("Admin bypasses storefront catalog and caches dedicated screens", async ({ page }) => {
  const api = await setup(page); await api.visit("/admin/customers");
  await expect(page.getByRole("button", { name: "Xem khách KH001", exact: true })).toBeVisible();
  expect(api.calls.filter(url => url.pathname.endsWith("/admin/browse"))).toHaveLength(1);
  expect(api.calls.some(url => /catalog|\/account$|\/orders$|admin\/resources|admin\/customers/.test(url.pathname))).toBe(false);
  await menu(page, "/admin/users").click(); await expect(page.getByRole("heading", { name: "Tài khoản & phân quyền" })).toBeVisible();
  await menu(page, "/admin/customers").click(); await expect(page.getByRole("button", { name: "Xem khách KH001", exact: true })).toBeVisible();
  await menu(page, "/admin/users").click(); await expect(page.getByRole("heading", { name: "Tài khoản & phân quyền" })).toBeVisible();
  expect(api.calls.filter(url => url.pathname.endsWith("/admin/users"))).toHaveLength(1);
  expect(api.calls.filter(url => url.pathname.endsWith("/auth/session"))).toHaveLength(1); api.check();
});
test("Old pending orders are searchable with all-time and custom date filters", async ({ page }) => {
  const api = await setup(page); await api.visit("/admin/orders");
  await page.getByLabel("Tìm mã đơn, khách hàng...", { exact: true }).fill("QA-OLD");
  await expect(page.getByRole("button", { name: "Xem đơn QA-OLD", exact: true })).toBeVisible();
  await page.getByLabel("Đơn hàng từ ngày").fill("2026-06-01");
  await expect(page.getByRole("button", { name: "Xem đơn QA-OLD", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Tất cả thời gian", exact: true }).click();
  await expect(page.getByRole("button", { name: "Xem đơn QA-OLD", exact: true })).toBeVisible(); api.check();
});
test("Quote runs for SKU quantity but not contact information or notes", async ({ page }) => {
  const api = await setup(page); await api.visit("/admin/orders/new");
  await expect(page.getByRole("button", { name: "Tạo đơn chờ xác nhận" })).toBeDisabled();
  expect(api.quotes).toHaveLength(0);
  await page.getByRole("button", { name: "Thêm sản phẩm", exact: true }).click();
  await page.getByRole("button", { name: "Thêm QA-0", exact: true }).click();
  await page.getByRole("button", { name: "Xong (1)", exact: true }).click();
  await expect.poll(() => api.quotes.length).toBe(1);
  await page.getByLabel("Người nhận", { exact: false }).fill("Khách QA");
  await page.getByLabel("Số điện thoại", { exact: false }).fill("0901234567");
  await page.getByLabel("Ghi chú đơn hàng", { exact: true }).fill("Ghi chú không thay đổi giá");
  await expect(page.getByLabel("Số điện thoại", { exact: false })).toHaveValue("0901234567");
  await page.waitForTimeout(500); expect(api.quotes).toHaveLength(1);
  expect(api.quotes[0].details).toEqual({ delivery: "Nhận tại cửa hàng", payment: "Chuyển khoản" });
  await page.getByRole("button", { name: "Tăng Số lượng QA-0", exact: true }).click();
  await expect.poll(() => api.quotes.length).toBe(2); api.check();
});
test("Unsaved product changes block navigation, cancel and branch changes", async ({ page }) => {
  const api = await setup(page); await api.visit("/admin/products/new");
  await page.getByLabel("Tên sản phẩm", { exact: false }).fill("Bản nháp chưa lưu");
  await page.getByRole("button", { name: "Hủy", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Bỏ thay đổi chưa lưu?" });
  await expect(dialog).toBeVisible(); await dialog.getByRole("button", { name: "Tiếp tục chỉnh sửa" }).click();
  await expect(page.getByLabel("Tên sản phẩm", { exact: false })).toHaveValue("Bản nháp chưa lưu");
  await page.getByRole("combobox", { name: "Chi nhánh", exact: true }).selectOption("Tuy Hòa");
  await expect(dialog).toBeVisible(); await dialog.getByRole("button", { name: "Tiếp tục chỉnh sửa" }).click();
  await expect(page.getByRole("combobox", { name: "Chi nhánh", exact: true })).toHaveValue("Quy Nhơn");
  await menu(page, "/admin/orders").click(); await expect(dialog).toBeVisible();
  await expect(page).toHaveURL(`${base}/admin/products/new`);
  await dialog.getByRole("button", { name: "Bỏ thay đổi", exact: true }).click(); await expect(page).toHaveURL(`${base}/admin/orders`); api.check();
});
for (const navigationApi of [true, false]) test(`Back preserves a draft and filters with Navigation API ${navigationApi}`, async ({ page }) => {
  if (!navigationApi) await page.addInitScript(() => Object.defineProperty(window, "navigation", { value: undefined, configurable: true }));
  const api = await setup(page); await api.visit("/admin/products?q=S%E1%BA%A3n&page=2");
  const previousIndex = await page.evaluate(() => history.state.__btFormIndex as number);
  await page.getByRole("link", { name: "Thêm sản phẩm", exact: true }).click();
  await page.getByLabel("Tên sản phẩm", { exact: false }).fill("Bản nháp QA");
  await expect(page.locator("form[data-unsaved]")).toHaveAttribute("data-unsaved", "true");
  await expect.poll(() => page.evaluate(() => history.state.__btFormIndex as number)).toBeGreaterThan(previousIndex);
  await page.evaluate(() => history.back());
  const dialog = page.getByRole("dialog", { name: "Bỏ thay đổi chưa lưu?" });
  await expect(dialog).toBeVisible(); await dialog.getByRole("button", { name: "Tiếp tục chỉnh sửa" }).click();
  await expect(page.getByLabel("Tên sản phẩm", { exact: false })).toHaveValue("Bản nháp QA");
  await page.evaluate(() => history.back()); await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Bỏ thay đổi", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/products\?q=.*page=2/); await expect(page.getByRole("button", { name: "Trang 2" })).toHaveAttribute("aria-current", "page"); api.check();
});
for (const width of [320, 390, 768, 1440]) {
  test(`Tables, pagination and save bar fit at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 }); const api = await setup(page); await api.visit("/admin/products");
    const table = page.locator("#admin-content table"); await expect(table).toContainText("QA-0");
    const action = table.getByRole("link", { name: "Sửa sản phẩm QA-0", exact: true });
    if (width < 768) {
      await expect(action).toBeInViewport();
      await table.evaluate(element => { element.parentElement!.scrollLeft = 1000; });
      await expect(action).toBeInViewport(); await expect(table.getByRole("link", { name: "Sản phẩm 0", exact: true })).toBeInViewport();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.getByRole("link", { name: "Thêm sản phẩm", exact: true }).click();
    await expect(page.getByRole("button", { name: "Lưu sản phẩm", exact: true })).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await mkdir("/private/tmp/baotin-admin-ux", { recursive: true }); await page.screenshot({ path: `/private/tmp/baotin-admin-ux/form-${width}.png`, fullPage: true }); api.check();
  });
}
test("CSV exports all filtered rows through bounded pages", async ({ page }) => {
  const api = await setup(page); await api.visit("/admin/products");
  const download = page.waitForEvent("download"); await page.getByRole("button", { name: "Xuất CSV", exact: true }).click();
  const file = await download; const content = await readFile((await file.path())!, "utf8");
  expect(content.trim().split(/\r?\n/)).toHaveLength(56);
  expect(api.calls.filter(url => url.searchParams.get("pageSize") === "50").map(url => url.searchParams.get("page"))).toEqual(["1", "2"]); api.check();
});

test("Explicit cancel keeps an edited customer until discard is confirmed", async ({ page }) => {
  const api = await setup(page); await api.visit("/admin/customers");
  await page.getByRole("button", { name: "Sửa khách KH001", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Sửa hồ sơ khách B2B", exact: true });
  await editor.getByLabel("Người liên hệ", { exact: false }).fill("Bản nháp liên hệ");
  await editor.getByRole("button", { name: "Hủy", exact: true }).click();
  const confirm = page.getByRole("dialog", { name: "Bỏ thay đổi chưa lưu?" });
  await expect(confirm).toBeVisible(); await confirm.getByRole("button", { name: "Tiếp tục chỉnh sửa" }).click();
  await expect(editor.getByLabel("Người liên hệ", { exact: false })).toHaveValue("Bản nháp liên hệ");
  await editor.getByRole("button", { name: "Hủy", exact: true }).click();
  await confirm.getByRole("button", { name: "Bỏ thay đổi", exact: true }).click();
  await expect(editor).not.toBeVisible(); api.check();
});

test("Large lists keep page controls bounded on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  const api = await setup(page);
  const template = api.state.products[0];
  api.state.products = Array.from({ length: 10000 }, (_, i) => ({ ...template, id: `QA-${i}`, code: `QA-${i}`, name: `Sản phẩm ${i}` }));
  await api.visit("/admin/products?page=500");
  const pagination = page.getByRole("navigation", { name: "Phân trang", exact: true });
  await expect(pagination.getByRole("button", { name: "Trang 500", exact: true })).toHaveAttribute("aria-current", "page");
  expect(await pagination.getByRole("button").count()).toBeLessThanOrEqual(7);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true); api.check();
});

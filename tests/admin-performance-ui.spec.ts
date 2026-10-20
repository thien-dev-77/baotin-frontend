import { expect, test, type Page } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { createServer, type Server } from "node:http";
import { catalog, categoryCatalog } from "../lib/catalog";
import { adminCustomers, adminOrders } from "../lib/admin-preview";
import type { ApiAdminState } from "../lib/api-types";
import { adminReadFixture } from "./admin-read-fixtures";

const base = "http://127.0.0.1:3074";
let server: Server, child: ChildProcess, logs = "";
test.describe.configure({ mode: "serial" });
test.use({ viewport: { width: 1440, height: 850 } });
test.setTimeout(60000);
test.beforeAll(async () => {
  test.setTimeout(120000);
  server = createServer((incoming, outgoing) => {
    const path = new URL(incoming.url!, base).pathname;
    const value = path === "/api/health" ? { status: "ok" } : path === "/api/auth/session" ? { user: null }
      : path === "/api/catalog/bootstrap" ? { products: [], categories: categoryCatalog } : [];
    outgoing.writeHead(200, { "Content-Type": "application/json" }); outgoing.end(JSON.stringify(value));
  });
  server.listen(0, "127.0.0.1"); await once(server, "listening");
  const address = server.address(); if (!address || typeof address === "string") throw new Error("Missing QA backend.");
  child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--webpack", "-H", "127.0.0.1", "-p", "3074"], {
    env: { ...process.env, NEXT_DIST_DIR: ".next-admin-performance-qa", NEXT_PUBLIC_API_MODE: "true", BACKEND_URL: `http://127.0.0.1:${address.port}`, TOKIO_WORKER_THREADS: "1", RAYON_NUM_THREADS: "1" }, stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout?.on("data", data => { logs += data; }); child.stderr?.on("data", data => { logs += data; });
  for (let attempt = 0; attempt < 200; attempt++) {
    if (child.exitCode !== null) throw new Error(logs);
    if (await fetch(`${base}/api/backend/health`).then(response => response.ok).catch(() => false)) return;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(logs);
});
test.afterAll(async () => {
  if (child?.exitCode === null) { const exited = once(child, "exit"); child.kill("SIGTERM"); await exited; }
  if (server?.listening) { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
});

async function setup(page: Page, holdCategories = false) {
  const state: ApiAdminState = {
    products: Array.from({ length: 24 }, (_, i) => ({ ...catalog[0], id: `perf-${i}`, slug: `perf-${i}`, name: `Sản phẩm ${String(i).padStart(2, "0")}`, code: `PERF-${i}`, published: true, revision: 3, stock: 100, gallery: [catalog[0].image], technicalDetails: "<p>Model: Giữ nguyên</p><p>Công suất: 100W</p>" })),
    categories: categoryCatalog, customers: structuredClone(adminCustomers), orders: [], approvals: [], receipts: [], warehouse: {}, paymentDueDates: {}, today: "2026-10-20",
  };
  const reads: URL[] = [], writes: { path: string; body: Record<string, unknown> }[] = [], errors: string[] = [];
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/_next/image?**", route => route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>' }));
  await page.route("**/api/backend/**", async route => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname.slice("/api/backend".length);
    if (request.method() === "GET") reads.push(url);
    if (path === "/admin/resources" && holdCategories) await gate;
    if (request.method() === "POST" && path === "/admin/orders/quote") {
      const input = request.postDataJSON() as { items: { productId: string; quantity: number }[] };
      const items = input.items.map(item => ({ ...item, unitPrice: 1000 }));
      const total = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
      await route.fulfill({ json: { items, subtotal: total, total, shipping: 0, discount: 0 } }); return;
    }
    if (request.method() !== "GET") {
      writes.push({ path, body: request.postDataJSON() });
      if (path === "/admin/ledger/adjust") { await route.fulfill({ json: { ok: true } }); return; }
      if (path === "/admin/commands") { await route.fulfill({ json: { id: "new-order" } }); return; }
      if (request.method() === "PATCH" && path === "/admin/products/perf-0") { await route.fulfill({ json: { id: "perf-0" } }); return; }
      errors.push(`Unexpected write ${path}`); await route.fulfill({ status: 405, json: {} }); return;
    }
    if (path === "/admin/ledger/page") {
      const tab = url.searchParams.get("tab"), query = url.searchParams.get("q") || "";
      const rows = tab === "stock" ? state.products.filter(item => `${item.name} ${item.code}`.includes(query)).map(item => ({ id: item.id, code: item.code, name: item.name, unit: item.unit, stock: item.stock, onHand: item.stock, reserved: 0 })) : tab === "credit" ? state.customers.filter(item => item.branch === url.searchParams.get("branch")) : [];
      const pageSize = Number(url.searchParams.get("pageSize") || 10), pageNumber = Math.min(Number(url.searchParams.get("page") || 1), Math.max(1, Math.ceil(rows.length / pageSize)));
      const visible = rows.slice((pageNumber - 1) * pageSize, pageNumber * pageSize);
      await route.fulfill({ json: { inventory: tab === "stock" ? visible : [], customers: tab === "credit" ? visible : [], entries: [], pagination: { total: rows.length, page: pageNumber, pageSize, totalPages: Math.max(1, Math.ceil(rows.length / pageSize)) } } }); return;
    }
    const responses: Record<string, unknown> = {
      "/auth/session": { user: { id: "qa-admin", name: "QA Admin", email: "qa@example.test", role: "admin", branches: ["Quy Nhơn", "Tuy Hòa"], customer: null } },
      "/admin/resources": { categories: state.categories, today: state.today }, "/notifications/count": { unreadCount: 0 },
      "/catalog/bootstrap": { products: [], categories: categoryCatalog }, "/orders": [], "/account": { favorites: [] },
    };
    const value = adminReadFixture(url, state) || responses[path];
    if (!value) errors.push(`Unexpected GET ${path}`);
    await route.fulfill({ status: value ? 200 : 404, json: value || {} });
  });
  return { state, reads, writes, release, check: () => expect(errors).toEqual([]) };
}

test("Product list loads independently, pages reuse metadata and editing starts before categories finish", async ({ page }) => {
  const api = await setup(page, true);
  await page.goto(`${base}/admin/products`);
  await expect(page.getByRole("row").filter({ hasText: "PERF-0" })).toBeVisible();
  expect(api.reads.filter(url => url.pathname.endsWith("/admin/product-metadata"))).toHaveLength(1);
  expect(api.reads.filter(url => url.pathname.endsWith("/admin/resources"))).toHaveLength(0);
  await page.getByRole("button", { name: "Trang 2", exact: true }).click();
  await expect(page.getByRole("row").filter({ hasText: "PERF-10" })).toBeVisible();
  expect(api.reads.filter(url => url.pathname.endsWith("/admin/product-metadata"))).toHaveLength(1);
  await page.goto(`${base}/admin/products/perf-0/edit`);
  await expect.poll(() => api.reads.some(url => url.pathname.endsWith("/perf-0/editor"))).toBe(true);
  await expect.poll(() => api.reads.some(url => url.pathname.endsWith("/admin/resources"))).toBe(true);
  api.release();
  await expect(page.getByLabel("Tên sản phẩm", { exact: false }).first()).toHaveValue("Sản phẩm 00");
  await expect(page.getByRole("textbox", { name: /Thông số kỹ thuật/ })).toHaveCount(0);
  await page.getByLabel("Tên sản phẩm", { exact: false }).first().fill("Tên mới chưa lưu");
  await page.locator('[data-rich-text-field="product-specification"]').scrollIntoViewIfNeeded();
  const editor = page.getByRole("textbox", { name: /Thông số kỹ thuật/ });
  await expect(editor).toContainText("Model: Giữ nguyên");
  await expect(page.getByLabel("Tên sản phẩm", { exact: false }).first()).toHaveValue("Tên mới chưa lưu");
  await expect(page.locator("form[data-unsaved=true]")).toHaveCount(1);
  api.check();
});

test("Creating an order loads no catalog, pages SKU search and retains selected products and draft", async ({ page }) => {
  const api = await setup(page);
  await page.goto(`${base}/admin/orders/new`);
  await expect(page.getByRole("heading", { name: "Tạo đơn hộ khách" })).toBeVisible();
  expect(api.reads.filter(url => url.pathname.endsWith("/admin/resources"))).toHaveLength(0);
  expect(api.reads.filter(url => url.pathname.endsWith("/admin/browse"))).toHaveLength(0);
  await page.getByLabel("Người nhận", { exact: false }).fill("Người nhận chưa lưu");
  await page.getByRole("button", { name: "Thêm sản phẩm", exact: true }).click();
  const modal = page.getByRole("dialog", { name: "Thêm sản phẩm", exact: true });
  await modal.getByRole("button", { name: "Thêm PERF-0", exact: true }).click();
  await modal.getByRole("button", { name: "Trang 2", exact: true }).click();
  await modal.getByRole("button", { name: "Thêm PERF-10", exact: true }).click();
  await modal.getByPlaceholder("Tìm tên, SKU, thương hiệu...").fill("PERF-23");
  await expect(modal.getByRole("button", { name: "Thêm PERF-23", exact: true })).toBeEnabled();
  await modal.getByRole("button", { name: "Thêm PERF-23", exact: true }).click();
  await modal.getByRole("button", { name: "Xong (3)", exact: true }).click();
  for (const code of ["PERF-0", "PERF-10", "PERF-23"]) await expect(page.getByRole("listitem", { name: `Dòng sản phẩm ${code}`, exact: true })).toBeVisible();
  await expect(page.getByLabel("Người nhận", { exact: false })).toHaveValue("Người nhận chưa lưu");
  const picker = api.reads.filter(url => url.pathname.endsWith("/admin/browse"));
  expect(picker.every(url => url.searchParams.get("metadata") === "false" && url.searchParams.get("pageSize") === "10" && url.searchParams.get("status") === "published")).toBe(true);
  expect(api.reads.filter(url => url.pathname.endsWith("/admin/order-editor"))).toHaveLength(1);
  api.check();
});

test("Ledger requests only the active tab and page, and refreshes once after adjusting stock", async ({ page }) => {
  const api = await setup(page);
  await page.goto(`${base}/admin/ledger`);
  await expect(page.getByRole("cell", { name: "PERF-0", exact: true })).toBeVisible();
  expect(api.reads.filter(url => url.pathname.endsWith("/admin/ledger"))).toHaveLength(0);
  await page.getByRole("button", { name: "Trang 2", exact: true }).click();
  await expect(page.getByRole("cell", { name: "PERF-10", exact: true })).toBeVisible();
  await page.getByPlaceholder("Tìm mã hàng, khách hàng").fill("PERF-23");
  await expect(page.getByRole("cell", { name: "PERF-23", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Điều chỉnh PERF-23", exact: true }).click();
  await page.getByLabel("Lý do", { exact: false }).fill("Kiểm kê thử nghiệm");
  const before = api.reads.filter(url => url.pathname.endsWith("/admin/ledger/page")).length;
  await page.getByRole("button", { name: "Xác nhận điều chỉnh", exact: true }).click();
  await expect.poll(() => api.writes.length).toBe(1);
  await expect.poll(() => api.reads.filter(url => url.pathname.endsWith("/admin/ledger/page")).length).toBe(before + 1);
  await page.getByPlaceholder("Tìm mã hàng, khách hàng").fill("");
  await page.getByRole("tab", { name: "Công nợ", exact: true }).click();
  await expect.poll(() => api.reads.some(url => url.searchParams.get("tab") === "credit")).toBe(true);
  await expect(page.getByRole("columnheader", { name: "Khách hàng", exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: "PERF-23", exact: true })).toHaveCount(0);
  api.check();
});

test("Refreshing an edited order preserves the draft and blocks overwriting another revision", async ({ page }) => {
  const api = await setup(page);
  api.state.orders.push({ ...adminOrders[2], id: "perf-order", status: "Chờ xác nhận", approvalId: undefined, revision: 3, items: [{ productId: "perf-0", quantity: 1, unitPrice: 1000 }] });
  await page.goto(`${base}/admin/orders/perf-order/edit`);
  const phone = page.getByLabel("Số điện thoại", { exact: false });
  await phone.fill("0901234567");
  api.state.orders[0] = { ...api.state.orders[0], revision: 4 };
  await page.getByRole("button", { name: "Làm mới dữ liệu", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Đơn hàng đã được cập nhật ở phiên khác" })).toBeVisible();
  await expect(phone).toHaveValue("0901234567");
  await expect(page.getByRole("button", { name: "Lưu thay đổi", exact: true })).toBeDisabled();
  expect(api.writes).toHaveLength(0); api.check();
});

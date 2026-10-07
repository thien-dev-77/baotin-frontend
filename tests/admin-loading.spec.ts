import { expect, test, type Locator, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { catalog, categoryCatalog } from "../lib/catalog";
import { adminApprovals, adminCustomers, adminOrders, previewDate } from "../lib/admin-preview";
import type { ApiAdminState } from "../lib/api-types";
import { authEventKey } from "../lib/store/auth-slice";

const base = process.env.QA_BASE_URL || "http://127.0.0.1:3010";
if (!["127.0.0.1", "localhost"].includes(new URL(base).hostname)) throw new Error("Admin loading QA only runs locally.");
test.use({ viewport: { width: 1440, height: 1000 } });
test.setTimeout(45000);

function fixtures(): ApiAdminState {
  return {
    products: catalog.map(product => ({ ...product, stock: 500, published: true, gallery: [product.image], revision: 1 })),
    categories: categoryCatalog,
    customers: structuredClone(adminCustomers),
    orders: structuredClone(adminOrders).map(order => ({ ...order, revision: 1, credit: order.id === "BT26100004" || order.credit })),
    approvals: structuredClone(adminApprovals),
    warehouse: {},
    receipts: [{ id: "PTM0001", orderId: "BT26100004", branch: "Quy Nhơn", amount: 1000, date: previewDate, method: "Chuyển khoản", reference: "QA-RECEIPT", note: "", status: "Chờ đối chiếu", createdAt: `${previewDate}T09:00:00Z` }],
    paymentDueDates: {}, today: previewDate,
  };
}

type Gate = { path: string; method: string; body: unknown; status: number; count: number; payload?: Record<string, unknown>; wait: Promise<void>; release: () => void };

async function mockAdmin(page: Page) {
  const state = fixtures();
  let signedIn = true;
  let gate: Gate | undefined;
  let sessionReads = 0;
  const unexpected: string[] = [];
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  const staff = { id: "qa-admin", name: "QA Admin", email: "qa@example.test", role: "admin", branches: ["Quy Nhơn", "Tuy Hòa"], customer: null };
  const integration = { configured: true, enabled: true, missing: [], branches: { "Quy Nhơn": 1 }, links: [], runs: [], outbox: [{ orderId: "BT26100004", status: "uncertain", externalId: "", at: previewDate }] };
  const resources: Record<string, unknown> = {
    "/admin/pricing": { policies: [] },
    "/admin/users": { users: [{ ...staff, id: "qa-sales", role: "sales", disabled: false, revision: 1 }] },
    "/admin/ledger": { inventory: state.products.slice(0, 2).map(product => ({ ...product, onHand: 500, reserved: 0 })), customers: state.customers, entries: [] },
    "/admin/integrations/kiotviet": integration,
  };
  // Intercept every client API call so no mutation can reach the real database.
  await page.route("**/api/backend/**", async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname.slice("/api/backend".length);
    const method = request.method();
    if (method === "GET" && path === "/auth/session") sessionReads++;
    if (gate && path === gate.path && method === gate.method) {
      const current = gate;
      current.count++;
      if (request.headers()["content-type"]?.includes("application/json")) current.payload = request.postDataJSON();
      await current.wait;
      await route.fulfill({ status: current.status, json: current.body });
      return;
    }
    if (method === "POST" && path === "/admin/orders/quote") {
      const order = state.orders[2];
      await route.fulfill({ json: { items: order.items, subtotal: order.total, shipping: 0, discount: 0, total: order.total } });
      return;
    }
    const responses: Record<string, unknown> = {
      "/auth/session": { user: signedIn ? staff : null },
      "/catalog": { products: catalog, categories: categoryCatalog },
      "/orders": [], "/account": { favorites: [] }, "/admin/state": state,
      ...resources,
    };
    if (method !== "GET" || !(path in responses)) {
      unexpected.push(`${method} ${path}`);
      await route.fulfill({ status: 500, json: { message: "Unexpected QA API request" } });
      return;
    }
    await route.fulfill({ json: responses[path] });
  });
  return {
    state, staff, resources, errors, unexpected,
    sessionReads: () => sessionReads,
    session: (value: boolean) => { signedIn = value; },
    delay: (path: string, body: unknown = { id: "QA-SAVED", state }, status = 200, method = "POST") => {
      let release!: () => void;
      const wait = new Promise<void>(resolve => { release = resolve; });
      gate = { path, method, body, status, count: 0, wait, release };
      return gate;
    },
    visit: async (path: string) => {
      await page.goto(`${base}${path}`);
      await expect(page.getByRole("button", { name: "Làm mới dữ liệu", exact: true })).toBeEnabled();
    },
    check: () => { expect(unexpected).toEqual([]); expect(errors).toEqual([]); },
  };
}

async function pending(page: Page, button: Locator, gate: Gate, dialog = false) {
  await expect(button).toBeEnabled();
  await page.evaluate(async () => { await document.fonts.ready; });
  const before = await button.boundingBox();
  await button.click();
  await expect.poll(() => gate.count).toBe(1);
  await expect(button).toBeDisabled();
  await expect(button).toHaveAttribute("aria-busy", "true");
  await expect(button.locator("[data-loading-spinner]")).toBeVisible();
  const during = await button.boundingBox();
  expect(Math.abs(during!.width - before!.width)).toBeLessThan(1);
  expect(Math.abs(during!.height - before!.height)).toBeLessThan(1);
  await button.evaluate(element => { (element as HTMLButtonElement).click(); });
  expect(gate.count).toBe(1);
  if (dialog) {
    await expect(page.locator("dialog[open]").getByRole("button", { name: "Đóng", exact: true })).toBeDisabled();
    await page.keyboard.press("Escape");
    await expect(page.locator("dialog[open]")).toBeVisible();
  }
}

for (const width of [1440, 768, 390, 320]) {
  test(`customer status has a stable loading button at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const api = await mockAdmin(page);
    await api.visit("/admin/customers");
    await page.getByRole("button", { name: "Xem khách KH001", exact: true }).click();
    const gate = api.delay("/admin/commands");
    const button = page.getByRole("button", { name: "Tạm ngưng tài khoản", exact: true });
    try {
      await pending(page, button, gate, true);
      expect(gate.payload?.action).toBe("customer-status");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      await mkdir("/private/tmp/baotin-admin-loading", { recursive: true });
      await page.screenshot({ path: `/private/tmp/baotin-admin-loading/customer-${width}.png`, fullPage: true });
    } finally { gate.release(); }
    await expect(button).toBeEnabled();
    await expect(button.locator("[data-loading-spinner]")).toHaveCount(0);
    await expect(page.getByRole("status").filter({ hasText: "Đã lưu thay đổi." })).toBeVisible();
    api.check();
  });
}

test("failed commands clear loading and retain an actionable error", async ({ page }) => {
  const api = await mockAdmin(page);
  await api.visit("/admin/customers");
  await page.getByRole("button", { name: "Xem khách KH001", exact: true }).click();
  const gate = api.delay("/admin/commands", { message: "Máy chủ đang bận, thử lại." }, 503);
  const button = page.getByRole("button", { name: "Tạm ngưng tài khoản", exact: true });
  try { await pending(page, button, gate, true); } finally { gate.release(); }
  await expect(button).toBeEnabled();
  await expect(button.locator("[data-loading-spinner]")).toHaveCount(0);
  await expect(page.getByRole("status").filter({ hasText: "Máy chủ đang bận" })).toBeVisible();
  await expect(page.locator("dialog[open]").getByRole("button", { name: "Đóng", exact: true })).toBeEnabled();
  api.check();
});

for (const cancel of [false, true]) {
  test(`order ${cancel ? "cancellation" : "confirmation"} shows loading`, async ({ page }) => {
    const api = await mockAdmin(page);
    await api.visit("/admin/orders?order=BT26100003");
    if (cancel) {
      await page.getByRole("button", { name: "Hủy đơn", exact: true }).click();
      await page.getByLabel("Lý do hủy đơn").fill("Khách đề nghị hủy.");
    }
    const gate = api.delay("/admin/commands");
    const button = page.getByRole("button", { name: cancel ? "Xác nhận hủy" : "Xác nhận đơn", exact: true });
    try { await pending(page, button, gate, true); expect(gate.payload?.action).toBe(cancel ? "cancel-order" : "advance-order"); } finally { gate.release(); }
    await expect(page.locator("[data-loading-spinner]")).toHaveCount(0);
    api.check();
  });
}

for (const approved of [false, true]) {
  test(`only the clicked approval ${approved ? "approve" : "reject"} button spins`, async ({ page }) => {
    const api = await mockAdmin(page);
    await api.visit("/admin/approvals?request=YC001");
    await page.getByLabel("Ý kiến xử lý").fill("Đã kiểm tra thông tin.");
    const gate = api.delay("/admin/commands");
    const button = page.getByRole("button", { name: approved ? "Duyệt yêu cầu" : "Từ chối", exact: true });
    try {
      await pending(page, button, gate, true);
      const other = page.getByRole("button", { name: approved ? "Từ chối" : "Duyệt yêu cầu", exact: true });
      await expect(other).toBeDisabled();
      await expect(other.locator("[data-loading-spinner]")).toHaveCount(0);
    } finally { gate.release(); }
    await expect(page.locator("dialog[open]")).toHaveCount(0);
    api.check();
  });
}

test("approval request starts loading before the API response and recovers from errors", async ({ page }) => {
  const api = await mockAdmin(page);
  api.state.approvals = [];
  await api.visit("/admin/approvals/new?order=BT26100001");
  await page.getByLabel("Lý do đề nghị").fill("Giá cho công trình.");
  const gate = api.delay("/admin/commands", { message: "Không thể gửi yêu cầu." }, 400);
  const button = page.getByRole("button", { name: "Gửi yêu cầu duyệt", exact: true });
  try { await pending(page, button, gate); } finally { gate.release(); }
  await expect(button).toBeEnabled();
  await expect(page.getByRole("alert").filter({ hasText: "Không thể gửi yêu cầu." })).toBeVisible();
  api.check();
});

test("warehouse checkbox replaces its check with a spinner without losing its label", async ({ page }) => {
  const api = await mockAdmin(page);
  await api.visit("/admin/warehouse?order=BT26100005");
  const productId = api.state.orders[4].items[0].productId;
  const checkbox = page.getByRole("checkbox", { name: `Đã soạn ${productId}`, exact: true });
  const gate = api.delay("/admin/commands");
  try {
    await checkbox.click();
    await expect.poll(() => gate.count).toBe(1);
    await expect(checkbox).toBeDisabled();
    await expect(checkbox.locator("xpath=../..")).toHaveAttribute("aria-busy", "true");
    await expect(checkbox.locator("..").locator("[data-loading-spinner]")).toBeVisible();
    expect(gate.payload?.action).toBe("pick-item");
  } finally { gate.release(); }
  await expect(checkbox).toBeEnabled();
  api.check();
});

test("warehouse shortage report shows loading", async ({ page }) => {
  const api = await mockAdmin(page);
  await api.visit("/admin/warehouse?order=BT26100005");
  await page.getByRole("button", { name: "Báo thiếu hàng", exact: true }).click();
  await page.getByLabel("Ghi chú thiếu hàng").fill("Thiếu một sản phẩm.");
  const gate = api.delay("/admin/commands");
  try { await pending(page, page.getByRole("button", { name: "Gửi báo thiếu", exact: true }), gate, true); } finally { gate.release(); }
  await expect(page.getByRole("button", { name: "Báo thiếu hàng", exact: true })).toBeEnabled();
  api.check();
});

test("warehouse shortage resolution shows loading", async ({ page }) => {
  const api = await mockAdmin(page);
  const order = api.state.orders[4];
  api.state.warehouse[order.id] = { checks: Object.fromEntries(order.items.map(line => [line.productId, true])), history: [], issue: { productId: order.items[0].productId, quantity: 1, note: "Thiếu hàng", reportedAt: `${previewDate}T09:00:00Z` } };
  await api.visit(`/admin/warehouse?order=${order.id}`);
  await page.getByLabel("Kết quả xử lý thiếu hàng").fill("Đã bổ sung đủ hàng.");
  const gate = api.delay("/admin/commands");
  const button = page.getByRole("button", { name: "Xác nhận đã đủ hàng", exact: true });
  try { await pending(page, button, gate, true); expect(gate.payload?.action).toBe("resolve-shortage"); } finally { gate.release(); }
  await expect(page.locator("[data-loading-spinner]")).toHaveCount(0);
  api.check();
});

test("sales order save spins while awaiting the command and recovers on error", async ({ page }) => {
  const api = await mockAdmin(page);
  await api.visit("/admin/orders/BT26100003/edit");
  await page.getByLabel("Số điện thoại", { exact: false }).fill("0901234567");
  await page.getByLabel("Lý do sửa đơn", { exact: false }).fill("Khách cập nhật thông tin.");
  const gate = api.delay("/admin/commands", { message: "Không thể lưu đơn." }, 400);
  const button = page.getByRole("button", { name: "Lưu thay đổi", exact: true });
  try { await pending(page, button, gate); expect(gate.payload?.action).toBe("save-order"); } finally { gate.release(); }
  await expect(button).toBeEnabled();
  await expect(page.getByRole("alert").filter({ hasText: "Không thể lưu đơn." })).toBeVisible();
  api.check();
});

for (const action of ["create-receipt", "reconcile-receipt", "void-receipt", "due-date"]) {
  test(`accounting ${action} shows loading`, async ({ page }) => {
    const api = await mockAdmin(page);
    await api.visit("/admin/accounting");
    let name: string;
    if (action === "reconcile-receipt" || action === "void-receipt") {
      await page.getByRole("button", { name: "Xem phiếu PTM0001", exact: true }).click();
      if (action === "reconcile-receipt") {
        await page.getByLabel("Kết quả kiểm tra").fill("Khớp chứng từ.");
        name = "Xác nhận đối chiếu";
      } else {
        await page.getByRole("button", { name: "Hủy phiếu thu", exact: true }).click();
        await page.getByLabel("Lý do hủy phiếu").fill("Nhập trùng chứng từ.");
        name = "Xác nhận hủy phiếu";
      }
    } else {
      await page.getByRole("tab", { name: "Đơn cần thu", exact: true }).click();
      await page.getByRole("button", { name: action === "due-date" ? "Hạn thanh toán BT26100004" : "Lập phiếu BT26100004", exact: true }).click();
      if (action === "due-date") { await page.getByLabel("Ngày đến hạn").fill(previewDate); name = "Lưu hạn thanh toán"; }
      else { await page.getByLabel("Mã giao dịch / chứng từ").fill("QA-NEW"); name = "Lập phiếu thu"; }
    }
    const gate = api.delay("/admin/commands");
    try { await pending(page, page.getByRole("button", { name, exact: true }), gate, true); expect(gate.payload?.action).toBe(action); } finally { gate.release(); }
    await expect(page.locator("dialog[open]")).toHaveCount(0);
    api.check();
  });
}

test("price policy form has a stable spinner and preserves inputs on failure", async ({ page }) => {
  const api = await mockAdmin(page);
  await api.visit("/admin/pricing");
  await page.getByRole("button", { name: "Tạo bảng giá", exact: true }).click();
  await page.getByLabel("Tên bảng giá").fill("Bảng giá kiểm thử");
  const gate = api.delay("/admin/pricing", { message: "Không thể lưu bảng giá." }, 400);
  const button = page.getByRole("button", { name: "Lưu bảng giá", exact: true });
  try { await pending(page, button, gate, true); } finally { gate.release(); }
  await expect(button).toBeEnabled();
  await expect(page.getByLabel("Tên bảng giá")).toHaveValue("Bảng giá kiểm thử");
  await expect(page.getByRole("alert").filter({ hasText: "Không thể lưu bảng giá." })).toBeVisible();
  api.check();
});

test("inventory adjustment form shows loading", async ({ page }) => {
  const api = await mockAdmin(page);
  await api.visit("/admin/ledger");
  await page.getByRole("button", { name: `Điều chỉnh ${catalog[0].code}`, exact: true }).click();
  await page.getByLabel("Lý do", { exact: false }).fill("Kiểm kê thực tế.");
  const gate = api.delay("/admin/ledger/adjust", { ok: true });
  try { await pending(page, page.getByRole("button", { name: "Xác nhận điều chỉnh", exact: true }), gate, true); } finally { gate.release(); }
  await expect(page.locator("dialog[open]")).toHaveCount(0);
  api.check();
});

for (const passwordOnly of [false, true]) {
  test(`staff ${passwordOnly ? "password reset" : "save"} shows loading`, async ({ page }) => {
    const api = await mockAdmin(page);
    await api.visit("/admin/users");
    await page.getByRole("button", { name: passwordOnly ? "Đặt lại mật khẩu qa@example.test" : "Sửa qa@example.test", exact: true }).click();
    if (passwordOnly) {
      await page.getByLabel("Mật khẩu mới (tối thiểu 12 ký tự)", { exact: false }).fill("QA-Password-2026");
      await page.getByLabel("Xác nhận mật khẩu mới", { exact: false }).fill("QA-Password-2026");
    }
    const gate = api.delay(passwordOnly ? "/admin/users/qa-sales/password" : "/admin/users", { ok: true });
    try { await pending(page, page.getByRole("button", { name: passwordOnly ? "Đặt lại mật khẩu" : "Lưu tài khoản", exact: true }), gate, true); } finally { gate.release(); }
    await expect(page.locator("dialog[open]")).toHaveCount(0);
    api.check();
  });
}

test("product save and image upload each show their own pending state", async ({ page }) => {
  const api = await mockAdmin(page);
  await api.visit(`/admin/products/${catalog[0].id}/edit`);
  const upload = api.delay("/media/product-images", { message: "Không thể tải ảnh." }, 400);
  try {
    await page.getByLabel("Thêm ảnh sản phẩm", { exact: true }).setInputFiles({ name: "loading.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jOzgAAAAASUVORK5CYII=", "base64") });
    await expect.poll(() => upload.count).toBe(1);
    const label = page.getByLabel("Thêm ảnh sản phẩm", { exact: true }).locator("..");
    await expect(label).toHaveAttribute("aria-busy", "true");
    await expect(label.locator("[data-loading-spinner]")).toBeVisible();
    await expect(page.getByRole("button", { name: "Lưu sản phẩm", exact: true })).toBeDisabled();
  } finally { upload.release(); }
  await expect(page.getByRole("alert").filter({ hasText: "Không thể tải ảnh." })).toBeVisible();
  const gate = api.delay(`/admin/products/${catalog[0].id}`, { message: "Không thể lưu sản phẩm." }, 400, "PATCH");
  const button = page.getByRole("button", { name: "Lưu sản phẩm", exact: true });
  try { await pending(page, button, gate); } finally { gate.release(); }
  await expect(button).toBeEnabled();
  await expect(page.getByRole("alert").filter({ hasText: "Không thể lưu sản phẩm." })).toBeVisible();
  api.check();
});

test("header refresh shows a spinner without hiding the current screen", async ({ page }) => {
  const api = await mockAdmin(page);
  await api.visit("/admin/customers");
  const gate = api.delay("/admin/state", api.state, 200, "GET");
  const button = page.getByRole("button", { name: "Làm mới dữ liệu", exact: true });
  try { await pending(page, button, gate); await expect(page.getByRole("heading", { name: "Khách hàng B2B", exact: true })).toBeVisible(); } finally { gate.release(); }
  await expect(button).toBeEnabled();
  api.check();
});

for (const width of [1440, 390]) {
  test(`background refresh preserves the table, branch, filters and scroll at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const api = await mockAdmin(page);
    await api.visit("/admin/products");
    await page.getByRole("combobox", { name: "Chi nhánh", exact: true }).selectOption("Tuy Hòa");
    const search = page.getByLabel("Tìm sản phẩm, mã hàng, thương hiệu...", { exact: true });
    await search.fill("khóa");
    await page.getByRole("button", { name: "2", exact: true }).click();
    await page.locator("#admin-content table").evaluate(table => { table.setAttribute("data-refresh-node", "original"); table.parentElement!.scrollLeft = 80; });
    const scroll = await page.evaluate(() => ({ top: scrollY, left: document.querySelector("#admin-content table")!.parentElement!.scrollLeft }));
    const gate = api.delay("/admin/state", api.state, 200, "GET");
    try {
      await page.evaluate(() => window.dispatchEvent(new Event("focus")));
      await expect.poll(() => gate.count).toBeGreaterThan(0);
      expect(api.sessionReads()).toBe(1);
      await expect(page.locator('[data-refresh-node="original"]')).toBeVisible();
      await expect(search).toHaveValue("khóa");
      await expect(page.getByRole("button", { name: "2", exact: true })).toHaveAttribute("aria-current", "page");
      await expect(page.getByRole("combobox", { name: "Chi nhánh", exact: true })).toHaveValue("Tuy Hòa");
      await mkdir("/private/tmp/baotin-admin-loading", { recursive: true });
      await page.screenshot({ path: `/private/tmp/baotin-admin-loading/background-${width}.png`, fullPage: true });
    } finally { gate.release(); }
    await expect(page.getByRole("button", { name: "Làm mới dữ liệu", exact: true })).toBeEnabled();
    await expect(page.locator('[data-refresh-node="original"]')).toBeVisible();
    expect(await page.evaluate(() => ({ top: scrollY, left: document.querySelector("#admin-content table")!.parentElement!.scrollLeft }))).toEqual(scroll);
    api.check();
  });
}

test("status updates replace only the affected row content without unmounting the table", async ({ page }) => {
  const api = await mockAdmin(page);
  await api.visit("/admin/customers");
  const search = page.getByLabel("Tìm mã khách, tên, số điện thoại...", { exact: true });
  await search.fill("Minh An");
  await page.locator("#admin-content table").evaluate(table => { table.setAttribute("data-refresh-node", "original"); table.querySelector("tbody tr")!.setAttribute("data-refresh-row", "original"); });
  await page.getByRole("button", { name: "Xem khách KH001", exact: true }).click();
  const next = structuredClone(api.state);
  next.customers[0].status = "Tạm ngưng";
  const gate = api.delay("/admin/commands", { id: "KH001", state: next });
  try {
    await pending(page, page.getByRole("button", { name: "Tạm ngưng tài khoản", exact: true }), gate, true);
    await expect(page.locator('[data-refresh-node="original"]')).toBeVisible();
  } finally { gate.release(); }
  await expect(page.getByRole("button", { name: "Kích hoạt tài khoản", exact: true })).toBeEnabled();
  await page.locator("dialog[open]").getByRole("button", { name: "Đóng", exact: true }).click();
  await expect(page.locator('[data-refresh-row="original"]')).toContainText("Tạm ngưng");
  await expect(search).toHaveValue("Minh An");
  api.check();
});

test("an older background response cannot undo a confirmed status update", async ({ page }) => {
  const api = await mockAdmin(page);
  await api.visit("/admin/customers");
  const stale = api.delay("/admin/state", structuredClone(api.state), 200, "GET");
  const next = structuredClone(api.state);
  next.customers[0].status = "Tạm ngưng";
  let save: Gate | undefined;
  try {
    await page.getByRole("button", { name: "Làm mới dữ liệu", exact: true }).click();
    await expect.poll(() => stale.count).toBe(1);
    await page.getByRole("button", { name: "Xem khách KH001", exact: true }).click();
    save = api.delay("/admin/commands", { id: "KH001", state: next });
    await pending(page, page.getByRole("button", { name: "Tạm ngưng tài khoản", exact: true }), save, true);
    save.release();
    await expect(page.getByRole("button", { name: "Kích hoạt tài khoản", exact: true })).toBeEnabled();
    const response = page.waitForResponse(result => result.url().endsWith("/admin/state"));
    stale.release();
    await (await response).finished();
    await expect(page.getByRole("button", { name: "Làm mới dữ liệu", exact: true })).toBeEnabled();
    await expect(page.getByRole("button", { name: "Kích hoạt tài khoản", exact: true })).toBeEnabled();
    await expect(page.getByRole("button", { name: "Tạm ngưng tài khoản", exact: true })).toHaveCount(0);
  } finally { stale.release(); save?.release(); }
  api.check();
});

for (const [path, resourcePath] of [["/admin/pricing", "/admin/pricing"], ["/admin/users", "/admin/users"], ["/admin/ledger", "/admin/ledger"], ["/admin/integrations", "/admin/integrations/kiotviet"]]) {
  test(`failed background refresh keeps ${path} visible and retryable`, async ({ page }) => {
    const api = await mockAdmin(page);
    await api.visit(path);
    if (path === "/admin/integrations") await page.getByRole("tab", { name: "Đơn hàng", exact: true }).click();
    const table = page.locator("#admin-content table");
    await expect(table).toBeVisible();
    await table.evaluate(table => table.setAttribute("data-refresh-node", "original"));
    const failure = api.delay(resourcePath, { message: "Không thể tải bản cập nhật." }, 503, "GET");
    try {
      await page.getByRole("button", { name: "Làm mới dữ liệu", exact: true }).click();
      await expect.poll(() => failure.count).toBeGreaterThan(0);
      await expect(page.locator('[data-refresh-node="original"]')).toBeVisible();
    } finally { failure.release(); }
    await expect(page.getByRole("alert").filter({ hasText: "Chưa thể cập nhật dữ liệu." })).toBeVisible();
    await expect(page.locator('[data-refresh-node="original"]')).toBeVisible();
    const retry = api.delay(resourcePath, api.resources[resourcePath], 200, "GET");
    try {
      await pending(page, page.getByRole("button", { name: "Thử lại", exact: true }), retry);
      await expect(page.locator('[data-refresh-node="original"]')).toBeVisible();
    } finally { retry.release(); }
    await expect(page.getByRole("alert").filter({ hasText: "Chưa thể cập nhật dữ liệu." })).toHaveCount(0);
    await expect(page.locator('[data-refresh-node="original"]')).toBeVisible();
    api.check();
  });
}

test("a real branch permission change clears old data before loading the new scope", async ({ page }) => {
  const api = await mockAdmin(page);
  await api.visit("/admin/customers");
  await page.locator("#admin-content table").evaluate(table => table.setAttribute("data-refresh-node", "original"));
  api.staff.branches = ["Tuy Hòa"];
  const gate = api.delay("/admin/state", api.state, 200, "GET");
  try {
    const session = page.waitForResponse(result => result.url().endsWith("/auth/session"));
    await page.evaluate(key => window.dispatchEvent(new StorageEvent("storage", { key, newValue: JSON.stringify({ type: "refresh" }) })), authEventKey);
    await (await session).finished();
    await expect(page.getByRole("combobox", { name: "Chi nhánh", exact: true })).toHaveValue("Tuy Hòa");
    await expect(page.locator('[data-refresh-node="original"]')).toHaveCount(0);
    await expect(page.locator("#admin-content")).toContainText("Đang tải dữ liệu...");
  } finally { gate.release(); }
  await expect(page.locator("#admin-content table")).toContainText("Nội thất Mộc Việt");
  await expect(page.locator("#admin-content table")).not.toContainText("Xưởng nội thất Minh An");
  api.check();
});

test("a command from an old access scope cannot replace the new scope's data", async ({ page }) => {
  const api = await mockAdmin(page);
  await api.visit("/admin/customers");
  await page.getByRole("button", { name: "Xem khách KH001", exact: true }).click();
  const oldState = structuredClone(api.state);
  oldState.customers[4].name = "Obsolete scope customer";
  const save = api.delay("/admin/commands", { id: "KH001", state: oldState });
  let refresh: Gate | undefined;
  try {
    await pending(page, page.getByRole("button", { name: "Tạm ngưng tài khoản", exact: true }), save, true);
    api.staff.branches = ["Tuy Hòa"];
    refresh = api.delay("/admin/state", api.state, 200, "GET");
    await page.evaluate(key => window.dispatchEvent(new StorageEvent("storage", { key, newValue: JSON.stringify({ type: "refresh" }) })), authEventKey);
    await expect.poll(() => refresh!.count).toBeGreaterThan(0);
    refresh.release();
    await expect(page.locator("#admin-content table")).toContainText("Nội thất Mộc Việt");
    const response = page.waitForResponse(result => result.url().endsWith("/admin/commands"));
    save.release();
    await (await response).finished();
    await expect(page.locator("#admin-content table")).not.toContainText("Obsolete scope customer");
    await expect(page.getByRole("combobox", { name: "Chi nhánh", exact: true })).toHaveValue("Tuy Hòa");
  } finally { save.release(); refresh?.release(); }
  api.check();
});

test("resource retry retains its button while the retry request is pending", async ({ page }) => {
  const api = await mockAdmin(page);
  const failure = api.delay("/admin/pricing", { message: "Không thể tải bảng giá." }, 503, "GET");
  failure.release();
  await api.visit("/admin/pricing");
  const button = page.getByRole("button", { name: "Thử lại", exact: true });
  await expect(button).toBeVisible();
  const gate = api.delay("/admin/pricing", { policies: [] }, 200, "GET");
  try { await pending(page, button, gate); } finally { gate.release(); }
  await expect(button).toHaveCount(0);
  await expect(page.locator("[data-loading-spinner]")).toHaveCount(0);
  api.check();
});

test("dashboard error retry remains visible and busy until recovery", async ({ page }) => {
  const api = await mockAdmin(page);
  const failure = api.delay("/admin/state", { message: "Không thể tải dashboard." }, 503, "GET");
  failure.release();
  await api.visit("/admin/customers");
  const button = page.getByRole("button", { name: "Thử lại", exact: true });
  await expect(button).toBeVisible();
  const gate = api.delay("/admin/state", api.state, 200, "GET");
  try { await pending(page, button, gate); } finally { gate.release(); }
  await expect(button).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Khách hàng B2B", exact: true })).toBeVisible();
  api.check();
});

test("KiotViet preview and order reconciliation spin only the active action", async ({ page }) => {
  const api = await mockAdmin(page);
  await api.visit("/admin/integrations");
  const preview = api.delay("/admin/integrations/kiotviet/preview", { id: "QA-PREVIEW", products: [], customers: [], branches: [] });
  const button = page.getByRole("button", { name: "Lấy bản xem trước", exact: true });
  try { await pending(page, button, preview); } finally { preview.release(); }
  await expect(button).toBeEnabled();
  await page.getByRole("tab", { name: "Đơn hàng", exact: true }).click();
  const reconcile = page.getByRole("button", { name: "Đối chiếu", exact: true });
  const gate = api.delay("/admin/integrations/kiotviet/reconcile", { ok: true });
  try { await pending(page, reconcile, gate); await expect(button.locator("[data-loading-spinner]")).toHaveCount(0); } finally { gate.release(); }
  await expect(reconcile).toBeEnabled();
  api.check();
});

for (const action of ["link", "apply-prices", "export"]) {
  test(`KiotViet ${action} displays a spinner and locks confirmation`, async ({ page }) => {
    const api = await mockAdmin(page);
    await api.visit("/admin/integrations");
    if (action === "export") {
      await page.getByRole("tab", { name: "Đơn hàng", exact: true }).click();
      await page.getByRole("button", { name: "Gửi đơn", exact: true }).first().click();
    } else {
      const preview = api.delay("/admin/integrations/kiotviet/preview", { id: "QA-PREVIEW", products: [{ id: 1, code: "QA-001", unit: "cái", name: "QA Product", basePrice: 1000 }], customers: [], branches: [] });
      preview.release();
      await page.getByRole("button", { name: "Lấy bản xem trước", exact: true }).click();
      await expect(page.getByRole("button", { name: "Lấy bản xem trước", exact: true })).toBeEnabled();
      if (action === "link") {
        await page.getByRole("tab", { name: "Ghép mã", exact: true }).click();
        await page.locator("form select").nth(1).selectOption(catalog[0].id);
        await page.locator("form select").nth(2).selectOption("1");
      } else await page.getByRole("button", { name: "Đồng bộ giá đã ghép", exact: true }).click();
    }
    const gate = api.delay(`/admin/integrations/kiotviet/${action}`, { ok: true });
    const button = page.getByRole("button", { name: action === "link" ? "Ghép mã" : "Xác nhận", exact: true });
    try { await pending(page, button, gate, action !== "link"); } finally { gate.release(); }
    await expect(page.locator("[data-loading-spinner]")).toHaveCount(0);
    api.check();
  });
}

test("security password change shows loading and retains the form on failure", async ({ page }) => {
  const api = await mockAdmin(page);
  await api.visit("/admin/settings");
  await page.locator('input[name="currentPassword"]').fill("QA-Current-2026");
  await page.locator('input[name="password"]').fill("QA-Password-2026");
  await page.locator('input[name="confirm"]').fill("QA-Password-2026");
  const gate = api.delay("/auth/change-password", { message: "Mật khẩu hiện tại không đúng." }, 400);
  const button = page.getByRole("button", { name: "Đổi mật khẩu", exact: true });
  try { await pending(page, button, gate); } finally { gate.release(); }
  await expect(button).toBeEnabled();
  await expect(page.getByRole("alert").filter({ hasText: "Mật khẩu hiện tại không đúng." })).toBeVisible();
  api.check();
});

test("logout stays busy until the server responds", async ({ page }) => {
  const api = await mockAdmin(page);
  await api.visit("/admin/customers");
  const gate = api.delay("/auth/logout", { message: "Không thể đăng xuất." }, 503);
  const button = page.getByRole("button", { name: "Đăng xuất", exact: true });
  try { await pending(page, button, gate); } finally { gate.release(); }
  await expect(button).toBeEnabled();
  api.check();
});

test("admin login has loading feedback and recovers from a rejected login", async ({ page }) => {
  const api = await mockAdmin(page);
  api.session(false);
  await page.goto(`${base}/admin`);
  await page.getByLabel("Email nhân viên").fill("qa@example.test");
  await page.locator('input[name="password"]').fill("QA-Password-2026");
  const gate = api.delay("/auth/login", { message: "Mật khẩu không đúng." }, 401);
  const button = page.getByRole("button", { name: "Đăng nhập", exact: true });
  try { await pending(page, button, gate); } finally { gate.release(); }
  await expect(button).toBeEnabled();
  await expect(page.getByRole("alert").filter({ hasText: "Mật khẩu không đúng." })).toBeVisible();
  api.check();
});

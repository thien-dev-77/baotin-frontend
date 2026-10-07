import { expect, test, type Page } from "@playwright/test";
import { catalog, categoryCatalog } from "../lib/catalog";
import { authEventKey } from "../lib/store/auth-slice";
import type { SessionUser } from "../lib/types";

const base = process.env.QA_BASE_URL || "http://127.0.0.1:3010";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname)) throw new Error("Auth QA only runs locally.");
test.use({ viewport: { width: 1440, height: 1000 } });
const staff: SessionUser = { id: "qa-admin", name: "QA Admin", email: "qa@example.test", role: "admin", branches: ["Quy Nhơn"], customer: null };
const customer: SessionUser = { ...staff, id: "qa-b2b", role: "b2b", customer: { id: "qa-customer", name: "QA Customer", email: "qa@example.test", phone: "0901234567", company: "QA", role: "b2b", status: "active", creditLimit: 0, debt: 0 } };
type ResponseSpec = { body: unknown; status: number; wait?: Promise<void> };

async function mockAuth(page: Page, initialUser: SessionUser | null = staff) {
  let user = initialUser;
  const calls: string[] = [], errors: string[] = [];
  const overrides = new Map<string, ResponseSpec>();
  page.on("pageerror", error => errors.push(error.message));
  // Mock all client API requests; no real user or database mutation is made.
  await page.context().route("**/api/backend/**", async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname.slice("/api/backend".length);
    const key = `${request.method()} ${path}`;
    calls.push(key);
    const override = overrides.get(key);
    if (override) {
      await override.wait;
      await route.fulfill({ status: override.status, json: override.body });
      return;
    }
    if (key === "POST /auth/login") user = staff;
    if (key === "POST /auth/register") user = customer;
    if (key === "POST /auth/logout") user = null;
    const responses: Record<string, unknown> = {
      "GET /auth/session": { user }, "POST /auth/login": { user }, "POST /auth/register": { user }, "POST /auth/logout": { user },
      "GET /catalog": { products: catalog, categories: categoryCatalog },
      "GET /orders": [], "GET /account": { favorites: [] },
      "GET /admin/state": { products: catalog.map(product => ({ ...product, published: true, revision: 1 })), categories: categoryCatalog, orders: [], customers: [], approvals: [], receipts: [], warehouse: {}, paymentDueDates: {}, today: "2026-10-07" },
    };
    if (!(key in responses)) { errors.push(`Unexpected API request: ${key}`); await route.fulfill({ status: 500, json: { message: "Unexpected QA request" } }); return; }
    await route.fulfill({ json: responses[key] });
  });
  return {
    count: (key: string) => calls.filter(call => call === key).length,
    respond: (key: string, body: unknown, status = 200) => overrides.set(key, { body, status }),
    delay: (key: string, body: unknown, status = 200) => {
      let release!: () => void;
      const wait = new Promise<void>(resolve => { release = resolve; });
      overrides.set(key, { body, status, wait });
      return release;
    },
    asUser: (value: SessionUser | null) => { user = value; },
    check: () => expect(errors).toEqual([]),
  };
}

async function signIn(page: Page) {
  await page.locator('input[name="identity"]').fill("qa@example.test");
  await page.locator('input[name="password"]').fill("QA-password-123");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.locator("#admin-content table")).toBeVisible();
}

test("Auth is checked once; focus and client navigation reuse Redux state", async ({ page }) => {
  const api = await mockAuth(page);
  await page.goto(`${base}/admin/products`);
  await expect(page.locator("#admin-content table")).toBeVisible();
  expect(api.count("GET /auth/session")).toBe(1);
  await page.evaluate(() => { for (let i = 0; i < 3; i++) window.dispatchEvent(new Event("focus")); });
  await page.locator('nav[aria-label="Quản trị nội bộ"] a[href="/admin/customers"]').first().click();
  await expect(page.getByRole("heading", { name: "Khách hàng B2B", exact: true })).toBeVisible();
  await page.locator('nav[aria-label="Quản trị nội bộ"] a[href="/admin/products"]').first().click();
  await expect(page.locator("#admin-content table")).toBeVisible();
  expect(api.count("GET /auth/session")).toBe(1);
  api.check();
});

test("Login/logout consume their response directly, while F5 verifies the cookie once", async ({ page }) => {
  const api = await mockAuth(page, null);
  await page.goto(`${base}/admin/products`);
  await signIn(page);
  expect(api.count("POST /auth/login")).toBe(1);
  expect(api.count("GET /auth/session")).toBe(1);
  expect(await page.evaluate(() => {
    const cached = Object.values(localStorage).join(" ") + Object.values(sessionStorage).join(" ");
    return cached.includes("qa@example.test") || cached.includes("qa-admin");
  })).toBe(false);
  await page.reload();
  await expect(page.locator("#admin-content table")).toBeVisible();
  expect(api.count("GET /auth/session")).toBe(2);
  await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
  await expect(page.locator('input[name="identity"]')).toBeVisible();
  expect(api.count("POST /auth/logout")).toBe(1);
  expect(api.count("GET /auth/session")).toBe(2);
  api.check();
});

test("Registration accepts its user response without a second auth read", async ({ page }) => {
  const api = await mockAuth(page, null);
  await page.goto(`${base}/register`);
  await page.locator('input[name="name"]').fill("QA Customer");
  await page.locator('input[name="company"]').fill("QA Company");
  await page.locator('input[name="phone"]').fill("0901234567");
  await page.locator('main input[name="email"]').fill("qa@example.test");
  await page.locator('input[name="password"]').fill("QA-password-123");
  await page.getByRole("checkbox", { name: /Tôi đồng ý với/ }).check();
  await page.getByRole("button", { name: "Đăng ký tài khoản", exact: true }).click();
  await expect(page).toHaveURL(`${base}/account`);
  await expect(page.getByRole("heading", { name: "Xin chào, QA Customer", exact: true })).toBeVisible();
  expect(api.count("GET /auth/session")).toBe(1);
  api.check();
});

test("A protected 401 clears auth and the admin table without calling session again", async ({ page }) => {
  const api = await mockAuth(page);
  await page.goto(`${base}/admin/products`);
  await expect(page.locator("#admin-content table")).toBeVisible();
  api.respond("GET /admin/state", { message: "Token expired" }, 401);
  await page.getByRole("button", { name: "Làm mới dữ liệu", exact: true }).click();
  await expect(page.locator('input[name="identity"]')).toBeVisible();
  await expect(page.locator("#admin-content table")).toHaveCount(0);
  expect(api.count("GET /auth/session")).toBe(1);
  api.check();
});

test("A forbidden action does not log out a verified user", async ({ page }) => {
  const api = await mockAuth(page);
  await page.goto(`${base}/admin/products`);
  await expect(page.locator("#admin-content table")).toBeVisible();
  api.respond("GET /admin/state", { message: "No permission" }, 403);
  await page.getByRole("button", { name: "Làm mới dữ liệu", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "No permission" })).toBeVisible();
  await expect(page.locator("#admin-content table")).toBeVisible();
  expect(api.count("GET /auth/session")).toBe(1);
  api.check();
});

test("Malformed login responses never grant admin access", async ({ page }) => {
  const api = await mockAuth(page, null);
  await page.goto(`${base}/admin/products`);
  api.respond("POST /auth/login", { user: {} });
  await page.locator('input[name="identity"]').fill("qa@example.test");
  await page.locator('input[name="password"]').fill("QA-password-123");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Phản hồi phiên đăng nhập không hợp lệ" })).toBeVisible();
  await expect(page.locator("#admin-content table")).toHaveCount(0);
  expect(api.count("GET /auth/session")).toBe(1);
  api.check();
});

test("A delayed bootstrap cannot overwrite a completed login", async ({ page }) => {
  const api = await mockAuth(page, null);
  const release = api.delay("GET /auth/session", { user: null });
  try {
    await page.goto(`${base}/login?next=/admin/products`, { waitUntil: "domcontentloaded" });
    await expect.poll(() => api.count("GET /auth/session")).toBe(1);
    await page.locator('input[name="identity"]').fill("qa@example.test");
    await page.locator('input[name="password"]').fill("QA-password-123");
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
    await expect(page).toHaveURL(`${base}/admin/products`);
    await expect(page.locator("#admin-content table")).toBeVisible();
    const response = page.waitForResponse(response => response.url().endsWith("/auth/session"));
    release(); await (await response).finished();
    await expect(page.locator("#admin-content table")).toBeVisible();
    await expect(page.getByRole("button", { name: "Đăng xuất", exact: true })).toBeVisible();
    expect(api.count("GET /auth/session")).toBe(1);
  } finally { release(); }
  api.check();
});

test("Changing auth in another tab rechecks once; logout synchronizes without another auth read", async ({ page }) => {
  const api = await mockAuth(page, null);
  const second = await page.context().newPage();
  try {
    await page.goto(`${base}/admin/products`);
    await second.goto(`${base}/admin/products`);
    await expect(second.locator('input[name="identity"]')).toBeVisible();
    expect(api.count("GET /auth/session")).toBe(2);
    await signIn(page);
    await expect(second.locator("#admin-content table")).toBeVisible();
    expect(api.count("GET /auth/session")).toBe(3);
    await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
    await expect(second.locator('input[name="identity"]')).toBeVisible();
    expect(api.count("GET /auth/session")).toBe(3);
    const marker = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), authEventKey);
    expect(Object.keys(marker).sort()).toEqual(["nonce", "type"]);
  } finally { await second.close(); }
  api.check();
});

test("A transient auth refresh error retains the current table and offers retry", async ({ page }) => {
  const api = await mockAuth(page);
  await page.goto(`${base}/admin/products`);
  await expect(page.locator("#admin-content table")).toBeVisible();
  await page.locator("#admin-content table").evaluate(table => table.setAttribute("data-auth-node", "original"));
  api.respond("GET /auth/session", { message: "Auth temporarily unavailable" }, 503);
  await page.evaluate(key => window.dispatchEvent(new StorageEvent("storage", { key, newValue: JSON.stringify({ type: "refresh" }) })), authEventKey);
  await expect(page.getByRole("alert").filter({ hasText: "Auth temporarily unavailable" })).toBeVisible();
  await expect(page.locator('[data-auth-node="original"]')).toBeVisible();
  api.respond("GET /auth/session", { user: staff });
  await page.getByRole("button", { name: "Thử lại", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Auth temporarily unavailable" })).toHaveCount(0);
  await expect(page.locator('[data-auth-node="original"]')).toBeVisible();
  api.check();
});

test("Overlapping explicit auth checks share a single pending request", async ({ page }) => {
  const api = await mockAuth(page);
  await page.goto(`${base}/admin/products`);
  await expect(page.locator("#admin-content table")).toBeVisible();
  const release = api.delay("GET /auth/session", { user: staff });
  try {
    await page.evaluate(key => {
      for (let i = 0; i < 3; i++) window.dispatchEvent(new StorageEvent("storage", { key, newValue: JSON.stringify({ type: "refresh" }) }));
    }, authEventKey);
    await expect.poll(() => api.count("GET /auth/session")).toBe(2);
    await expect(page.locator("#admin-content table")).toBeVisible();
  } finally { release(); }
  await expect(page.getByRole("button", { name: "Làm mới dữ liệu", exact: true })).toBeEnabled();
  expect(api.count("GET /auth/session")).toBe(2);
  api.check();
});

test("A stale protected 401 does not clear a newer auth scope in the browser", async ({ page }) => {
  const api = await mockAuth(page);
  await page.goto(`${base}/admin/products`);
  await expect(page.locator("#admin-content table")).toBeVisible();
  const release = api.delay("GET /admin/state", { message: "Old token expired" }, 401);
  try {
    await page.getByRole("button", { name: "Làm mới dữ liệu", exact: true }).click();
    await expect.poll(() => api.count("GET /admin/state")).toBe(2);
    api.respond("GET /admin/state", { products: [], categories: [], orders: [], customers: [], approvals: [], receipts: [], warehouse: {}, paymentDueDates: {}, today: "2026-10-07" });
    api.asUser({ ...staff, id: "qa-new-admin", name: "QA New Admin" });
    await page.evaluate(key => window.dispatchEvent(new StorageEvent("storage", { key, newValue: JSON.stringify({ type: "refresh" }) })), authEventKey);
    await expect(page.getByRole("button", { name: "Đăng xuất", exact: true })).toHaveAttribute("title", "QA New Admin");
    await expect(page.locator("#admin-content table")).toBeVisible();
    const response = page.waitForResponse(response => response.url().endsWith("/admin/state") && response.status() === 401);
    release(); await (await response).finished();
    await expect(page.getByRole("button", { name: "Làm mới dữ liệu", exact: true })).toBeEnabled();
    await expect(page.getByRole("button", { name: "Đăng xuất", exact: true })).toHaveAttribute("title", "QA New Admin");
    await expect(page.locator("#admin-content table")).toBeVisible();
    expect(api.count("GET /auth/session")).toBe(2);
  } finally { release(); }
  api.check();
});

test("A delayed preference save cannot restore private favorites after logout", async ({ page }) => {
  const api = await mockAuth(page, customer);
  await page.goto(`${base}/products/${catalog[0].slug}`);
  await expect(page.getByRole("button", { name: "Yêu thích", exact: true })).toBeVisible();
  await expect.poll(() => api.count("GET /account")).toBe(1);
  const release = api.delay("PATCH /account/preferences", { favorites: [catalog[0].id] });
  try {
    await page.getByRole("button", { name: "Yêu thích", exact: true }).click();
    await expect.poll(() => api.count("PATCH /account/preferences")).toBe(1);
    api.asUser(null);
    await page.evaluate(key => window.dispatchEvent(new StorageEvent("storage", { key, newValue: JSON.stringify({ type: "logout" }) })), authEventKey);
    await expect(page.locator('aside[aria-label="Mua sản phẩm"]').getByRole("link", { name: "Đăng nhập B2B", exact: true })).toBeVisible();
    const response = page.waitForResponse(response => response.url().endsWith("/account/preferences"));
    release(); await (await response).finished();
    await expect(page.getByRole("button", { name: "Yêu thích", exact: true })).toBeVisible();
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("baotin-commerce-api-v1")!).favorites)).toEqual([]);
    expect(api.count("GET /auth/session")).toBe(1);
  } finally { release(); }
  api.check();
});

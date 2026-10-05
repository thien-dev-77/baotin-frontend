import { expect, test } from "@playwright/test";
import { catalog, categoryCatalog } from "../lib/catalog";

const base = process.env.QA_BASE_URL || "http://localhost:3041";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname)) throw new Error("SSR QA requires a local frontend server.");
const retail = { products: catalog, categories: categoryCatalog };
const activeUser = { id: "qa-b2b", name: "QA Customer", email: "qa@example.test", role: "b2b", branches: ["Quy Nhơn"], customer: { id: "qa-customer", name: "QA Customer", email: "qa@example.test", phone: "0901234567", company: "QA", role: "b2b", status: "active", creditLimit: 0, debt: 0 } };

test("Home, category and search render product cards without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    for (const path of ["/", "/category/khoa", "/search?q=LED"]) {
      const response = await page.goto(`${base}${path}`);
      expect(response?.status()).toBe(200);
      expect(await page.locator(".bt-product-card").count()).toBeGreaterThan(0);
      await expect(page.locator(".bt-product-card").first()).toBeVisible();
    }
  } finally { await context.close(); }
});

test("Server-rendered products remain visible while session verification is pending", async ({ page }) => {
  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  let catalogs = 0;
  await page.route("**/api/backend/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/auth/session")) { await pending; await route.fulfill({ json: { user: null } }); }
    else if (path.endsWith("/catalog")) { catalogs += 1; await route.fulfill({ json: retail }); }
    else await route.fulfill({ json: [] });
  });
  try {
    await page.goto(base, { waitUntil: "domcontentloaded" });
    await expect(page.locator(".bt-product-card").first()).toBeVisible();
    expect(catalogs).toBe(0);
  } finally { release(); }
});

for (const [name, body, contentType] of [["null", "null", "application/json"], ["HTML", "<html>Upstream unavailable</html>", "text/html"]]) {
  test(`A ${name} session response shows a retry error instead of crashing`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("**/api/backend/**", async (route) => {
      if (route.request().url().endsWith("/auth/session")) await route.fulfill({ body, contentType });
      else await route.fulfill({ json: [] });
    });
    await page.goto(base);
    await expect(page.getByRole("alert").filter({ hasText: "Phản hồi API không hợp lệ" })).toBeVisible();
    await expect(page.locator(".bt-product-card").first()).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test("Personalized catalog updates without waiting for orders/account, and clears on logout", async ({ page }) => {
  let guest = false;
  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/api/backend/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/auth/session")) await route.fulfill({ json: { user: guest ? null : activeUser } });
    else if (path.endsWith("/catalog")) await route.fulfill({ json: guest ? retail : { ...retail, products: catalog.map((product) => ({ ...product, customerPrice: Math.round(product.price * 0.9) })) } });
    else if (path.endsWith("/orders")) { await pending; await route.fulfill({ status: 500, json: { message: "Orders unavailable" } }); }
    else await route.fulfill({ status: 500, json: { message: "Account unavailable" } });
  });
  try {
    await page.goto(base, { waitUntil: "domcontentloaded" });
    await expect(page.locator(".bt-product-card").first()).toContainText("Giá B2B");
    await expect(page.getByRole("alert").filter({ hasText: "Account unavailable" })).toBeVisible();
    guest = true;
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect(page.locator(".bt-product-card").first()).not.toContainText("Giá B2B");
    await expect(page.locator(".bt-product-card").first()).toContainText("Đăng nhập B2B");
  } finally { release(); }
});

test("A delayed B2B catalog cannot overwrite a newer guest session", async ({ page }) => {
  let guest = false;
  let catalogRequests = 0;
  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  const staleName = "Stale B2B product";
  await page.route("**/api/backend/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/auth/session")) await route.fulfill({ json: { user: guest ? null : activeUser } });
    else if (path.endsWith("/catalog")) {
      catalogRequests += 1;
      if (!guest) {
        await pending;
        await route.fulfill({ json: { ...retail, products: catalog.map((product) => ({ ...product, name: staleName, customerPrice: 12345 })) } });
      } else await route.fulfill({ json: retail });
    } else await route.fulfill({ json: path.endsWith("/account") ? { favorites: [] } : [] });
  });
  try {
    await page.goto(base, { waitUntil: "domcontentloaded" });
    await expect.poll(() => catalogRequests).toBe(1);
    guest = true;
    const guestResponse = page.waitForResponse((response) => response.url().endsWith("/catalog"));
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await (await guestResponse).finished();
    const staleResponse = page.waitForResponse((response) => response.url().endsWith("/catalog"));
    release();
    await (await staleResponse).finished();
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await expect(page.locator(".bt-product-card").first()).toContainText("Đăng nhập B2B");
    await expect(page.locator(".bt-product-card").filter({ hasText: staleName })).toHaveCount(0);
  } finally { release(); }
});

test("Desktop and mobile hydration preserve the layout and render images", async ({ browser }) => {
  const errors: string[] = [];
  for (const [width, height] of [[1440, 1000], [390, 844]]) {
    const context = await browser.newContext({ viewport: { width, height }, isMobile: width < 1000, hasTouch: width < 1000 });
    try {
      const page = await context.newPage();
      page.on("pageerror", (error) => errors.push(error.message));
      await page.route("**/api/backend/**", (route) => route.fulfill({ json: route.request().url().endsWith("/auth/session") ? { user: null } : [] }));
      await page.goto(base);
      await expect(page.locator(".bt-product-card").first()).toBeVisible();
      await page.evaluate(async () => {
        await document.fonts.ready;
        for (const image of Array.from(document.images)) { image.loading = "eager"; try { await image.decode(); } catch {} }
      });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      expect(await page.evaluate(() => Array.from(document.images).filter((image) => !image.naturalWidth).map((image) => image.src))).toEqual([]);
      await page.screenshot({ path: `/private/tmp/baotin-ssr-${width}.png`, fullPage: true });
    } finally { await context.close(); }
  }
  expect(errors).toEqual([]);
});

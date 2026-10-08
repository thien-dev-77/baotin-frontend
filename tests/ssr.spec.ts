import { expect, test } from "@playwright/test";
import { catalog, categoryCatalog } from "../lib/catalog";
import { authEventKey } from "../lib/store/auth-slice";

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
    await page.evaluate(key => window.dispatchEvent(new StorageEvent("storage", { key, newValue: JSON.stringify({ type: "logout" }) })), authEventKey);
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
    await page.evaluate(key => window.dispatchEvent(new StorageEvent("storage", { key, newValue: JSON.stringify({ type: "logout" }) })), authEventKey);
    await (await guestResponse).finished();
    const staleResponse = page.waitForResponse((response) => response.url().endsWith("/catalog"));
    release();
    await (await staleResponse).finished();
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await expect(page.locator(".bt-product-card").first()).toContainText("Đăng nhập B2B");
    await expect(page.locator(".bt-product-card").filter({ hasText: staleName })).toHaveCount(0);
  } finally { release(); }
});

test("Homepage frequently bought loads on demand and clears on logout", async ({ page }) => {
  let guest = false, requests = 0;
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  const product = { ...catalog[0], customerPrice: 12345 };
  const personalized = { ...retail, products: catalog.map(item => ({ ...item, customerPrice: 12345 })) };
  const showcase = page.locator("section").filter({ has: page.getByRole("heading", { name: "SẢN PHẨM NỔI BẬT / THƯỜNG MUA", exact: true }) });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/api/backend/**", async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/auth/session")) await route.fulfill({ json: { user: guest ? null : activeUser } });
    else if (path.endsWith("/catalog")) await route.fulfill({ json: guest ? retail : personalized });
    else if (path.endsWith("/account/frequently-bought")) {
      requests++;
      await pending;
      await route.fulfill({ json: { products: [product] } });
    } else await route.fulfill({ json: path.endsWith("/account") ? { favorites: [] } : [] });
  });
  try {
    await page.goto(base);
    await expect(page.locator(".bt-product-card").first()).toContainText("Giá B2B");
    expect(requests).toBe(0);
    await page.getByRole("button", { name: "Thường mua", exact: true }).click();
    await expect(page.getByText("Đang tải...", { exact: true })).toBeVisible();
    await expect.poll(() => requests).toBe(1);
    release();
    await expect(showcase.locator(".bt-product-card")).toHaveCount(1);
    await expect(showcase.getByText(product.name, { exact: true })).toBeVisible();
    guest = true;
    await page.evaluate(key => window.dispatchEvent(new StorageEvent("storage", { key, newValue: JSON.stringify({ type: "logout" }) })), authEventKey);
    await expect(page.getByText("Đăng nhập B2B để xem sản phẩm thường mua", { exact: true })).toBeVisible();
    await expect(showcase.locator(".bt-product-card")).toHaveCount(0);
    await expect(showcase.getByRole("button", { name: "Sản phẩm tiếp theo", exact: true })).toHaveCount(0);
    expect(requests).toBe(1);
    expect(errors).toEqual([]);
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

test("Real proxy returns guest JSON and image bytes with web request headers", async ({ request }) => {
  const headers = { "X-BaoTin-Client": "web", Origin: base };
  const session = await request.get(`${base}/api/backend/auth/session`, { headers });
  expect(session.status()).toBe(200);
  expect(await session.json()).toEqual({ user: null });
  expect(session.headers()["cache-control"]).toContain("no-store");
  const orders = await request.get(`${base}/api/backend/orders`, { headers });
  expect(orders.status()).toBe(200);
  expect(Array.isArray(await orders.json())).toBe(true);
  const image = await request.get(`${base}/images/locks/912-21-048.jpg`, { headers });
  expect(image.status()).toBe(200);
  expect(image.headers()["content-type"]).toContain("image/jpeg");
  expect((await image.body()).byteLength).toBeGreaterThan(1000);
});

test("Next images lazy-load offscreen products and defer unvisited hero slides", async ({ page }) => {
  const requested = new Set<string>();
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname === "/_next/image") requested.add(url.searchParams.get("url") || "");
  });
  await page.goto(base);
  await expect(page.locator(".bt-home-hero-image")).toHaveCount(1);
  const offscreen = page.locator("[data-category-products]").last().locator(".bt-product-card img").first();
  await expect(offscreen).toHaveAttribute("loading", "lazy");
  await expect(offscreen).toHaveAttribute("data-nimg", "fill");
  const source = await offscreen.getAttribute("data-image-src");
  expect(requested.has(source!)).toBe(false);
  await offscreen.scrollIntoViewIfNeeded();
  await expect.poll(() => offscreen.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  expect(requested.has(source!)).toBe(true);
  await page.locator(".bt-home-hero-banner").getByRole("button", { name: "Chọn slide 2", exact: true }).click();
  await expect(page.locator(".bt-home-hero-image")).toHaveCount(2);
});

test("Lock product detail renders an optimized, nonblank main image without API alerts", async ({ browser }) => {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: width > 1000 ? 1000 : 844 } });
    try {
      const page = await context.newPage();
      await page.goto(`${base}/products/hafele-912-21-048`);
      const image = page.locator('section[aria-label="Hình ảnh sản phẩm"] img[fetchpriority="high"]');
      await expect(image).toHaveAttribute("src", /^\/_next\/image\?/);
      await expect(image).not.toHaveAttribute("loading", "lazy");
      await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBe(true);
      expect(await image.evaluate((element: HTMLImageElement) => {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 32;
        const context = canvas.getContext("2d")!;
        context.drawImage(element, 0, 0, 32, 32);
        const pixels = context.getImageData(0, 0, 32, 32).data;
        const colors = new Set<string>();
        for (let i = 0; i < pixels.length; i += 4) colors.add(`${pixels[i] >> 4},${pixels[i + 1] >> 4},${pixels[i + 2] >> 4}`);
        return colors.size;
      })).toBeGreaterThan(10);
      await expect(page.getByRole("alert").filter({ hasText: /API|Backend|backend/ })).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      await page.screenshot({ path: `/private/tmp/baotin-lock-detail-${width}-after.png`, fullPage: true });
    } finally { await context.close(); }
  }
});

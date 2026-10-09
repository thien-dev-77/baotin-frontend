import { expect, test } from "@playwright/test";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { writeFile } from "node:fs/promises";
import { catalog, categoryCatalog } from "../lib/catalog";
import { heroSlides } from "../lib/home-data";
import { previewCatalogPage } from "../lib/catalog-query";

const frontend = "http://127.0.0.1:3041";
const backend = "http://127.0.0.1:4011";
const imageBackend = process.env.QA_BACKEND_URL || "http://127.0.0.1:4000";
if (!["localhost", "127.0.0.1"].includes(new URL(imageBackend).hostname)) throw new Error("Performance QA only targets local servers.");

test("Production SSR cache, invalidation, live homepage and optimized fonts", async ({ request, browser }) => {
  test.setTimeout(120000);
  let version = 0, productVersion = 0, hidden = false, categoryHidden = false;
  let malformedCatalog = false, newProductHidden = false;
  const counts = { catalog: 0, content: 0 };
  const ssrCookies: (string | undefined)[] = [];
  const product = catalog.find(item => item.code === "912.21.048")!;
  const newProduct = { ...product, id: "QA-ADMIN-NEW-SKU", code: "QA-ADMIN-NEW-SKU", slug: "qa-admin-new-sku", name: "QA newly created product", brand: "QA Mộc & Kim+" };
  const currentName = () => `QA live product version ${productVersion}`;
  const api = createServer(async (incoming, outgoing) => {
    try {
      const url = new URL(incoming.url!, backend);
      if (url.pathname.startsWith("/media/")) {
        const image = await fetch(`${imageBackend}${url.pathname}`);
        outgoing.writeHead(image.status, { "Content-Type": image.headers.get("content-type") || "application/octet-stream", "Cache-Control": "public, max-age=86400" });
        outgoing.end(Buffer.from(await image.arrayBuffer()));
        return;
      }
      const json = (data: unknown, status = 200) => {
        outgoing.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "private, no-store" });
        outgoing.end(JSON.stringify(data));
      };
      if (incoming.method !== "GET") {
        const chunks = [];
        for await (const chunk of incoming) chunks.push(chunk);
        const command = JSON.parse(Buffer.concat(chunks).toString() || "{}");
        if (command.reject) { json({ message: "QA conflict" }, 409); return; }
        version++;
        if (!url.pathname.startsWith("/api/admin/content")) productVersion = version;
        if (typeof command.hidden === "boolean") hidden = command.hidden;
        if (typeof command.categoryHidden === "boolean") categoryHidden = command.categoryHidden;
        if (typeof command.newProductHidden === "boolean") newProductHidden = command.newProductHidden;
        if (command.malformedCatalog) malformedCatalog = true;
        json({ updated: true }, 201);
        return;
      }
      const products = [newProduct, ...catalog].filter(item => (!hidden || item.id !== product.id) && (!newProductHidden || item.id !== newProduct.id)).map(item => item.id === product.id ? { ...item, name: currentName(), price: 112233 + version, ...(incoming.headers.cookie ? { customerPrice: 54321 } : {}) } : item);
      const categories = categoryCatalog.filter(item => !categoryHidden || item.slug !== "khoa");
      if (url.pathname === "/api/catalog/bootstrap") {
        counts.catalog++;
        if (!incoming.headers["x-baotin-client"]) ssrCookies.push(incoming.headers.cookie);
        await new Promise(resolve => setTimeout(resolve, 200));
        if (malformedCatalog) { malformedCatalog = false; json(null); return; }
        json({ products: products.slice(1, 56), categories, brands: Array.from(new Set(products.map(product => product.brand))) });
      } else if (url.pathname === "/api/catalog/search") {
        counts.catalog++;
        if (!incoming.headers["x-baotin-client"]) ssrCookies.push(incoming.headers.cookie);
        json(previewCatalogPage(products, categories, url.searchParams));
      } else if (url.pathname === "/api/catalog/selection") {
        json({ products: products.filter(product => url.searchParams.getAll("ids").includes(product.id) || url.searchParams.get("code") === product.code) });
      } else if (url.pathname === "/api/content") {
        counts.content++;
        await new Promise(resolve => setTimeout(resolve, 200));
        json({ items: heroSlides.map((slide, index) => ({ ...slide, id: `qa-banner-${index}`, slug: `qa-banner-${index}`, title: `QA banner version ${version}`, kind: "banner" })) });
      } else if (url.pathname.startsWith("/api/catalog/")) {
        const row = products.find(item => item.slug === decodeURIComponent(url.pathname.split("/").at(-1)!));
        json(row || { message: "Not found" }, row ? 200 : 404);
      } else if (url.pathname === "/api/auth/session") json({ user: null });
      else if (url.pathname === "/api/account/frequently-bought") json({ products: [] });
      else json([]);
    } catch { outgoing.writeHead(500); outgoing.end(); }
  });
  api.listen(4011, "127.0.0.1");
  await once(api, "listening");
  const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", "3041", "-H", "127.0.0.1"], {
    env: { ...process.env, BACKEND_URL: backend, NEXT_DIST_DIR: ".next-build", NODE_ENV: "production" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let logs = "";
  child.stdout.on("data", data => { logs += data; });
  child.stderr.on("data", data => { logs += data; });
  const mutation = (path: string, value = {}) => request.post(`${frontend}/api/backend/${path}`, { data: value });
  const timings: { label: string; ms: number }[] = [];
  const html = async (label: string, cookie?: string) => {
    const start = performance.now();
    const response = await request.get(frontend, { headers: cookie ? { Cookie: cookie } : {} });
    timings.push({ label, ms: performance.now() - start });
    expect(response.status()).toBe(200);
    return response.text();
  };
  try {
    for (let attempt = 0; attempt < 100; attempt++) {
      if (child.exitCode !== null) throw new Error(`QA frontend failed: ${logs}`);
      if (await request.get(`${frontend}/api/backend/health`).then(response => response.ok()).catch(() => false)) break;
      if (attempt === 99) throw new Error(`QA frontend startup timed out: ${logs}`);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    await mutation("admin/commands");
    await mutation("admin/content/qa");
    const first = await html("cache-miss");
    expect(first).toContain(currentName());
    const initialCounts = { ...counts };
    expect(await html("cache-hit")).toContain(currentName());
    expect(await html("b2b-cookie-public-SSR", "baotin_session=qa-b2b")).not.toContain('"customerPrice":54321');
    expect(counts).toEqual(initialCounts);
    expect(ssrCookies.every(cookie => cookie === undefined)).toBe(true);

    expect((await mutation("admin/commands", { hidden: true })).ok()).toBe(true);
    const hiddenHtml = await html("after-hide-invalidation");
    expect(hiddenHtml).not.toContain(currentName());
    expect(counts.catalog).toBe(initialCounts.catalog + 1);
    expect((await request.get(`${frontend}/products/${product.slug}`)).status()).toBe(404);
    expect((await mutation("admin/commands", { reject: true })).status()).toBe(409);
    await html("after-rejected-write");
    expect(counts.catalog).toBe(initialCounts.catalog + 1);

    await mutation("admin/categories/khoa", { categoryHidden: true });
    const noCategory = await html("after-category-hide");
    expect(noCategory).not.toContain("data-category-products");
    await mutation("admin/commands", { hidden: false, categoryHidden: false });
    expect(await html("after-product-update")).toContain(currentName());
    const beforeContent = counts.content;
    await mutation("admin/content/qa");
    expect(await html("after-CMS-update")).toContain(`QA banner version ${version}`);
    expect(counts.content).toBe(beforeContent + 1);

    await mutation("admin/commands", { malformedCatalog: true });
    const beforeMalformed = counts.catalog;
    expect(await html("malformed-upstream-not-cached")).toContain("Không thể tải danh sách sản phẩm");
    expect(await html("recovery-without-TTL-wait")).toContain(currentName());
    expect(counts.catalog).toBe(beforeMalformed + 2);

    const cartContext = await browser.newContext();
    try {
      await cartContext.addInitScript(id => localStorage.setItem("baotin-commerce-api-v1", JSON.stringify({ cart: [{ productId: id, quantity: 2 }], favorites: [], orders: [], coupon: "" })), newProduct.id);
      const cartPage = await cartContext.newPage();
      const errors: string[] = [];
      cartPage.on("pageerror", error => errors.push(error.message));
      await cartPage.goto(`${frontend}/cart`);
      await expect(cartPage.getByText(newProduct.name, { exact: true })).toBeVisible();
      await mutation("admin/commands", { malformedCatalog: true });
      await cartPage.reload();
      await expect(cartPage.getByText(newProduct.name, { exact: true })).toBeVisible();
      expect(errors).toEqual([]);
    } finally { await cartContext.close(); }

    await mutation("admin/products/qa");
    const beforeBrand = counts.catalog;
    const brandResponse = await request.get(`${frontend}/brand/qa-moc-kim`);
    expect(brandResponse.status()).toBe(200);
    expect(await brandResponse.text()).toContain(newProduct.name);
    // Bootstrap metadata and the brand page are separate, cached bounded reads.
    expect(counts.catalog).toBe(beforeBrand + 2);
    await mutation("admin/products/qa", { newProductHidden: true });
    expect((await request.get(`${frontend}/brand/qa-moc-kim`)).status()).toBe(404);
    await mutation("admin/products/qa", { newProductHidden: false });
    const brandContext = await browser.newContext({ javaScriptEnabled: false });
    try {
      const brandPage = await brandContext.newPage();
      await brandPage.goto(`${frontend}/brand/qa-moc-kim`);
      await expect(brandPage.getByRole("heading", { level: 1, name: newProduct.brand, exact: true })).toBeVisible();
      await expect(brandPage.locator(".bt-product-card")).toHaveCount(1);
      await expect(brandPage.getByRole("link", { name: newProduct.name, exact: true }).last()).toBeVisible();
      expect((await request.get(`${frontend}/brand/qa-nonexistent-brand`)).status()).toBe(404);
    } finally { await brandContext.close(); }

    const screens = [];
    for (const width of [1440, 390, 320]) {
      const context = await browser.newContext({ viewport: { width, height: width > 1000 ? 1000 : 844 }, deviceScaleFactor: width < 1000 ? 3 : 1, isMobile: width < 1000, hasTouch: width < 1000 });
      try {
        const page = await context.newPage();
        const errors: string[] = [];
        page.on("pageerror", error => errors.push(error.message));
        await page.goto(frontend);
        await page.evaluate(() => document.fonts.ready);
        await expect(page.locator(".bt-home-hero-image")).toHaveCount(1);
        await expect.poll(() => page.locator(".bt-home-hero-image").evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
        await expect(page.locator("[data-category-products] .bt-product-card").filter({ hasText: currentName() })).toHaveCount(1);
        const fonts = await page.evaluate(() => performance.getEntriesByType("resource").filter(entry => entry.name.endsWith(".woff2")).map(entry => ({ url: entry.name, bytes: (entry as PerformanceResourceTiming).encodedBodySize })));
        expect(fonts.length).toBeLessThanOrEqual(3);
        expect(fonts.reduce((sum, entry) => sum + entry.bytes, 0)).toBeLessThan(150000);
        expect(await page.evaluate(() => getComputedStyle(document.body).fontFamily)).toContain("Inter Variable");
        await page.locator(".bt-home-hero-banner").getByRole("button", { name: "Chọn slide 2", exact: true }).click();
        await expect(page.locator(".bt-home-hero-image")).toHaveCount(2);
        expect(errors).toEqual([]);
        await page.screenshot({ path: `/private/tmp/baotin-optimized-${width}.png` });
        screens.push({ width, fontCount: fonts.length, fontBytes: fonts.reduce((sum, entry) => sum + entry.bytes, 0) });
      } finally { await context.close(); }
    }
    await writeFile("/private/tmp/baotin-optimized-performance.json", JSON.stringify({ timings, counts, screens, delayPerApiMs: 200, environment: "local production build with a controlled QA API; not production speed" }, null, 2));
    console.log(JSON.stringify({ timings, counts, screens }));
    expect(logs).not.toContain("cache invalidation failed");
  } finally {
    if (child.exitCode === null) { child.kill("SIGTERM"); await once(child, "exit"); }
    api.closeAllConnections();
    await new Promise<void>(resolve => api.close(() => resolve()));
  }
});

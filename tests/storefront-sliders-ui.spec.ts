import { expect, test } from "@playwright/test";
import { createServer, type Server } from "node:http";
import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { mkdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { catalog, categoryCatalog } from "../lib/catalog";
import { heroSlides } from "../lib/home-data";

const frontend = "http://127.0.0.1:3053";
const images = ["/images/catalog/hinge-detail.png", "/images/catalog/handle-brass-hd.jpg", "/images/catalog/hardware.png"];
const product = { ...catalog[0], id: "qa-gallery", slug: "qa-gallery", name: "Sản phẩm kiểm tra gallery", image: images[0], gallery: images, featured: false };
const fallbackProduct = { ...product, id: "qa-single-photo", slug: "qa-single-photo", gallery: [] };
let server: Server;
let child: ChildProcess;
let logs = "";
test.setTimeout(120000);
test.use({ actionTimeout: 15000 });

test.beforeAll(async () => {
  const media = new Map(await Promise.all([...images, ...heroSlides.map(slide => slide.image)].map(async path => [path, await readFile(resolve("../backend/media", path.slice(1)))] as const)));
  server = createServer(async (incoming, outgoing) => {
    const url = new URL(incoming.url!, frontend);
    if (url.pathname.startsWith("/media/")) {
      const path = url.pathname.slice("/media".length), bytes = media.get(path);
      outgoing.writeHead(bytes ? 200 : 404, { "Content-Type": path.endsWith(".png") ? "image/png" : "image/jpeg" }); outgoing.end(bytes); return;
    }
    if (incoming.method !== "GET") { outgoing.writeHead(405); outgoing.end(); return; }
    let body: unknown = {};
    if (url.pathname === "/api/health") body = { ready: true };
    else if (url.pathname === "/api/auth/session") body = { user: null };
    else if (url.pathname === "/api/catalog/bootstrap" || url.pathname === "/api/catalog/selection") body = { products: [product, fallbackProduct], categories: categoryCatalog };
    else if (url.pathname.startsWith("/api/catalog/product/")) body = url.pathname.endsWith(fallbackProduct.slug) ? fallbackProduct : product;
    else if (url.pathname === "/api/content") body = { items: heroSlides.map((slide, index) => ({ ...slide, id: `qa-banner-${index}`, slug: `qa-banner-${index}`, title: slide.alt, kind: "banner", position: index })) };
    else if (url.pathname.startsWith("/api/reviews/")) body = { items: [], summary: { rating: 0, count: 0 } };
    else if (url.pathname === "/api/notifications/count") body = { unreadCount: 0 };
    else if (url.pathname === "/api/orders") body = [];
    outgoing.writeHead(200, { "Content-Type": "application/json" }); outgoing.end(JSON.stringify(body));
  });
  server.listen(0, "127.0.0.1"); await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("QA backend failed to start.");
  child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "-p", "3053", "-H", "127.0.0.1"], {
    env: { ...process.env, BACKEND_URL: `http://127.0.0.1:${address.port}`, NEXT_PUBLIC_API_MODE: "true", NEXT_DIST_DIR: ".next-storefront-sliders-qa" }, stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout?.on("data", data => { logs += data; }); child.stderr?.on("data", data => { logs += data; });
  for (let attempt = 0; attempt < 150; attempt++) {
    if (child.exitCode !== null) throw new Error(logs);
    if (await fetch(`${frontend}/api/backend/health`).then(response => response.ok).catch(() => false)) return;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`QA frontend startup failed: ${logs}`);
});

test.afterAll(async () => {
  if (child?.exitCode === null) { child.kill("SIGTERM"); await once(child, "exit"); }
  if (server?.listening) { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
});

for (const width of [1440, 390, 320]) test(`Readable menu, visible banner and usable gallery at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(frontend);
  const hero = page.locator(".bt-home-hero-banner");
  await expect(hero.locator(".splide")).toHaveClass(/is-initialized/);
  await expect.poll(() => hero.evaluate(element => {
    const banner = element.getBoundingClientRect(), dots = element.querySelector(".splide__pagination")!.getBoundingClientRect();
    return Math.abs((dots.left + dots.width / 2) - (banner.left + banner.width / 2));
  })).toBeLessThan(2);
  const firstImage = hero.locator('img[data-active="true"]');
  await expect(firstImage).toHaveCSS("opacity", "1");
  await expect.poll(() => firstImage.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0 && image.clientHeight > 100)).toBe(true);
  await expect(hero.getByRole("tab", { name: "Chọn slide 2", exact: true })).toBeVisible();
  await hero.getByRole("tab", { name: "Chọn slide 2", exact: true }).click();
  await expect(hero.locator('img[data-active="true"]')).toHaveAttribute("data-image-src", heroSlides[1].image);
  await expect.poll(() => hero.locator('img[data-active="true"]').evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0 && getComputedStyle(image.closest(".splide__slide")!).opacity === "1")).toBe(true);
  await mkdir("/private/tmp/baotin-storefront-sliders", { recursive: true });
  await hero.screenshot({ path: `/private/tmp/baotin-storefront-sliders/banner-${width}.png` });
  const trigger = page.getByRole("button", { name: width >= 1024 ? "Danh mục sản phẩm" : "Mở menu", exact: true });
  await trigger.click();
  const menu = width >= 1024 ? page.getByRole("menu", { name: "Danh mục sản phẩm", exact: true }) : page.getByRole("dialog", { name: "Danh mục & tài khoản", exact: true });
  const panel = width >= 1024 ? menu.locator("..") : menu;
  await expect(menu).toBeVisible(); await expect(panel).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(panel).toHaveCSS("opacity", "1");
  await expect(menu.locator(".bt-category-item").first()).toHaveCSS("color", "rgb(23, 23, 23)");
  await expect(trigger).toHaveCSS("color", "rgb(23, 23, 23)");
  await panel.screenshot({ path: `/private/tmp/baotin-storefront-sliders/menu-${width}.png` });
  await page.keyboard.press("Escape");
  await page.goto(`${frontend}/products/${product.slug}`);
  const gallery = page.getByRole("region", { name: "Hình ảnh sản phẩm", exact: true });
  await expect(gallery.locator(".bt-product-gallery-main")).toHaveClass(/is-initialized/);
  const activeImage = gallery.locator(".bt-product-gallery-main .splide__slide.is-active img");
  await expect.poll(() => activeImage.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0 && image.clientWidth > 100 && image.clientHeight > 100)).toBe(true);
  await gallery.getByRole("button", { name: "Xem ảnh 2", exact: true }).click();
  await expect(gallery.getByRole("button", { name: "Xem ảnh 2", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(activeImage).toHaveAttribute("alt", `${product.name} - Ảnh 2`);
  await expect.poll(() => activeImage.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  await gallery.getByRole("button", { name: "Phóng to ảnh", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible(); await expect.poll(() => dialog.locator("img").evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  await page.keyboard.press("Escape");
  await gallery.getByRole("button", { name: "Ảnh tiếp", exact: true }).click();
  await expect(activeImage).toHaveAttribute("alt", `${product.name} - Ảnh 3`);
  await expect.poll(() => activeImage.evaluate(image => getComputedStyle(image.closest(".splide__slide")!).opacity)).toBe("1");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await gallery.screenshot({ path: `/private/tmp/baotin-storefront-sliders/gallery-${width}.png` });
  expect(errors).toEqual([]);
});

test("The first banner and product image render without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 1000 } });
  try {
    const page = await context.newPage(); await page.goto(frontend);
    const hero = page.locator(".bt-home-hero-banner img");
    await expect(hero).toBeVisible(); await expect.poll(() => hero.evaluate((image: HTMLImageElement) => image.naturalWidth > 0 && image.clientHeight > 100)).toBe(true);
    await page.goto(`${frontend}/products/${product.slug}`);
    const image = page.locator(".bt-product-gallery-main img").first();
    await expect(image).toBeVisible(); await expect.poll(() => image.evaluate((image: HTMLImageElement) => image.naturalWidth > 0 && image.clientWidth > 100)).toBe(true);
  } finally { await context.close(); }
});

test("A product with only a cover image has a usable gallery", async ({ page }) => {
  await page.goto(`${frontend}/products/${fallbackProduct.slug}`);
  const image = page.locator(".bt-product-gallery-main img");
  await expect(image).toBeVisible(); await expect.poll(() => image.evaluate((image: HTMLImageElement) => image.naturalWidth > 0 && image.clientWidth > 100)).toBe(true);
  await expect(page.getByRole("button", { name: "Xem ảnh 2", exact: true })).toHaveCount(0);
});

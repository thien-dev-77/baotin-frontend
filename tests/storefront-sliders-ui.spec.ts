import { expect, test } from "@playwright/test";
import { createServer, type Server } from "node:http";
import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { mkdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { catalog, categoryCatalog } from "../lib/catalog";
import { heroSlides } from "../lib/home-data";
import { storeContact } from "../lib/store-contact";
import { previewCatalogPage } from "../lib/catalog-query";

const frontend = "http://127.0.0.1:3053";
const images = ["/images/catalog/led-strip.png", "/images/catalog/handle-brass-hd.jpg", "/images/catalog/hardware.png"];
const product = { ...catalog[0], id: "qa-gallery", slug: "qa-gallery", name: "Sản phẩm kiểm tra gallery", image: images[0], gallery: images, featured: false };
const fallbackProduct = { ...product, id: "qa-single-photo", slug: "qa-single-photo", gallery: [] };
const showcaseProducts = [product, fallbackProduct, ...Array.from({ length: 8 }, (_, index) => ({ ...product, id: `qa-showcase-${index}`, slug: `qa-showcase-${index}`, code: `QA-${index}` }))];
const kitchen = categoryCatalog[0];
const upperKitchen = { ...kitchen, slug: "qa-upper-kitchen", name: "Phụ kiện tủ bếp trên", parentSlug: kitchen.slug, subcategories: [] };
const basket = { ...upperKitchen, slug: "qa-basket", name: "Giá bát cố định", parentSlug: upperKitchen.slug };
const basketSize = { ...basket, slug: "qa-basket-600", name: "Khoang tủ 600mm", parentSlug: basket.slug };
const categories = [...categoryCatalog, { ...upperKitchen, slug: "qa-kitchen-corner", name: "Phụ kiện góc" }, upperKitchen, basket, basketSize];
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
    else if (url.pathname === "/api/catalog/bootstrap" || url.pathname === "/api/catalog/selection") body = { products: showcaseProducts, categories };
    else if (url.pathname === "/api/catalog/search") body = previewCatalogPage(showcaseProducts, categories, url.searchParams);
    else if (url.pathname.startsWith("/api/categories/")) body = categories.find(category => category.slug === decodeURIComponent(url.pathname.split("/").at(-1)!));
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
  await expect(trigger).toHaveCSS("color", width >= 1024 ? "rgb(255, 255, 255)" : "rgb(23, 23, 23)");
  await panel.screenshot({ path: `/private/tmp/baotin-storefront-sliders/menu-${width}.png` });
  await page.keyboard.press("Escape");
  await page.goto(`${frontend}/products/${product.slug}`);
  const gallery = page.getByRole("region", { name: "Hình ảnh sản phẩm", exact: true });
  await expect(gallery.locator(".bt-product-gallery-main")).toHaveClass(/is-initialized/);
  const activeImage = gallery.locator(".bt-product-gallery-main .splide__slide.is-active img");
  const expectFittedImage = async () => {
    await expect.poll(() => activeImage.evaluate((image: HTMLImageElement) => {
      if (!image.complete || !image.naturalWidth) return Infinity;
      const frame = image.parentElement!.getBoundingClientRect();
      return Math.abs(frame.height - frame.width * image.naturalHeight / image.naturalWidth);
    })).toBeLessThan(2);
  };
  await expect.poll(() => activeImage.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0 && image.clientWidth > 100 && image.clientHeight > 100)).toBe(true);
  await expectFittedImage();
  expect(await gallery.locator(".bt-product-gallery-thumbs").evaluate(element => {
    const track = element.querySelector(".splide__track")!.getBoundingClientRect();
    const thumbnail = element.querySelector(".splide__slide")!.getBoundingClientRect();
    return Math.abs(track.left - thumbnail.left);
  })).toBeLessThan(2);
  await gallery.getByRole("button", { name: "Xem ảnh 2", exact: true }).click();
  await expect(gallery.getByRole("button", { name: "Xem ảnh 2", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(activeImage).toHaveAttribute("alt", `${product.name} - Ảnh 2`);
  await expect.poll(() => activeImage.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  await expectFittedImage();
  await gallery.getByRole("button", { name: "Phóng to ảnh", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible(); await expect.poll(() => dialog.locator("img").evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  await page.keyboard.press("Escape");
  await gallery.getByRole("button", { name: "Ảnh tiếp", exact: true }).click();
  await expect(activeImage).toHaveAttribute("alt", `${product.name} - Ảnh 3`);
  await expect.poll(() => activeImage.evaluate(image => getComputedStyle(image.closest(".splide__slide")!).opacity)).toBe("1");
  await expectFittedImage();
  await gallery.locator(".bt-product-gallery-main .splide__arrow--next").click();
  await expect(activeImage).toHaveAttribute("alt", `${product.name} - Ảnh 1`);
  await expectFittedImage();
  await expect(activeImage.locator("..").locator("..")).toHaveCSS("opacity", "1");
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

for (const width of [1440, 390, 320]) test(`Phone and quote actions remain readable at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  await page.goto(`${frontend}/products/${product.slug}`);
  const quote = page.getByRole("link", { name: "Nhận báo giá", exact: true });
  await expect(quote).toBeVisible(); await expect(quote).toHaveAttribute("href", storeContact.zaloHref);
  await page.mouse.move(0, 0);
  await expect(quote).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(quote).toHaveCSS("color", "rgb(23, 23, 23)");
  await expect(quote.locator(".bt-header-service-description")).toHaveCSS("display", "none");
  expect(await quote.evaluate(element => {
    const range = document.createRange(); range.selectNodeContents(element.querySelector(".bt-header-service-title")!);
    const text = range.getBoundingClientRect(), button = element.getBoundingClientRect();
    return text.left >= button.left && text.right <= button.right;
  })).toBe(true);
  await quote.screenshot({ path: `/private/tmp/baotin-storefront-sliders/quote-${width}.png` });
  await page.context().route(storeContact.zaloHref, route => route.fulfill({ contentType: "text/html", body: "<title>Zalo link QA</title>" }));
  for (const name of ["Nhận tư vấn", "Nhận báo giá"]) {
    const link = page.locator("header").getByRole("link", { name, exact: true });
    await expect(link).toHaveAttribute("href", storeContact.zaloHref);
    const popupPromise = page.waitForEvent("popup");
    await link.click();
    const chat = await popupPromise;
    await expect(chat).toHaveURL(storeContact.zaloHref);
    await expect(chat).toHaveTitle("Zalo link QA");
    await chat.close();
  }
  const panel = page.getByRole("complementary", { name: "Mua sản phẩm", exact: true });
  const phone = panel.getByRole("link", { name: "Gọi cho tôi", exact: true });
  await expect(phone).toBeVisible(); await expect(phone).toHaveAttribute("href", storeContact.phoneHref);
  await expect(phone).toHaveCSS("background-color", "rgb(22, 138, 90)");
  await expect(phone).toHaveCSS("color", "rgb(255, 255, 255)");
  await expect(phone.locator("svg")).toHaveCSS("color", "rgb(255, 255, 255)");
  await panel.screenshot({ path: `/private/tmp/baotin-storefront-sliders/contact-${width}.png` });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

test("The product slider's left arrow points left and returns to the preceding item", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 }); await page.goto(frontend);
  const slider = page.locator("[data-product-showcase] .product-carousel");
  const previous = slider.getByRole("button", { name: "Sản phẩm trước", exact: true });
  const next = slider.getByRole("button", { name: "Sản phẩm tiếp", exact: true });
  await expect(previous).toBeDisabled(); await expect(next).toBeEnabled();
  await expect(previous.locator("path")).toHaveAttribute("d", "m15 18-6-6 6-6");
  await expect(previous.locator("svg")).toHaveCSS("transform", "none");
  const list = slider.locator(".splide__list");
  const initial = await list.evaluate(element => element.getBoundingClientRect().left);
  await next.click(); await expect(previous).toBeEnabled();
  await expect.poll(() => list.evaluate(element => element.getBoundingClientRect().left)).toBeLessThan(initial - 20);
  await previous.click(); await expect(previous).toBeDisabled();
  await expect.poll(() => list.evaluate((element, start) => Math.abs(element.getBoundingClientRect().left - start), initial)).toBeLessThan(2);
  await slider.screenshot({ path: "/private/tmp/baotin-storefront-sliders/product-arrows.png" });
});

for (const [width, height] of [[1440, 900], [1024, 800], [1024, 600]]) test(`Header category hover keeps all submenu levels visible at ${width}x${height}`, async ({ page }) => {
  await page.setViewportSize({ width, height });
  await page.goto(`${frontend}/products/${product.slug}`);
  await expect(page.locator("header")).toHaveAttribute("aria-busy", "false");
  await page.getByRole("button", { name: "Danh mục sản phẩm", exact: true }).click();
  const menu = page.getByRole("menu", { name: "Danh mục sản phẩm", exact: true });
  const root = menu.getByRole("menuitem", { name: kitchen.name, exact: true });
  await expect(root.locator("span")).toHaveCSS("font-size", "14px");
  await root.hover();
  const first = page.getByRole("menu", { name: `Danh mục con ${kitchen.name}`, exact: true });
  await expect(first).toBeVisible();
  await page.evaluate(() => window.scrollBy({ top: 100, behavior: "instant" }));
  await expect(first).toBeVisible();
  await first.getByRole("menuitem", { name: upperKitchen.name, exact: true }).hover();
  const second = page.getByRole("menu", { name: `Danh mục con ${upperKitchen.name}`, exact: true });
  await expect(second).toBeVisible();
  await second.getByRole("menuitem", { name: basket.name, exact: true }).hover();
  const third = page.getByRole("menu", { name: `Danh mục con ${basket.name}`, exact: true });
  await expect(third).toBeVisible(); await expect(first).toBeVisible(); await expect(second).toBeVisible(); await expect(menu).toBeVisible();
  let previousRight = (await page.locator(".bt-category-panel").boundingBox())!.x + (await page.locator(".bt-category-panel").boundingBox())!.width;
  for (const panel of [first, second, third]) {
    const bounds = (await panel.boundingBox())!;
    expect(bounds.x).toBeGreaterThanOrEqual(previousRight);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width - 11);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(height - 11);
    previousRight = bounds.x + bounds.width;
  }
  const leaf = third.getByRole("menuitem", { name: basketSize.name, exact: true });
  await expect(leaf.locator("span")).toHaveCSS("font-size", "13px");
  await expect(leaf).toHaveAttribute("href", `/category/${basketSize.slug}`);
  await expect.poll(() => third.evaluate(element => element.getAnimations().every(animation => animation.playState === "finished"))).toBe(true);
  await mkdir("/private/tmp/baotin-header-category-hover", { recursive: true });
  await page.screenshot({ path: `/private/tmp/baotin-header-category-hover/menu-${width}x${height}.png` });
  await leaf.click();
  await expect(page).toHaveURL(`${frontend}/category/${basketSize.slug}`);
  await expect(page.locator("main h1")).toHaveText(basketSize.name);
  await expect(menu).toBeHidden(); await expect(page.locator("[data-category-flyout]")).toHaveCount(0);
});

test("Header category keyboard moves within submenus and restores parent focus", async ({ page }) => {
  await page.goto(`${frontend}/products/${product.slug}`);
  await expect(page.locator("header")).toHaveAttribute("aria-busy", "false");
  const trigger = page.getByRole("button", { name: "Danh mục sản phẩm", exact: true });
  await trigger.press("ArrowDown");
  const menu = page.getByRole("menu", { name: "Danh mục sản phẩm", exact: true });
  const root = menu.getByRole("menuitem", { name: kitchen.name, exact: true });
  await expect(root).toBeFocused(); await root.press("ArrowRight");
  const first = page.getByRole("menu", { name: `Danh mục con ${kitchen.name}`, exact: true });
  await expect(first.locator("a").first()).toBeFocused(); await page.keyboard.press("End");
  const upper = first.getByRole("menuitem", { name: upperKitchen.name, exact: true });
  await expect(upper).toBeFocused(); await upper.press("ArrowRight");
  const child = page.getByRole("menu", { name: `Danh mục con ${upperKitchen.name}`, exact: true }).getByRole("menuitem", { name: basket.name, exact: true });
  await expect(child).toBeFocused(); await child.press("Escape");
  await expect(upper).toBeFocused(); await upper.press("ArrowLeft"); await expect(root).toBeFocused();
  await expect(page.locator("[data-category-flyout]")).toHaveCount(0);
  await root.press("End"); await expect(menu.getByRole("menuitem", { name: "Tin công nghệ", exact: true })).toBeFocused();
  await page.keyboard.press("Escape"); await expect(menu).toBeHidden(); await expect(trigger).toBeFocused();
});

test("Header category hover retains legacy subcategory filter links", async ({ page }) => {
  await page.goto(`${frontend}/products/${product.slug}`);
  await expect(page.locator("header")).toHaveAttribute("aria-busy", "false");
  await page.getByRole("button", { name: "Danh mục sản phẩm", exact: true }).click();
  const legacy = categoryCatalog[1];
  await page.getByRole("menu", { name: "Danh mục sản phẩm", exact: true }).getByRole("menuitem", { name: legacy.name, exact: true }).hover();
  const link = page.getByRole("menu", { name: `Danh mục con ${legacy.name}`, exact: true }).getByRole("menuitem", { name: legacy.subcategories[0], exact: true });
  await expect(link).toHaveAttribute("href", `/category/${legacy.slug}?subcategory=${encodeURIComponent(legacy.subcategories[0])}`);
  await link.click(); await expect(page).toHaveURL(new RegExp(`/category/${legacy.slug}\\?subcategory=`));
  await expect(page.locator("main h1")).toHaveText(legacy.name);
});

test("Header category dismisses submenus when closed, scrolled or clicked outside", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 600 }); await page.goto(`${frontend}/products/${product.slug}`);
  await expect(page.locator("header")).toHaveAttribute("aria-busy", "false");
  const trigger = page.getByRole("button", { name: "Danh mục sản phẩm", exact: true });
  const menu = page.getByRole("menu", { name: "Danh mục sản phẩm", exact: true });
  for (const action of ["close", "scroll", "outside"] as const) {
    if (await trigger.getAttribute("aria-expanded") !== "true") await trigger.click();
    await menu.getByRole("menuitem", { name: kitchen.name, exact: true }).hover();
    await expect(page.locator(".bt-category-flyout-panel--menu")).toHaveCount(1);
    if (action === "close") await page.getByRole("button", { name: "Đóng danh mục", exact: true }).click();
    if (action === "scroll") await menu.evaluate(element => element.dispatchEvent(new Event("scroll")));
    if (action === "outside") {
      const viewport = page.viewportSize()!;
      await page.mouse.click(viewport.width - 12, viewport.height - 12);
    }
    await expect(page.locator(".bt-category-flyout-panel--menu")).toHaveCount(0);
    await page.mouse.move(0, 0);
  }
  await expect(menu).toBeHidden();
});

test("Header category on a touch desktop opens submenus with a tap", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1024, height: 800 }, hasTouch: true, isMobile: true });
  try {
    const page = await context.newPage(); await page.goto(`${frontend}/products/${product.slug}`);
    await expect(page.locator("header")).toHaveAttribute("aria-busy", "false");
    await page.getByRole("button", { name: "Danh mục sản phẩm", exact: true }).tap();
    const menu = page.getByRole("menu", { name: "Danh mục sản phẩm", exact: true });
    await menu.getByRole("menuitem", { name: kitchen.name, exact: true }).hover();
    await expect(page.locator(".bt-category-flyout-panel--menu")).toHaveCount(0);
    await menu.getByRole("menuitem", { name: `Mở danh mục con ${kitchen.name}`, exact: true }).tap();
    await expect(page.getByRole("menu", { name: `Danh mục con ${kitchen.name}`, exact: true })).toBeVisible();
  } finally { await context.close(); }
});

test("Mobile category navigation still expands with a tap", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 800 }, hasTouch: true, isMobile: true });
  try {
    const page = await context.newPage(); await page.goto(`${frontend}/products/${product.slug}`);
    await expect(page.locator("header")).toHaveAttribute("aria-busy", "false");
    await page.getByRole("button", { name: "Mở menu", exact: true }).tap();
    const drawer = page.getByRole("dialog", { name: "Danh mục & tài khoản", exact: true });
    await drawer.getByRole("button", { name: `Mở danh mục con ${kitchen.name}`, exact: true }).tap();
    await expect(drawer.getByRole("link", { name: upperKitchen.name, exact: true })).toBeVisible();
  } finally { await context.close(); }
});

test("The homepage category sidebar keeps its hover navigation", async ({ page }) => {
  await page.goto(frontend);
  await expect(page.locator("header")).toHaveAttribute("aria-busy", "false");
  await page.locator(".bt-home-category-sidebar").getByRole("link", { name: kitchen.name, exact: true }).hover();
  const panel = page.getByRole("navigation", { name: `Danh mục con ${kitchen.name}`, exact: true });
  await expect(panel.getByRole("link", { name: upperKitchen.name, exact: true })).toBeVisible();
  await expect(page.locator(".bt-category-flyout-panel--menu")).toHaveCount(0);
});

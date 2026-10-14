import { expect, test } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import { createServer, type Server } from "node:http";
import { once } from "node:events";
import { mkdir } from "node:fs/promises";
import type { Category } from "../lib/types";
import { heroSlides } from "../lib/home-data";
import { previewCatalogPage } from "../lib/catalog-query";

const frontend = "http://127.0.0.1:3048";
const imageBackend = process.env.QA_BACKEND_URL || "http://127.0.0.1:4000";
if (!["localhost", "127.0.0.1"].includes(new URL(imageBackend).hostname)) throw new Error("Sidebar QA only targets local servers.");
const groups = [
  { slug: "chau-voi-rua-bat", name: "Hệ thống chậu - Vòi rửa", children: ["Vòi rửa", "Chậu rửa"] },
  { slug: "phu-kien-noi-that", name: "Phụ kiện mộc nội thất", children: ["Phụ kiện khác", "Piston hơi & thủy lực", "Hệ thống tay nâng", "Ray trượt", "Bản lề"] },
  { slug: "phu-kien-tu-quan-ao", name: "Phụ kiện tủ quần áo", children: ["Giá để giày", "Ngăn kéo để đồ", "Giá treo quần âu cao cấp"] },
  { slug: "phu-kien-tu-bep", name: "Phụ kiện tủ bếp", children: ["Hệ thống phụ kiện góc", "Tủ đồ khô - Tủ kho", "Phụ kiện tủ bếp trên"] },
  { slug: "thiet-bi-bep-gia-dung", name: "Thiết bị bếp & Đồ gia dụng", children: ["Xoong & Nồi", "Nồi cơm điện", "Máy rửa bát", "Máy hút mùi", "Bếp từ"] },
];
const roots: Category[] = groups.map(group => ({ slug: group.slug, name: group.name, image: "", description: "", visible: true, subcategories: group.children }));
const tree: Category[] = roots.flatMap((root, index) => [root, ...groups[index].children.map((name, childIndex) => ({ ...root, slug: `${root.slug}-${childIndex}`, name, parentSlug: root.slug, subcategories: [] }))]);
tree.push({ ...roots[3], slug: "gia-bat-co-dinh", name: "Giá bát cố định", parentSlug: "phu-kien-tu-bep-2", subcategories: [] });
let categories: Category[];
let server: Server;
let child: ChildProcess;
let logs: string;
let unexpected: string[];
let reads: string[];

test.beforeEach(async ({ request }) => {
  categories = structuredClone(tree); logs = ""; unexpected = []; reads = [];
  server = createServer(async (incoming, outgoing) => {
    try {
      const url = new URL(incoming.url!, frontend);
      if (incoming.method !== "GET") { unexpected.push(`${incoming.method} ${url.pathname}`); outgoing.writeHead(405); outgoing.end(); return; }
      reads.push(url.pathname);
      if (url.pathname.startsWith("/media/")) {
        const response = await fetch(`${imageBackend}${url.pathname}`);
        outgoing.writeHead(response.status, { "Content-Type": response.headers.get("content-type") || "application/octet-stream" });
        outgoing.end(Buffer.from(await response.arrayBuffer())); return;
      }
      const json = (data: unknown, status = 200) => { outgoing.writeHead(status, { "Content-Type": "application/json" }); outgoing.end(JSON.stringify(data)); };
      if (url.pathname === "/api/health") json({ ready: true });
      else if (url.pathname === "/api/catalog/bootstrap") json({ products: [], categories });
      else if (url.pathname === "/api/catalog/search") json(previewCatalogPage([], categories, url.searchParams));
      else if (url.pathname === "/api/catalog/selection") json({ products: [] });
      else if (url.pathname === "/api/content") json({ items: heroSlides.map((slide, index) => ({ ...slide, id: `qa-hero-${index}`, slug: `qa-hero-${index}`, title: slide.alt, kind: "banner", position: index })) });
      else if (url.pathname.startsWith("/api/categories/")) {
        const category = categories.find(item => item.slug === decodeURIComponent(url.pathname.split("/").at(-1)!));
        json(category || { message: "QA category not found" }, category ? 200 : 404);
      }
      else if (url.pathname === "/api/auth/session") json({ user: null });
      else if (url.pathname === "/api/orders") json([]);
      else { unexpected.push(`GET ${url.pathname}`); json({ message: "Unexpected QA request" }, 404); }
    } catch { outgoing.writeHead(500); outgoing.end(); }
  });
  server.listen(0, "127.0.0.1"); await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("QA backend did not start.");
  child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", "3048", "-H", "127.0.0.1"], {
    env: { ...process.env, BACKEND_URL: `http://127.0.0.1:${address.port}`, NEXT_DIST_DIR: ".next", NODE_ENV: "production" }, stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout?.on("data", data => { logs += data; }); child.stderr?.on("data", data => { logs += data; });
  for (let attempt = 0; attempt < 100; attempt++) {
    if (child.exitCode !== null) throw new Error(logs);
    if (await request.get(`${frontend}/api/backend/health`).then(response => response.ok()).catch(() => false)) return;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Sidebar QA frontend startup timed out: ${logs}`);
});

test.afterEach(async () => {
  if (child?.exitCode === null) { child.kill("SIGTERM"); await once(child, "exit"); }
  if (server?.listening) { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
  expect(unexpected).toEqual([]);
});

for (const width of [1440, 1024, 768, 390, 320]) test(`Brand logo, favicon and yellow/black palette render at ${width}px`, async ({ page, request }) => {
  await page.setViewportSize({ width, height: 1000 });
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto(frontend);
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    return Object.fromEntries(["primary", "brand", "brand-hover", "background", "section", "text-secondary", "text-muted", "border"].map(name => [name, style.getPropertyValue(`--color-${name}`).trim()]));
  })).toEqual({ primary: "#171717", brand: "#ffc400", "brand-hover": "#e5b000", background: "#ffffff", section: "#fafaf7", "text-secondary": "#525252", "text-muted": "#737373", border: "#e5e5e5" });
  await expect(page.locator("body")).toHaveCSS("color", "rgb(82, 82, 82)");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(255, 255, 255)");
  expect(await page.locator("body").evaluate(element => getComputedStyle(element).fontFamily)).toContain("Inter");
  const logo = page.locator("header").getByRole("img", { name: "Bảo Tín", exact: true });
  await expect(logo).toBeVisible();
  await expect(logo).toHaveAttribute("src", /logo-baotin\.png/);
  await expect.poll(() => logo.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBe(true);
  const rect = (await logo.boundingBox())!;
  expect(Math.abs(rect.width / rect.height - 919 / 271)).toBeLessThan(0.02);
  expect(rect.width).toBe(width < 640 ? 152 : 192);
  await expect(page.locator('head link[rel="icon"]')).toHaveAttribute("href", "/favicon-baotin.png");
  for (const asset of ["/logo-baotin.png", "/favicon-baotin.png"]) {
    const response = await request.get(`${frontend}${asset}`);
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toContain("image/png");
  }
  const search = page.locator('header form[role="search"]:visible');
  const cta = search.getByRole("button", { name: "Tìm kiếm", exact: true });
  await expect(cta).toHaveCSS("background-color", "rgb(255, 196, 0)");
  await expect(cta).toHaveCSS("color", "rgb(23, 23, 23)");
  await cta.hover();
  await expect(cta).toHaveCSS("background-color", "rgb(229, 176, 0)");
  await page.mouse.move(0, 0);
  await expect(search).toHaveCSS("border-top-color", "rgb(229, 229, 229)");
  await expect(page.locator(".bt-header-promises svg").first()).toHaveCSS("color", "rgb(255, 196, 0)");
  const footer = page.locator("footer");
  await expect(footer).toHaveCSS("background-color", "rgb(23, 23, 23)");
  await expect(footer).toHaveCSS("color", "rgb(255, 255, 255)");
  await footer.scrollIntoViewIfNeeded();
  await expect(footer.locator(".bt-logo")).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect.poll(() => footer.getByRole("img", { name: "Bảo Tín", exact: true }).evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBe(true);
  expect(await footer.locator(".bt-logo").evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.evaluate(() => scrollTo(0, 0));
  await mkdir("/private/tmp/baotin-branding", { recursive: true });
  await page.screenshot({ path: `/private/tmp/baotin-branding/home-${width}.png`, animations: "disabled" });
  await footer.screenshot({ path: `/private/tmp/baotin-branding/footer-${width}.png`, animations: "disabled", style: "header { visibility: hidden; }" });
  expect(errors).toEqual([]);
});

test("Brand promotion accent does not use error red", async ({ page }) => {
  await page.goto(`${frontend}/promotions`);
  const label = page.getByText("ƯU ĐÃI THÁNG 10", { exact: true });
  await expect(label).toHaveCSS("color", "rgb(23, 23, 23)");
  await expect(label).toHaveCSS("border-bottom-color", "rgb(255, 196, 0)");
});

for (const width of [1440, 320]) test(`Admin sign-in keeps the supplied logo and brand actions at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(`${frontend}/admin`);
  await expect(page.getByRole("heading", { name: "Bảo Tín · Quản trị", exact: true })).toBeVisible();
  const logo = page.getByRole("img", { name: "Bảo Tín", exact: true });
  await expect(logo).toHaveAttribute("src", /logo-baotin\.png/);
  await expect.poll(() => logo.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBe(true);
  const action = page.getByRole("button", { name: "Đăng nhập", exact: true });
  await expect(action).toHaveCSS("background-color", "rgb(255, 196, 0)");
  await expect(action).toHaveCSS("color", "rgb(23, 23, 23)");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await mkdir("/private/tmp/baotin-branding", { recursive: true });
  await page.screenshot({ path: `/private/tmp/baotin-branding/admin-login-${width}.png`, animations: "disabled" });
});

for (const width of [1440, 1280, 1024]) test(`Sidebar previews fill the hero without changing its height at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto(frontend);
  const sidebar = page.locator(".bt-home-category-sidebar");
  const navigation = sidebar.getByRole("navigation");
  const previews = navigation.locator(".bt-home-category-preview");
  await expect(previews).toHaveCount(5);
  await expect(previews.first()).toHaveText("Vòi rửa · Chậu rửa");
  await expect(previews.nth(1)).toHaveAttribute("title", groups[1].children.join(", "));
  await expect(navigation.getByRole("link", { name: roots[0].name, exact: true }).locator("span")).toHaveCSS("font-size", "14px");
  const hero = page.locator(".bt-home-hero-banner");
  await expect.poll(() => hero.locator("img[data-active=true]").evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  const panel = (await sidebar.boundingBox())!;
  const banner = (await hero.boundingBox())!;
  expect(panel.height).toBe(408); expect(banner.height).toBe(408);
  expect(panel.y).toBe(banner.y);
  const all = sidebar.getByRole("link", { name: "Xem tất cả danh mục", exact: true });
  await expect(all).toHaveAttribute("href", "/categories");
  const footer = (await all.boundingBox())!;
  expect(panel.y + panel.height - footer.y - footer.height).toBeLessThanOrEqual(10);
  const list = (await navigation.boundingBox())!;
  const last = (await previews.last().boundingBox())!;
  expect(last.y + last.height).toBeLessThanOrEqual(list.y + list.height + 1);
  expect(await navigation.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await mkdir("/private/tmp/baotin-home-sidebar", { recursive: true });
  await page.locator(".bt-home-hero-layout").screenshot({ path: `/private/tmp/baotin-home-sidebar/hero-${width}.png` });
  expect(errors).toEqual([]);
});

test("Sidebar previews are server-rendered and the footer navigates to all categories", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 1000 } });
  try {
    const page = await context.newPage(); await page.goto(frontend);
    const sidebar = page.locator(".bt-home-category-sidebar");
    await expect(sidebar.locator(".bt-home-category-preview")).toHaveCount(5);
    await sidebar.getByRole("link", { name: "Xem tất cả danh mục", exact: true }).click();
    await expect(page).toHaveURL(`${frontend}/categories`);
    await expect(page.getByRole("heading", { name: "Danh mục sản phẩm", exact: true })).toBeVisible();
  } finally { await context.close(); }
});

test("Opening nested branches keeps the footer fixed and dropdown previews disabled", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 }); await page.goto(frontend);
  const sidebar = page.locator(".bt-home-category-sidebar");
  const navigation = sidebar.getByRole("navigation");
  const all = sidebar.getByRole("link", { name: "Xem tất cả danh mục", exact: true });
  const before = await all.boundingBox();
  await navigation.getByRole("link", { name: "Phụ kiện tủ bếp", exact: true }).press("ArrowRight");
  await expect(navigation.locator(".bt-home-category-preview")).toHaveCount(5);
  const flyout = page.getByRole("navigation", { name: "Danh mục con Phụ kiện tủ bếp", exact: true });
  await flyout.getByRole("button", { name: "Mở danh mục con Phụ kiện tủ bếp trên", exact: true }).click();
  const childLink = page.getByRole("navigation", { name: "Danh mục con Phụ kiện tủ bếp trên", exact: true }).getByRole("link", { name: "Giá bát cố định", exact: true });
  await expect(childLink).toHaveAttribute("href", "/category/gia-bat-co-dinh");
  await childLink.focus(); await expect(childLink).toBeFocused();
  expect(await all.boundingBox()).toEqual(before);
  await navigation.getByRole("link", { name: "Phụ kiện tủ bếp", exact: true }).press("ArrowLeft");
  await expect(navigation.locator(".bt-home-category-preview")).toHaveCount(5);
  await page.getByRole("button", { name: "Danh mục sản phẩm", exact: true }).click();
  const menu = page.getByRole("menu");
  await expect(menu.locator(".bt-home-category-preview")).toHaveCount(0);
  await expect(menu.getByRole("menuitem", { name: roots[0].name, exact: true }).locator("span")).toHaveCSS("font-size", "16px");
  await page.keyboard.press("Escape");
  await all.click(); await expect(page).toHaveURL(`${frontend}/categories`);
});

for (const width of [1440, 1024]) test(`Hover opens adjacent subcategory panels without clipping or flicker at ${width}px`, async ({ page }) => {
  const kitchen = categories.find(category => category.slug === "phu-kien-tu-bep-2")!;
  categories.push({ ...kitchen, slug: "gia-bat-co-dinh-600", name: "Khoang tủ 600mm", parentSlug: "gia-bat-co-dinh", subcategories: [] });
  await page.setViewportSize({ width, height: 800 }); await page.goto(frontend);
  await expect(page.locator("header[aria-busy=true]")).toHaveCount(0);
  const catalogReads = reads.filter(path => path.startsWith("/api/catalog/")).length;
  const sidebar = page.locator(".bt-home-category-sidebar");
  const root = sidebar.getByRole("link", { name: "Phụ kiện tủ bếp", exact: true });
  await root.hover();
  const first = page.getByRole("navigation", { name: "Danh mục con Phụ kiện tủ bếp", exact: true });
  await expect(first).toBeVisible();
  await first.getByRole("link", { name: "Phụ kiện tủ bếp trên", exact: true }).hover();
  const second = page.getByRole("navigation", { name: "Danh mục con Phụ kiện tủ bếp trên", exact: true });
  await expect(second).toBeVisible(); await expect(first).toBeVisible();
  await second.getByRole("link", { name: "Giá bát cố định", exact: true }).hover();
  const third = page.getByRole("navigation", { name: "Danh mục con Giá bát cố định", exact: true });
  await expect(third).toBeVisible(); await expect(first).toBeVisible(); await expect(second).toBeVisible();
  await expect.poll(() => page.locator("[data-category-flyout]").evaluateAll(elements => elements.every(element => element.getAnimations().every(animation => animation.playState === "finished")))).toBe(true);
  const panels = [first, second, third];
  let previousRight = ((await sidebar.boundingBox())!).x + ((await sidebar.boundingBox())!).width;
  for (const panel of panels) {
    const rect = (await panel.boundingBox())!;
    expect(rect.x).toBeGreaterThanOrEqual(previousRight);
    expect(rect.x + rect.width).toBeLessThanOrEqual(width - 11);
    expect(rect.y).toBeGreaterThanOrEqual(12); expect(rect.y + rect.height).toBeLessThanOrEqual(789);
    previousRight = rect.x + rect.width;
  }
  await expect(third.getByRole("link", { name: "Khoang tủ 600mm", exact: true })).toHaveAttribute("href", "/category/gia-bat-co-dinh-600");
  expect((await sidebar.boundingBox())!.height).toBe(408);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  expect(reads.filter(path => path.startsWith("/api/catalog/")).length).toBe(catalogReads);
  await mkdir("/private/tmp/baotin-home-sidebar", { recursive: true });
  await page.screenshot({ path: `/private/tmp/baotin-home-sidebar/flyout-${width}.png` });
  await page.mouse.move(width - 2, 2);
  await expect(page.locator("[data-category-flyout]")).toHaveCount(0);
});

test("Flyout keyboard returns focus and closes on outside click or scroll", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 700 }); await page.goto(frontend);
  const sidebar = page.locator(".bt-home-category-sidebar");
  const root = sidebar.getByRole("link", { name: "Phụ kiện tủ bếp", exact: true });
  await root.focus(); await root.press("ArrowRight");
  const first = page.getByRole("navigation", { name: "Danh mục con Phụ kiện tủ bếp", exact: true });
  await expect(first.getByRole("link").first()).toBeFocused();
  await first.getByRole("link").first().press("End");
  const upper = first.getByRole("link", { name: "Phụ kiện tủ bếp trên", exact: true });
  await expect(upper).toBeFocused(); await upper.press("ArrowRight");
  const child = page.getByRole("navigation", { name: "Danh mục con Phụ kiện tủ bếp trên", exact: true }).getByRole("link", { name: "Giá bát cố định", exact: true });
  await expect(child).toBeFocused(); await child.press("Escape");
  await expect(upper).toBeFocused(); await expect(page.locator("[data-category-flyout]")).toHaveCount(1);
  await upper.press("ArrowLeft"); await expect(root).toBeFocused();
  await expect(page.locator("[data-category-flyout]")).toHaveCount(0);
  await root.hover(); await expect(first).toBeVisible();
  await page.getByRole("heading", { name: "Dành cho khách B2B", exact: true }).click();
  await expect(page.locator("[data-category-flyout]")).toHaveCount(0);
  await root.hover(); await expect(first).toBeVisible();
  await sidebar.getByRole("navigation").evaluate(element => element.dispatchEvent(new Event("scroll")));
  await expect(page.locator("[data-category-flyout]")).toHaveCount(0);
});

test("Legacy group hover links filter the parent category rather than inventing child category slugs", async ({ page }) => {
  categories = structuredClone(roots);
  await page.setViewportSize({ width: 1440, height: 800 }); await page.goto(frontend);
  await page.locator(".bt-home-category-sidebar").getByRole("link", { name: roots[0].name, exact: true }).hover();
  const link = page.getByRole("navigation", { name: `Danh mục con ${roots[0].name}`, exact: true }).getByRole("link", { name: "Vòi rửa", exact: true });
  await expect(link).toHaveAttribute("href", `/category/${roots[0].slug}?subcategory=${encodeURIComponent("Vòi rửa")}`);
  await link.click(); await expect(page).toHaveURL(new RegExp(`/category/${roots[0].slug}\\?subcategory=`));
  await expect(page.locator("[data-category-flyout]")).toHaveCount(0);
});

test("Touch-only desktop does not open on hover, but the category arrow opens on tap", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1024, height: 800 }, hasTouch: true, isMobile: true });
  try {
    const page = await context.newPage(); await page.goto(frontend);
    const sidebar = page.locator(".bt-home-category-sidebar");
    await sidebar.getByRole("link", { name: roots[0].name, exact: true }).hover();
    await expect(page.locator("[data-category-flyout]")).toHaveCount(0);
    await sidebar.getByRole("button", { name: `Mở danh mục con ${roots[0].name}`, exact: true }).tap();
    await expect(page.getByRole("navigation", { name: `Danh mục con ${roots[0].name}`, exact: true })).toBeVisible();
  } finally { await context.close(); }
});

test("Legacy category groups get previews without inventing child links", async ({ page }) => {
  categories = structuredClone(roots);
  await page.setViewportSize({ width: 1440, height: 1000 }); await page.goto(frontend);
  const navigation = page.getByRole("navigation", { name: "Danh mục bên cạnh banner", exact: true });
  await expect(navigation.locator(".bt-home-category-preview")).toHaveCount(5);
  await expect(navigation.locator(".bt-home-category-preview").first()).toHaveText("Vòi rửa · Chậu rửa");
  await expect(navigation.getByRole("link", { name: "Vòi rửa", exact: true })).toHaveCount(0);
});

test("A longer catalog scrolls inside the sidebar with the footer remaining visible", async ({ page }) => {
  categories.push(...Array.from({ length: 15 }, (_, index) => ({ ...roots[0], slug: `qa-extra-${index}`, name: `Danh mục bổ sung ${index + 1}` })));
  await page.setViewportSize({ width: 1440, height: 1000 }); await page.goto(frontend);
  const sidebar = page.locator(".bt-home-category-sidebar");
  const navigation = sidebar.getByRole("navigation");
  const all = sidebar.getByRole("link", { name: "Xem tất cả danh mục", exact: true });
  const before = await all.boundingBox();
  expect(await navigation.evaluate(element => element.scrollHeight > element.clientHeight)).toBe(true);
  await navigation.getByRole("link", { name: "Danh mục bổ sung 15", exact: true }).focus();
  await expect(all).toBeVisible(); expect(await all.boundingBox()).toEqual(before);
  expect((await sidebar.boundingBox())!.height).toBe(408);
});

for (const width of [768, 390, 320]) test(`Mobile keeps the sidebar hidden and the existing menu usable at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 }); await page.goto(frontend);
  await expect(page.locator(".bt-home-category-sidebar")).toBeHidden();
  await page.getByRole("button", { name: "Mở menu", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.locator(".bt-home-category-preview")).toHaveCount(0);
  await expect(dialog.getByRole("link", { name: roots[0].name, exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

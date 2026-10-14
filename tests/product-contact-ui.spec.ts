import { expect, test } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import { createServer, type Server } from "node:http";
import { once } from "node:events";
import { mkdir } from "node:fs/promises";
import { catalog, categoryCatalog } from "../lib/catalog";
import { previewCatalogPage } from "../lib/catalog-query";
import { storeContact } from "../lib/store-contact";
import type { Product } from "../lib/types";

const frontend = "http://127.0.0.1:3046";
const backend = "http://127.0.0.1:4016";
const imageBackend = process.env.QA_BACKEND_URL || "http://127.0.0.1:4000";
if (!["127.0.0.1", "localhost"].includes(new URL(imageBackend).hostname)) throw new Error("Contact QA only targets local servers.");
const product = { ...catalog[0], stock: 10 };
const unavailable = { ...product, id: "QA-CONTACT-SOLD-OUT", slug: "qa-contact-sold-out", stock: 0 };
const variantSmall: Product = {
  ...product, id: "QA-DETAIL-VARIANT-600", slug: "qa-detail-variant-600", code: "QA-600",
  name: "Giá bát inox 304", shortDescription: "Giá bát cố định, dễ vệ sinh.",
  specification: "600mm · Inox 304", technicalDetails: "Tải trọng tối đa: 10kg", size: "600mm", material: "Inox 304",
  listPrice: 650000, price: 650000, customerPrice: 455000, oldPrice: undefined, b2cDiscount: 0, b2bDiscount: 30,
  variantGroupId: "QA-DETAIL-VARIANT-600", variantAttributes: [{ name: "Kích thước", value: "600mm" }],
};
const variantLarge: Product = {
  ...variantSmall, id: "QA-DETAIL-VARIANT-800", slug: "qa-detail-variant-800", code: "QA-800",
  specification: "800mm · Inox 304", size: "800mm", listPrice: 850000, price: 850000, customerPrice: 595000,
  variantAttributes: [{ name: "Kích thước", value: "800mm" }],
};
const products: Product[] = [product, unavailable, variantSmall, variantLarge];
let server: Server;
let child: ChildProcess;
let logs = "";
const unexpected: string[] = [];

test.beforeAll(async ({ request }) => {
  server = createServer(async (incoming, outgoing) => {
    try {
      const url = new URL(incoming.url!, backend);
      if (incoming.method !== "GET") {
        unexpected.push(`${incoming.method} ${url.pathname}`);
        outgoing.writeHead(405); outgoing.end(); return;
      }
      if (url.pathname.startsWith("/media/")) {
        const response = await fetch(`${imageBackend}${url.pathname}`);
        outgoing.writeHead(response.status, { "Content-Type": response.headers.get("content-type") || "application/octet-stream" });
        outgoing.end(Buffer.from(await response.arrayBuffer())); return;
      }
      const json = (body: unknown, status = 200) => {
        outgoing.writeHead(status, { "Content-Type": "application/json" });
        outgoing.end(JSON.stringify(body));
      };
      if (url.pathname === "/api/catalog/bootstrap") json({ products, categories: categoryCatalog });
      else if (url.pathname.startsWith("/api/catalog/product/")) {
        const selected = products.find(item => item.slug === decodeURIComponent(url.pathname.split("/").at(-1)!));
        const detail = selected?.variantGroupId ? { ...selected, variants: products.filter(item => item.variantGroupId === selected.variantGroupId) } : selected;
        json(detail || { message: "QA product not found" }, selected ? 200 : 404);
      }
      else if (url.pathname === "/api/catalog/selection") json({ products: products.filter(item => url.searchParams.getAll("ids").includes(item.id)) });
      else if (url.pathname === "/api/catalog/search") json(previewCatalogPage(products, categoryCatalog, url.searchParams));
      else if (url.pathname.startsWith("/api/reviews/")) json({ items: [] });
      else if (url.pathname === "/api/auth/session") json({ user: null });
      else if (url.pathname === "/api/orders") json([]);
      else if (url.pathname === "/api/health") json({ ready: true });
      else { unexpected.push(`GET ${url.pathname}`); json({ message: "Unexpected QA request" }, 404); }
    } catch { outgoing.writeHead(500); outgoing.end(); }
  });
  server.listen(4016, "127.0.0.1");
  await once(server, "listening");
  child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", "3046", "-H", "127.0.0.1"], {
    env: { ...process.env, BACKEND_URL: backend, NEXT_DIST_DIR: ".next", NODE_ENV: "production" }, stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout?.on("data", data => { logs += data; });
  child.stderr?.on("data", data => { logs += data; });
  for (let attempt = 0; attempt < 100; attempt++) {
    if (child.exitCode !== null) throw new Error(logs);
    if (await request.get(`${frontend}/api/backend/health`).then(response => response.ok()).catch(() => false)) return;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Contact QA frontend startup timed out: ${logs}`);
});

test.afterAll(async () => {
  if (child?.exitCode === null) { child.kill("SIGTERM"); await once(child, "exit"); }
  if (server?.listening) {
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
  expect(unexpected).toEqual([]);
});

for (const width of [1440, 1024, 768, 390, 320]) {
  test(`Product contact buttons link to the supplied Zalo and phone at ${width}px`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.setViewportSize({ width, height: 1000 });
    await page.context().route(storeContact.zaloHref, route => route.fulfill({ contentType: "text/html", body: "<title>Zalo link QA</title>" }));
    await page.goto(`${frontend}/products/${product.slug}`);
    const panel = page.getByRole("complementary", { name: "Mua sản phẩm", exact: true });
    const group = panel.getByRole("group", { name: "Liên hệ tư vấn sản phẩm", exact: true });
    const zalo = group.getByRole("link", { name: "Chat Zalo", exact: true });
    const phone = group.getByRole("link", { name: "Gọi cho tôi", exact: true });
    await expect(zalo).toHaveAttribute("href", "https://zalo.me/0979003577");
    await expect(zalo).toHaveAttribute("target", "_blank");
    await expect(zalo).toHaveAttribute("rel", "noopener noreferrer");
    await expect(phone).toHaveAttribute("href", "tel:0979003577");
    await group.scrollIntoViewIfNeeded();
    await expect(zalo).toBeVisible();
    await expect(phone).toBeVisible();
    const addToCart = panel.getByRole("button", { name: "Thêm vào giỏ hàng", exact: true });
    await expect(addToCart).toBeEnabled();
    await expect(addToCart).toHaveCSS("background-color", "rgb(255, 196, 0)");
    await expect(addToCart).toHaveCSS("color", "rgb(23, 23, 23)");
    await expect(panel.locator("strong").first()).toHaveCSS("color", "rgb(23, 23, 23)");
    await page.mouse.move(0, 0);
    for (const contact of [zalo, phone]) {
      await expect(contact).toHaveCSS("background-color", "rgb(255, 255, 255)");
      await expect(contact).toHaveCSS("color", "rgb(23, 23, 23)");
      await expect(contact).toHaveCSS("text-transform", "none");
      await contact.hover();
      await expect(contact).toHaveCSS("background-color", "rgb(250, 250, 247)");
      await expect(contact).toHaveCSS("border-top-color", "rgb(255, 196, 0)");
      await expect(contact).toHaveCSS("color", "rgb(23, 23, 23)");
      await page.mouse.move(0, 0);
    }
    await expect(phone.locator("svg")).toHaveCSS("color", "rgb(23, 23, 23)");
    await expect(phone.locator("svg")).toHaveAttribute("stroke-width", "1.8");
    const icon = zalo.locator("[data-zalo-icon]");
    await expect(icon).toHaveAttribute("src", "/zalo-icon.svg");
    await expect(icon).toHaveCSS("width", "24px");
    await expect.poll(() => icon.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBe(true);
    await expect(zalo).toHaveCSS("font-weight", "500");
    await expect(phone).toHaveCSS("font-weight", "500");
    await zalo.focus();
    await zalo.press("Tab");
    await expect(phone).toBeFocused();
    await expect(phone).toHaveCSS("outline-color", "rgb(23, 23, 23)");
    await expect(phone).toHaveCSS("outline-width", "2px");
    const first = (await zalo.boundingBox())!;
    const second = (await phone.boundingBox())!;
    expect(Math.abs(first.y - second.y)).toBeLessThan(1);
    expect(Math.abs(first.height - second.height)).toBeLessThan(1);
    expect(first.height).toBeGreaterThanOrEqual(48);
    expect(first.x + first.width).toBeLessThan(second.x);
    expect(await group.evaluate(element => Array.from(element.querySelectorAll("a")).every(link => link.scrollWidth <= link.clientWidth))).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    const popup = page.waitForEvent("popup");
    await zalo.click();
    const chat = await popup;
    await expect(chat).toHaveURL(storeContact.zaloHref);
    await chat.close();
    await mkdir("/private/tmp/baotin-product-contact", { recursive: true });
    await panel.screenshot({ path: `/private/tmp/baotin-product-contact/purchase-${width}.png`, animations: "disabled", style: "header { visibility: hidden; }" });
    expect(errors).toEqual([]);
  });
}

test("Sold-out products still offer Zalo and phone contact", async ({ page }) => {
  await page.goto(`${frontend}/products/${unavailable.slug}`);
  const panel = page.getByRole("complementary", { name: "Mua sản phẩm", exact: true });
  await expect(panel.getByRole("button", { name: "Thêm vào giỏ hàng", exact: true })).toBeDisabled();
  await expect(panel.getByRole("link", { name: "Chat Zalo", exact: true })).toBeVisible();
  await expect(panel.getByRole("link", { name: "Gọi cho tôi", exact: true })).toBeVisible();
});

for (const width of [1440, 1024, 768, 390, 320]) {
  test(`Product intro avoids duplicate specifications and highlights variants at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(`${frontend}/products/${variantSmall.slug}`);
    const intro = page.locator(".bt-product-detail-intro");
    const overview = intro.getByRole("region", { name: "Thông tin sản phẩm", exact: true });
    await expect(overview.getByRole("heading", { level: 1 })).toHaveText(variantSmall.name);
    await expect(overview.getByText(variantSmall.shortDescription!, { exact: true })).toBeVisible();
    await expect(overview.locator("dl, table, .rounded-full")).toHaveCount(0);
    await expect(overview.getByText("Mã hàng", { exact: true })).toHaveCount(0);
    const information = page.locator(".bt-product-detail-information");
    await expect(information.getByRole("heading", { name: "Thông số kỹ thuật", exact: true })).toHaveCount(1);
    await expect(information.getByRole("row").filter({ has: page.getByRole("rowheader", { name: "Mã hàng", exact: true }) })).toContainText(variantSmall.code);
    await expect(information.getByText(variantSmall.technicalDetails!, { exact: true })).toHaveCount(1);

    const selector = intro.getByRole("region", { name: "Chọn biến thể", exact: true });
    const small = selector.getByRole("link", { name: "600mm", exact: true });
    const large = selector.getByRole("link", { name: "800mm", exact: true });
    await expect(small).toHaveAttribute("aria-current", "page");
    await expect(small).toHaveCSS("background-color", "rgb(255, 196, 0)");
    await expect(large).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await large.hover();
    await expect(large).toHaveCSS("background-color", "rgb(255, 196, 0)");
    await expect(large).toHaveCSS("color", "rgb(23, 23, 23)");
    await expect(large).toHaveCSS("text-decoration-line", "none");
    await small.focus();
    await small.press("Tab");
    await expect(large).toBeFocused();
    await expect(large).toHaveCSS("outline-color", "rgb(23, 23, 23)");
    await expect(large).toHaveCSS("outline-width", "2px");
    expect(await selector.evaluate(element => Array.from(element.querySelectorAll("a")).every(link => link.scrollWidth <= link.clientWidth))).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await mkdir("/private/tmp/baotin-detail-refinement", { recursive: true });
    await intro.screenshot({ path: `/private/tmp/baotin-detail-refinement/intro-${width}.png`, animations: "disabled", style: "header { visibility: hidden; }" });

    await large.press("Enter");
    await expect(page).toHaveURL(`${frontend}/products/${variantLarge.slug}`);
    await expect(selector.getByText(`Mã: ${variantLarge.code}`, { exact: true })).toBeVisible();
    await expect(large).toHaveAttribute("aria-current", "page");
    await page.mouse.move(0, 0);
    await expect(large).toHaveCSS("background-color", "rgb(255, 196, 0)");
    await expect(small).not.toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("complementary", { name: "Mua sản phẩm", exact: true }).locator("strong").first()).toContainText("850.000");
    await expect(information.getByRole("row").filter({ has: page.getByRole("rowheader", { name: "Kích thước", exact: true }) })).toContainText("800mm");
    expect(errors).toEqual([]);
  });
}

test("A single-SKU product keeps specifications below without an empty variant selector", async ({ page }) => {
  await page.goto(`${frontend}/products/${product.slug}`);
  const intro = page.locator(".bt-product-detail-intro");
  await expect(intro.getByRole("region", { name: "Thông tin sản phẩm", exact: true })).toBeVisible();
  await expect(intro.locator("dl, table")).toHaveCount(0);
  await expect(intro.getByRole("region", { name: "Chọn biến thể", exact: true })).toHaveCount(0);
  await expect(page.locator(".bt-product-detail-information").getByRole("row").filter({ has: page.getByRole("rowheader", { name: "Mã hàng", exact: true }) })).toContainText(product.code);
});

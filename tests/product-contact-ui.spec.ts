import { expect, test } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import { createServer, type Server } from "node:http";
import { once } from "node:events";
import { mkdir } from "node:fs/promises";
import { catalog, categoryCatalog } from "../lib/catalog";
import { previewCatalogPage } from "../lib/catalog-query";
import { storeContact } from "../lib/store-contact";

const frontend = "http://127.0.0.1:3046";
const backend = "http://127.0.0.1:4016";
const imageBackend = process.env.QA_BACKEND_URL || "http://127.0.0.1:4000";
if (!["127.0.0.1", "localhost"].includes(new URL(imageBackend).hostname)) throw new Error("Contact QA only targets local servers.");
const product = { ...catalog[0], stock: 10 };
const unavailable = { ...product, id: "QA-CONTACT-SOLD-OUT", slug: "qa-contact-sold-out", stock: 0 };
const products = [product, unavailable];
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
        json(selected || { message: "QA product not found" }, selected ? 200 : 404);
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
    await expect(addToCart).toHaveCSS("background-color", "rgb(22, 119, 210)");
    await expect(panel.locator("strong").first()).toHaveCSS("color", "rgb(15, 49, 87)");
    await page.mouse.move(0, 0);
    for (const contact of [zalo, phone]) {
      await expect(contact).toHaveCSS("background-color", "rgb(255, 255, 255)");
      await expect(contact).toHaveCSS("color", "rgb(15, 49, 87)");
      await expect(contact).toHaveCSS("text-transform", "none");
      await contact.hover();
      await expect(contact).toHaveCSS("background-color", "rgb(240, 246, 253)");
      await expect(contact).toHaveCSS("border-top-color", "rgb(22, 119, 210)");
      await expect(contact).toHaveCSS("color", "rgb(14, 101, 184)");
      await page.mouse.move(0, 0);
    }
    await expect(phone.locator("svg")).toHaveCSS("color", "rgb(22, 119, 210)");
    await expect(zalo.locator(".bt-product-contact-zalo")).toHaveCSS("color", "rgb(14, 101, 184)");
    await zalo.focus();
    await zalo.press("Tab");
    await expect(phone).toBeFocused();
    await expect(phone).toHaveCSS("outline-color", "rgb(22, 119, 210)");
    await expect(phone).toHaveCSS("outline-width", "2px");
    const first = (await zalo.boundingBox())!;
    const second = (await phone.boundingBox())!;
    expect(Math.abs(first.y - second.y)).toBeLessThan(1);
    expect(Math.abs(first.height - second.height)).toBeLessThan(1);
    expect(first.height).toBeGreaterThanOrEqual(56);
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

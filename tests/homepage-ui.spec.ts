import { expect, test } from "@playwright/test";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdir } from "node:fs/promises";
import { catalog, categoryCatalog } from "../lib/catalog";
import { heroSlides } from "../lib/home-data";

test("Empty CMS does not reserve a blank hero, and API products populate curated/recommended tabs", async ({ browser, request }) => {
  test.setTimeout(120000);
  const frontend = "http://127.0.0.1:3042";
  const backend = "http://127.0.0.1:4012";
  let banners = false;
  const products = catalog.map(product => ({ ...product, featured: false }));
  const api = createServer(async (incoming, outgoing) => {
    const url = new URL(incoming.url!, backend);
    try {
      if (url.pathname.startsWith("/media/")) {
        const image = await fetch(`http://127.0.0.1:4000${url.pathname}`);
        outgoing.writeHead(image.status, { "Content-Type": image.headers.get("content-type") || "application/octet-stream" });
        outgoing.end(Buffer.from(await image.arrayBuffer()));
        return;
      }
      const json = (data: unknown, status = 200) => { outgoing.writeHead(status, { "Content-Type": "application/json" }); outgoing.end(JSON.stringify(data)); };
      if (incoming.method === "POST" && url.pathname === "/api/admin/content/qa") { banners = true; json({ updated: true }, 201); return; }
      if (incoming.method !== "GET") { json({ message: "Unsupported QA write" }, 405); return; }
      if (url.pathname === "/api/catalog/bootstrap") json({ products, categories: categoryCatalog });
      else if (url.pathname === "/api/content") json({ items: banners ? heroSlides.map((slide, index) => ({ ...slide, id: `qa-${index}`, slug: `qa-${index}`, title: slide.alt, kind: "banner", position: index })) : [] });
      else if (url.pathname === "/api/auth/session") json({ user: null });
      else json({ products: [] });
    } catch { outgoing.writeHead(500); outgoing.end(); }
  });
  api.listen(4012, "127.0.0.1");
  await once(api, "listening");
  const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", "3042", "-H", "127.0.0.1"], { env: { ...process.env, BACKEND_URL: backend, NODE_ENV: "production" }, stdio: ["ignore", "pipe", "pipe"] });
  let logs = "";
  child.stdout.on("data", data => { logs += data; });
  child.stderr.on("data", data => { logs += data; });
  try {
    for (let attempt = 0; attempt < 100; attempt++) {
      if (child.exitCode !== null) throw new Error(logs);
      if (await request.get(`${frontend}/api/backend/health`).then(response => response.ok()).catch(() => false)) break;
      if (attempt === 99) throw new Error(logs);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    const noJS = await browser.newContext({ javaScriptEnabled: false });
    try {
      const page = await noJS.newPage();
      await page.goto(frontend);
      await expect(page.locator(".bt-home-hero-layout")).toHaveCount(0);
      await expect(page.locator("[data-product-showcase] .bt-product-card")).toHaveCount(10);
    } finally { await noJS.close(); }
    expect((await request.post(`${frontend}/api/backend/admin/content/qa`, { data: {} })).status()).toBe(201);
    await mkdir("/private/tmp/baotin-homepage-repair", { recursive: true });
    for (const width of [1440, 768, 390, 320]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 } });
      try {
        const page = await context.newPage();
        const errors: string[] = [];
        page.on("pageerror", error => errors.push(error.message));
        await page.goto(frontend);
        const hero = page.locator(".bt-home-hero-banner");
        await expect(hero).toBeVisible();
        await expect.poll(() => hero.locator("img[data-active=true]").evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
        await hero.getByRole("button", { name: "Chọn slide 2", exact: true }).click();
        await expect(hero.locator("img[data-active=true]")).toHaveAttribute("data-image-src", heroSlides[1].image);
        await expect.poll(() => hero.locator("img[data-active=true]").evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
        await page.screenshot({ path: `/private/tmp/baotin-homepage-repair/hero-${width}.png` });
        const showcase = page.locator("[data-product-showcase]");
        await expect(showcase.locator(".bt-product-card")).toHaveCount(10);
        await showcase.getByRole("button", { name: "Gợi ý cho bạn", exact: true }).click();
        await expect(showcase.locator(".bt-product-card")).toHaveCount(10);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
        await page.screenshot({ path: `/private/tmp/baotin-homepage-repair/showcase-${width}.png` });
        expect(errors).toEqual([]);
      } finally { await context.close(); }
    }
  } finally {
    if (child.exitCode === null) { child.kill("SIGTERM"); await once(child, "exit"); }
    api.closeAllConnections();
    await new Promise<void>(resolve => api.close(() => resolve()));
  }
});

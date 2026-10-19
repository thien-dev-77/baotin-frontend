import { expect, test } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { mkdir } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { catalog, categoryCatalog } from "../lib/catalog";
import { previewCatalogPage } from "../lib/catalog-query";

const frontend = "http://127.0.0.1:3068";
const backend = "http://127.0.0.1:4098";
// HAFELE comes first from the API; the header must still offer every brand.
const brands = ["HAFELE", "Fulco", "Mộc & Kim+"];
const products = brands.map((brand, index) => ({ ...catalog[index], brand }));
let api: Server;
let child: ChildProcess;
let logs = "";

test.describe.configure({ mode: "serial" });
test.setTimeout(60000);

test.beforeAll(async ({ request }) => {
  test.setTimeout(120000);
  api = createServer((incoming, outgoing) => {
    const url = new URL(incoming.url!, backend);
    const json = (value: unknown, status = 200) => {
      outgoing.writeHead(status, { "Content-Type": "application/json" });
      outgoing.end(JSON.stringify(value));
    };
    if (incoming.method !== "GET") { json({ message: "Read-only QA API" }, 405); return; }
    if (url.pathname === "/api/catalog/bootstrap") { json({ products, categories: categoryCatalog, brands }); return; }
    if (url.pathname === "/api/catalog/search") { json(previewCatalogPage(products, categoryCatalog, url.searchParams)); return; }
    if (url.pathname === "/api/auth/session") { json({ user: null }); return; }
    if (url.pathname === "/api/content") { json({ items: [] }); return; }
    if (url.pathname === "/api/orders") { json([]); return; }
    if (url.pathname === "/api/health") { json({ status: "ok" }); return; }
    json({ message: "QA resource not found" }, 404);
  });
  await new Promise<void>((resolve, reject) => {
    api.once("error", reject);
    api.listen(4098, "127.0.0.1", resolve);
  });
  child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--webpack", "-H", "127.0.0.1", "-p", "3068"], {
    env: { ...process.env, NEXT_DIST_DIR: ".next-brand-menu-qa", NEXT_PUBLIC_API_MODE: "true", BACKEND_URL: backend, TOKIO_WORKER_THREADS: "1", RAYON_NUM_THREADS: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout?.on("data", data => { logs += data; });
  child.stderr?.on("data", data => { logs += data; });
  for (let attempt = 0; attempt < 100; attempt++) {
    if (child.exitCode !== null) throw new Error(logs);
    if (await request.get(`${frontend}/api/backend/health`, { timeout: 1000 }).then(response => response.ok()).catch(() => false)) return;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(logs);
});

test.afterAll(async () => {
  if (child && child.exitCode === null) { child.kill("SIGTERM"); await once(child, "exit"); }
  if (api?.listening) {
    api.closeAllConnections();
    await new Promise<void>(resolve => api.close(() => resolve()));
  }
});

for (const width of [1440, 1024]) {
  test(`Hover reveals all API brands without clipping at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${frontend}/contact`);
    await expect(page.locator("header")).toHaveAttribute("aria-busy", "false");
    const trigger = page.locator("header").getByRole("button", { name: "Thương hiệu", exact: true });
    await trigger.hover();
    const menu = page.getByRole("menu", { name: "Thương hiệu", exact: true });
    await expect(menu).toBeVisible();
    await expect(menu.getByRole("menuitem")).toHaveText(["Fulco", "HAFELE", "Mộc & Kim+"]);
    await expect(menu.getByRole("menuitem", { name: "Mộc & Kim+", exact: true })).toHaveAttribute("href", "/brand/moc-kim");
    await menu.getByRole("menuitem", { name: "HAFELE", exact: true }).hover();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    const rect = await menu.boundingBox();
    expect(rect!.x).toBeGreaterThanOrEqual(0);
    expect(rect!.x + rect!.width).toBeLessThanOrEqual(width);
    await mkdir("/private/tmp/baotin-brand-menu", { recursive: true });
    await page.screenshot({ path: `/private/tmp/baotin-brand-menu/desktop-${width}.png` });
    await page.mouse.move(width - 10, 700);
    await expect(menu).toHaveCount(0);
    await trigger.hover();
    await menu.getByRole("menuitem", { name: "HAFELE", exact: true }).click();
    await expect(page).toHaveURL(`${frontend}/brand/hafele`);
    await expect(page.getByRole("heading", { name: "HAFELE", exact: true })).toBeVisible();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  });
}

test("Keyboard opens, selects and dismisses the brand menu", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${frontend}/contact`);
  await expect(page.locator("header")).toHaveAttribute("aria-busy", "false");
  const trigger = page.locator("header").getByRole("button", { name: "Thương hiệu", exact: true });
  const menu = page.getByRole("menu", { name: "Thương hiệu", exact: true });
  await trigger.hover();
  await expect(menu).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);
  await trigger.focus();
  await page.keyboard.press("ArrowDown");
  await expect(menu.getByRole("menuitem", { name: "Fulco", exact: true })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(menu.getByRole("menuitem", { name: "HAFELE", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(menu.getByRole("menuitem", { name: "Fulco", exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(menu).toHaveCount(0);
  await expect(page.locator("header").getByRole("link", { name: "Khuyến mãi", exact: true })).toBeFocused();
});

test("Mobile drawer expands brands and closes after choosing Fulco", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${frontend}/contact`);
  await expect(page.locator("header")).toHaveAttribute("aria-busy", "false");
  await page.getByRole("button", { name: "Mở menu", exact: true }).click();
  const drawer = page.getByRole("dialog", { name: "Danh mục & tài khoản", exact: true });
  const trigger = drawer.getByRole("button", { name: "Thương hiệu", exact: true });
  await trigger.click();
  const menu = drawer.getByRole("menu", { name: "Thương hiệu", exact: true });
  await expect(menu.getByRole("menuitem")).toHaveText(["Fulco", "HAFELE", "Mộc & Kim+"]);
  await expect(menu.getByRole("menuitem").last()).toBeInViewport({ ratio: 1 });
  await page.screenshot({ path: "/private/tmp/baotin-brand-menu/mobile-390.png" });
  await menu.getByRole("menuitem", { name: "Fulco", exact: true }).click();
  await expect(page).toHaveURL(`${frontend}/brand/fulco`);
  await expect(drawer).not.toBeVisible();
  await expect(page.getByRole("heading", { name: "Fulco", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

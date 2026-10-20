import { expect, test } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { mkdir } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { catalog, categoryCatalog } from "../lib/catalog";
import { previewCatalogPage } from "../lib/catalog-query";

const frontend = "http://127.0.0.1:3069";
const backend = "http://127.0.0.1:4097";
// Give delayed searches their own SSR cache keys while matching every fixture.
const loadingQuery = `QA-LOAD-${Date.now()}`;
const materials = ["SUS304", "SUS 304", "Inox 304 xước mờ", "Inox SUS304 và nhựa ABS", "Khung thép sơn tĩnh điện + inox 304", "Khung nhôm, ray thép", "Khung sườn nhôm, ray thép không gỉ", "Polyamid", "Thân Zamak", "Đồng mạ crôm và đá granite", "Cửa kính toàn phần, 3 lớp cách nhiệt", "Mặt gốm thủy tinh SCHOTT Ceran", "Nhôm và nhựa", "Ron Silicone", "Nhựa", "Thép", "Gỗ MDF", "Sứ", "Vật liệu chưa công bố", ...Array.from({ length: 20 }, (_, index) => `Inox 304 loại phụ kiện ${index}`)];
const products = materials.map((material, index) => ({ ...catalog[0], id: `QA-MATERIAL-${index}`, code: `QA-MATERIAL-${index}`, slug: `qa-material-${index}`, name: `Phụ kiện QA ${index}`, image: "/product-placeholder.svg", gallery: ["/product-placeholder.svg"], material, brand: index === materials.length - 1 ? "Fulco" : "HAFELE", price: 100000 + index * 1000, featured: false,
  ...(index === 0 ? { color: "Black", colorGroups: ["white"], origin: "Germany", originGroups: ["malaysia"] } : {}),
  ...(index === 1 ? { color: "Trắng", origin: "Made in Malaysia" } : {}),
  ...(index === 2 ? { color: "Black", colorGroups: [], origin: "Germany", originGroups: [] } : {}),
}));
const noColorCategory = { slug: "qa-no-color", name: "QA chưa có màu", image: "/product-placeholder.svg", description: "", subcategories: [] };
const fixtureCategories = [...categoryCatalog, noColorCategory];
const fixtureProducts = [...products, ...[0, 1].map(index => ({ ...catalog[0], id: `QA-NO-COLOR-${index}`, code: `QA-NO-COLOR-${index}`, slug: `qa-no-color-${index}`, name: `QA chưa có màu ${index}`, category: noColorCategory.slug, brand: "QA Scope", material: "", color: "", origin: "", image: "/product-placeholder.svg", gallery: ["/product-placeholder.svg"] }))].map(product => ({ ...product, specification: `${product.specification} ${loadingQuery}` }));
let server: Server;
let child: ChildProcess;
let logs = "";
let searchGate: { field: string; wait: Promise<void>; requested: () => void; status: number } | undefined;

function holdSearch(field: string, status = 200) {
  let release!: () => void, requested = false;
  const wait = new Promise<void>(resolve => { release = resolve; });
  searchGate = { field, wait, requested: () => { requested = true; }, status };
  return { release, requested: () => requested };
}

test.describe.configure({ mode: "serial" });
test.setTimeout(60000);
test.beforeAll(async ({ request }) => {
  test.setTimeout(120000);
  server = createServer(async (incoming, outgoing) => {
    const url = new URL(incoming.url!, backend);
    const json = (value: unknown, status = 200) => { outgoing.writeHead(status, { "Content-Type": "application/json" }); outgoing.end(JSON.stringify(value)); };
    if (incoming.method !== "GET") { json({ message: "Read-only QA API" }, 405); return; }
    if (url.pathname === "/api/catalog/bootstrap") { json({ products: fixtureProducts, categories: fixtureCategories, brands: ["Fulco", "HAFELE", "QA Scope"] }); return; }
    if (url.pathname === "/api/catalog/search") {
      const gate = searchGate;
      if (gate && url.searchParams.has(gate.field)) {
        gate.requested(); await gate.wait;
        if (gate.status !== 200) { json({ message: "QA search unavailable" }, gate.status); return; }
      }
      json(previewCatalogPage(fixtureProducts, fixtureCategories, url.searchParams)); return;
    }
    if (url.pathname === `/api/categories/${noColorCategory.slug}`) { json(noColorCategory); return; }
    if (url.pathname === "/api/auth/session") { json({ user: null }); return; }
    if (url.pathname === "/api/orders") { json([]); return; }
    if (url.pathname === "/api/health") { json({ status: "ok" }); return; }
    json({ message: "QA resource not found" }, 404);
  });
  await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(4097, "127.0.0.1", resolve); });
  child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--webpack", "-H", "127.0.0.1", "-p", "3069"], {
    env: { ...process.env, NEXT_DIST_DIR: ".next-material-filter-qa", NEXT_PUBLIC_API_MODE: "true", BACKEND_URL: backend, TOKIO_WORKER_THREADS: "1", RAYON_NUM_THREADS: "1" }, stdio: ["ignore", "pipe", "pipe"],
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
  if (server?.listening) { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
});

test("Desktop groups long variants, bounds expansion, preserves scope and restores selection", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${frontend}/search?brand=HAFELE&sort=low&page=2`);
  await expect(page.locator("header")).toHaveAttribute("aria-busy", "false");
  const filter = page.locator("aside [data-material-filter]");
  await expect(filter.getByRole("checkbox")).toHaveCount(6);
  await expect(filter.getByRole("checkbox", { name: "SUS304", exact: true })).toHaveCount(0);
  await filter.getByRole("button", { name: /^Xem thêm/ }).click();
  await expect(filter.getByRole("checkbox")).toHaveCount(13);
  const list = filter.getByRole("group", { name: "Chất liệu", exact: true });
  expect(await list.evaluate(element => element.clientHeight)).toBeLessThanOrEqual(256);
  expect(await list.evaluate(element => element.scrollHeight > element.clientHeight)).toBe(true);
  const inox = filter.getByRole("checkbox", { name: "Inox 304", exact: true });
  await inox.focus(); await page.keyboard.press("Space");
  await expect(page).toHaveURL(url => url.searchParams.get("materialGroup") === "inox-304" && url.searchParams.get("brand") === "HAFELE" && url.searchParams.get("sort") === "low" && !url.searchParams.has("page"));
  await expect(inox).toBeChecked();
  await expect(page.locator('section[aria-label="Kết quả sản phẩm"] .bt-product-card')).toHaveCount(12);
  await filter.getByRole("button", { name: "Thu gọn", exact: true }).click();
  await mkdir("/private/tmp/baotin-material-filter", { recursive: true });
  await page.screenshot({ path: "/private/tmp/baotin-material-filter/desktop-1440.png" });
  await page.reload();
  await expect(filter.getByRole("checkbox", { name: "Inox 304", exact: true })).toBeChecked();
  await filter.getByRole("button", { name: "Bỏ chọn", exact: true }).click();
  await expect(page).toHaveURL(url => !url.searchParams.has("materialGroup") && url.searchParams.get("brand") === "HAFELE" && url.searchParams.get("sort") === "low");
});

test("Old exact material URLs remain removable and grouped choices replace them", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const material = materials[4];
  await page.goto(`${frontend}/search?material=${encodeURIComponent(material)}&sort=high`);
  await expect(page.locator("header")).toHaveAttribute("aria-busy", "false");
  const filter = page.locator("aside [data-material-filter]");
  const legacy = filter.getByRole("button", { name: `Bỏ lọc chất liệu ${material}`, exact: true });
  await expect(legacy).toBeVisible();
  await expect(page.locator('section[aria-label="Kết quả sản phẩm"] .bt-product-card')).toHaveCount(1);
  await filter.getByRole("checkbox", { name: "Inox 304", exact: true }).check();
  await expect(page).toHaveURL(url => !url.searchParams.has("material") && url.searchParams.get("materialGroup") === "inox-304" && url.searchParams.get("sort") === "high");
  await expect(legacy).toHaveCount(0);
});

test("Mobile material filtering stays inside the drawer and keeps brand scope", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${frontend}/brand/hafele`);
  await expect(page.locator("header")).toHaveAttribute("aria-busy", "false");
  await page.getByRole("button", { name: /^Bộ lọc/ }).click();
  const drawer = page.getByRole("dialog", { name: "Lọc sản phẩm", exact: true });
  const filter = drawer.locator("[data-material-filter]");
  await filter.getByRole("button", { name: /^Xem thêm/ }).click();
  const list = filter.getByRole("group", { name: "Chất liệu", exact: true });
  expect(await list.evaluate(element => element.clientHeight)).toBeLessThanOrEqual(256);
  await filter.getByRole("checkbox", { name: "Nhựa", exact: true }).check();
  await expect(page).toHaveURL(url => url.pathname === "/brand/hafele" && url.searchParams.get("materialGroup") === "plastic");
  await filter.scrollIntoViewIfNeeded();
  await page.screenshot({ path: "/private/tmp/baotin-material-filter/mobile-390.png" });
  await drawer.getByRole("button", { name: /^Xem \d+ sản phẩm$/ }).click();
  await expect(drawer).not.toBeVisible();
  await expect(page.locator('section[aria-label="Kết quả sản phẩm"] .bt-product-card')).toHaveCount(4);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

for (const width of [1440, 390]) test(`Color and origin groups use explicit selections and replace legacy text at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  await page.goto(`${frontend}/search?brand=HAFELE&color=Black&sort=high&page=2`);
  await expect(page.locator("header").first()).toHaveAttribute("aria-busy", "false");
  if (width < 1024) await page.getByRole("button", { name: /^Bộ lọc/ }).click();
  const panel = width < 1024 ? page.getByRole("dialog", { name: "Lọc sản phẩm", exact: true }) : page.locator("aside");
  const color = panel.locator('[data-attribute-filter="color"]');
  const origin = panel.locator('[data-attribute-filter="origin"]');
  await expect(panel.locator("summary").filter({ hasText: /^Kích thước$/ })).toHaveCount(0);
  await expect(color.getByRole("button", { name: "Bỏ lọc màu sắc Black", exact: true })).toBeVisible();
  await color.getByRole("checkbox", { name: "Trắng", exact: true }).check();
  await expect(page).toHaveURL(url => url.searchParams.get("colorGroup") === "white" && !url.searchParams.has("color") && !url.searchParams.has("page") && url.searchParams.get("brand") === "HAFELE" && url.searchParams.get("sort") === "high");
  await origin.getByRole("checkbox", { name: "Malaysia", exact: true }).check();
  await expect(page).toHaveURL(url => url.searchParams.get("colorGroup") === "white" && url.searchParams.get("originGroup") === "malaysia");
  if (width < 1024) await panel.getByRole("button", { name: /^Xem \d+ sản phẩm$/ }).click();
  await expect(page.locator('section[aria-label="Kết quả sản phẩm"] .bt-product-card')).toHaveCount(2);
  await page.reload();
  await expect(page.locator("header").first()).toHaveAttribute("aria-busy", "false");
  if (width < 1024) await page.getByRole("button", { name: /^Bộ lọc/ }).click();
  await expect(color.getByRole("checkbox", { name: "Trắng", exact: true })).toBeChecked();
  await expect(origin.getByRole("checkbox", { name: "Malaysia", exact: true })).toBeChecked();
  await color.getByRole("button", { name: "Bỏ chọn", exact: true }).click();
  await expect(page).toHaveURL(url => !url.searchParams.has("colorGroup") && url.searchParams.get("originGroup") === "malaysia");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

for (const width of [1440, 390]) test(`A category without colors hides unrelated choices and can clear a previously selected color at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  const path = `${frontend}/category/${noColorCategory.slug}?category=${noColorCategory.slug}`;
  await page.goto(path);
  await expect(page.locator("header").first()).toHaveAttribute("aria-busy", "false");
  await expect(page.locator('section[aria-label="Kết quả sản phẩm"] .bt-product-card')).toHaveCount(2);
  if (width < 1024) await page.getByRole("button", { name: /^Bộ lọc/ }).click();
  const panel = width < 1024 ? page.getByRole("dialog", { name: "Lọc sản phẩm", exact: true }) : page.locator("aside");
  await expect(panel.locator('[data-attribute-filter="color"]')).toHaveCount(0);
  if (width < 1024) await panel.getByRole("button", { name: /^Xem \d+ sản phẩm$/ }).click();
  await page.goto(path + "&colorGroup=white");
  await expect(page.locator("header").first()).toHaveAttribute("aria-busy", "false");
  await expect(page.getByText("Không tìm thấy sản phẩm phù hợp", { exact: true })).toBeVisible();
  if (width < 1024) await page.getByRole("button", { name: /^Bộ lọc/ }).click();
  const color = panel.locator('[data-attribute-filter="color"]');
  await expect(color.getByRole("checkbox", { name: "Trắng", exact: true })).toBeChecked();
  await expect(color.getByRole("checkbox")).toHaveCount(1);
  await color.getByRole("button", { name: "Bỏ chọn", exact: true }).click();
  await expect(page).toHaveURL(url => !url.searchParams.has("colorGroup") && url.searchParams.get("category") === noColorCategory.slug);
  await expect(color).toHaveCount(0);
  if (width < 1024) await panel.getByRole("button", { name: /^Xem \d+ sản phẩm$/ }).click();
  await expect(page.locator('section[aria-label="Kết quả sản phẩm"] .bt-product-card')).toHaveCount(2);
});

for (const view of [{ width: 1440, list: false, sort: "low" }, { width: 390, list: false, sort: "high" }, { width: 1440, list: true, sort: "new" }]) test(`Product skeletons replace stale cards during filtering at ${view.width}px ${view.list ? "list" : "grid"}`, async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.setViewportSize({ width: view.width, height: 1000 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`${frontend}/search?brand=HAFELE&q=${loadingQuery}&sort=${view.sort}`);
  await expect(page.locator("header").first()).toHaveAttribute("aria-busy", "false");
  const results = page.getByRole("region", { name: "Kết quả sản phẩm", exact: true });
  await expect(results).toHaveAttribute("aria-busy", "false");
  await expect(results.locator("article.bt-product-card")).toHaveCount(12);
  if (view.list) await page.getByRole("button", { name: "Dạng danh sách", exact: true }).click();
  if (view.width < 1024) await page.getByRole("button", { name: /^Bộ lọc/ }).click();
  const panel = view.width < 1024 ? page.getByRole("dialog", { name: "Lọc sản phẩm", exact: true }) : page.locator("aside");
  const gate = holdSearch("materialGroup");
  try {
    await panel.locator("[data-material-filter]").getByRole("checkbox", { name: "Nhựa", exact: true }).check();
    await expect.poll(gate.requested).toBe(true);
    await expect(results).toHaveAttribute("aria-busy", "true");
    await expect(results.locator("[data-product-skeleton]")).toHaveCount(12);
    await expect(results.locator("article.bt-product-card")).toHaveCount(0);
    await expect(results.locator("[data-product-grid]")).toHaveAttribute("aria-hidden", "true");
    await expect(results.getByRole("status")).toContainText("Đang cập nhật sản phẩm");
    await expect(results.getByRole("link")).toHaveCount(0);
    const skeleton = results.locator("[data-product-skeleton]").first();
    await expect(skeleton).toHaveCSS("animation-name", "none");
    if (view.width < 1024) await panel.getByRole("button", { name: "Đóng", exact: true }).click();
    await skeleton.scrollIntoViewIfNeeded();
    const columns = await results.locator("[data-product-grid]").evaluate(element => getComputedStyle(element).gridTemplateColumns.split(" ").length);
    expect(columns).toBe(view.list ? 1 : view.width < 640 ? 2 : 4);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await mkdir("/private/tmp/baotin-product-skeleton", { recursive: true });
    await page.screenshot({ path: `/private/tmp/baotin-product-skeleton/${view.width}-${view.list ? "list" : "grid"}.png` });
    gate.release();
    await expect(page).toHaveURL(url => url.searchParams.get("materialGroup") === "plastic");
    await expect(results).toHaveAttribute("aria-busy", "false");
    await expect(results.locator("[data-product-skeleton]")).toHaveCount(0);
    await expect(results.locator("article.bt-product-card")).toHaveCount(4);
    if (view.list) await expect(results.locator("article.bt-product-card--list")).toHaveCount(4);
    expect(errors).toEqual([]);
  } finally { gate.release(); searchGate = undefined; }
});

for (const state of ["empty", "error"] as const) test(`Product skeletons clear after a filter returns ${state}`, async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${frontend}/search?brand=HAFELE&q=${loadingQuery}&sort=popular`);
  await expect(page.locator("header").first()).toHaveAttribute("aria-busy", "false");
  const results = page.getByRole("region", { name: "Kết quả sản phẩm", exact: true });
  await expect(results).toHaveAttribute("aria-busy", "false");
  const gate = holdSearch(state === "empty" ? "stock" : "materialGroup", state === "error" ? 503 : 200);
  try {
    await page.locator("aside").getByRole("checkbox", { name: state === "empty" ? "Hết hàng" : "Nhựa", exact: true }).check();
    await expect.poll(gate.requested).toBe(true);
    await expect(results.locator("[data-product-skeleton]")).toHaveCount(12);
    await expect(results.getByText("Không tìm thấy sản phẩm phù hợp", { exact: true })).toHaveCount(0);
    gate.release();
    await expect(results).toHaveAttribute("aria-busy", "false");
    await expect(results.locator("[data-product-skeleton]")).toHaveCount(0);
    if (state === "empty") await expect(results.getByText("Không tìm thấy sản phẩm phù hợp", { exact: true })).toBeVisible();
    else await expect(results.getByRole("alert")).toContainText("Không thể tải danh sách sản phẩm");
  } finally { gate.release(); searchGate = undefined; }
});

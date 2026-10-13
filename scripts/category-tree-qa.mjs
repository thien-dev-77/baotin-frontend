import { strict as assert } from "node:assert";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const base = process.env.QA_BASE_URL || "http://127.0.0.1:3010";
if (!["127.0.0.1", "localhost"].includes(new URL(base).hostname)) throw new Error("Category tree QA only targets local frontend servers.");
const directory = "/private/tmp/baotin-category-tree";
await mkdir(directory, { recursive: true });
const response = await fetch(`${base}/api/backend/categories`);
assert.equal(response.status, 200);
const { items: categories } = await response.json();
const roots = categories.filter(category => !category.parentSlug);
assert.equal(roots.length, 5);
const browser = await chromium.launch();
const summary = [];
try {
  for (const width of [1440, 768, 390, 320]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 } });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    const checkViewport = async () => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
    await page.goto(base);
    await page.locator("[data-category-products]").first().waitFor();
    assert.equal(await page.locator("[data-category-products]").count(), 5);
    if (width >= 1024) {
      const sidebar = page.getByRole("navigation", { name: "Danh mục bên cạnh banner" });
      await sidebar.getByRole("button", { name: "Mở danh mục con Phụ kiện tủ bếp", exact: true }).click();
      await sidebar.getByRole("button", { name: "Mở danh mục con Phụ kiện tủ bếp trên", exact: true }).click();
      await sidebar.getByRole("link", { name: "Giá nâng hạ điện", exact: true }).waitFor();
      await page.getByRole("button", { name: "Danh mục sản phẩm", exact: true }).click();
      const menu = page.getByRole("menu");
      await menu.getByRole("menuitem", { name: "Mở danh mục con Phụ kiện tủ bếp", exact: true }).click();
      await menu.getByRole("menuitem", { name: "Mở danh mục con Phụ kiện tủ bếp dưới", exact: true }).click();
      await menu.getByRole("menuitem", { name: "Giá bát đĩa - Xoong nồi", exact: true }).waitFor();
      await page.keyboard.press("Escape");
    } else {
      await page.getByRole("button", { name: "Mở menu", exact: true }).click();
      const drawer = page.getByRole("dialog", { name: "Danh mục & tài khoản", exact: true });
      await drawer.getByRole("button", { name: "Mở danh mục con Phụ kiện tủ bếp", exact: true }).click();
      await drawer.getByRole("button", { name: "Mở danh mục con Phụ kiện tủ bếp trên", exact: true }).click();
      await drawer.getByRole("link", { name: "Giá nâng hạ điện", exact: true }).waitFor();
      await page.screenshot({ path: `${directory}/menu-${width}.png` });
      await page.keyboard.press("Escape");
    }
    await checkViewport();
    await page.screenshot({ path: `${directory}/home-${width}.png` });
    await page.goto(`${base}/categories`);
    await page.getByRole("heading", { name: "Danh mục sản phẩm", exact: true }).waitFor();
    assert.equal(await page.locator("main section").count(), 5);
    await checkViewport();
    for (const image of await page.locator("main section img").all()) {
      await image.scrollIntoViewIfNeeded();
      await page.waitForFunction(element => element.complete && element.naturalWidth > 0, await image.elementHandle());
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `${directory}/categories-${width}.png`, fullPage: true });
    await page.goto(`${base}/category/phu-kien-tu-bep`);
    await page.getByRole("heading", { name: "Phụ kiện tủ bếp", exact: true }).waitFor();
    assert.equal(await page.getByRole("navigation", { name: "Danh mục con", exact: true }).getByRole("link").count(), 5);
    assert.ok(await page.locator(".bt-product-card").count() > 0);
    await checkViewport();
    const image = page.locator(".bt-product-card img").first();
    await image.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => {
      const image = document.querySelector(".bt-product-card img");
      return image?.complete && image.naturalWidth > 0;
    });
    await page.screenshot({ path: `${directory}/listing-${width}.png` });
    await page.goto(`${base}/category/gia-bat-dia-nang-ha-dien`);
    await page.getByRole("heading", { name: "Giá nâng hạ điện", exact: true }).waitFor();
    const breadcrumb = page.getByRole("navigation", { name: "Đường dẫn" });
    assert.equal(await breadcrumb.getByRole("link", { name: "Phụ kiện tủ bếp", exact: true }).count(), 1);
    assert.equal(await breadcrumb.getByRole("link", { name: "Phụ kiện tủ bếp trên", exact: true }).count(), 1);
    await checkViewport();
    assert.deepEqual(errors, []);
    summary.push({ width, roots: roots.length, imagesLoaded: true, overflow: false, errors });
    await context.close();
  }
  await writeFile(`${directory}/report.json`, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
} finally { await browser.close(); }

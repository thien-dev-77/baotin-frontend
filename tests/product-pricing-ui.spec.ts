import { expect, test, type Page } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";
import { catalog, categoryCatalog, money } from "../lib/catalog";
import { previewCatalogPage } from "../lib/catalog-query";
import type { ApiAdminState } from "../lib/api-types";
import type { SessionUser } from "../lib/types";
import { adminReadFixture } from "./admin-read-fixtures";

const base = process.env.QA_BASE_URL || "http://127.0.0.1:3010";
if (!["127.0.0.1", "localhost"].includes(new URL(base).hostname)) throw new Error("Pricing UI QA only runs locally.");
test.setTimeout(45000);
test.use({ viewport: { width: 1440, height: 1000 } });
const staff: SessionUser = { id: "qa-admin", name: "QA Admin", email: "qa@example.test", role: "admin", branches: ["Quy Nhơn"], customer: null };
const buyer: SessionUser = { ...staff, id: "qa-buyer", role: "b2b", customer: { id: "QA-CUSTOMER", name: "QA Buyer", company: "QA", phone: "0901234567", email: "qa@example.test", role: "b2b", status: "active", creditLimit: 0, debt: 0 } };
const configured = { ...catalog[0], listPrice: 100000, b2cDiscount: 20, b2bDiscount: 35, price: 80000, oldPrice: 100000, stock: 10, published: true, revision: 1, gallery: [catalog[0].image] };
const legacy = { ...catalog[1], price: 80001, oldPrice: 100000, published: true, revision: 1, gallery: [catalog[1].image] };

async function mockPricing(page: Page, user: SessionUser | null = staff, customerPrice = 90000, productOverride: ApiAdminState["products"][number] = configured) {
  const state: ApiAdminState = { products: [productOverride, legacy], categories: categoryCatalog, customers: [], orders: [], approvals: [], warehouse: {}, receipts: [], paymentDueDates: {}, today: "2026-10-12" };
  const writes: Record<string, unknown>[] = [];
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/api/backend/**", async route => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.slice("/api/backend".length);
    // Mock every write so screenshots and assertions cannot affect a real database.
    if (["POST", "PATCH"].includes(request.method()) && path.startsWith("/admin/products")) {
      const payload = request.postDataJSON() as Record<string, unknown>;
      writes.push(payload);
      await route.fulfill({ json: { id: "QA-NEW", product: payload } });
      return;
    }
    if (request.method() !== "GET") {
      errors.push(`Unexpected write: ${request.method()} ${path}`);
      await route.fulfill({ status: 500, json: { message: "Unexpected QA write" } });
      return;
    }
    const publicProducts = state.products.map(({ b2bDiscount, ...product }) => user?.role === "b2b" ? { ...product, b2bDiscount, customerPrice } : product);
    const responses: Record<string, unknown> = {
      "/auth/session": { user }, "/admin/resources": state,
      "/catalog/bootstrap": { products: publicProducts, categories: categoryCatalog },
      "/catalog/selection": { products: publicProducts.filter(product => url.searchParams.getAll("ids").includes(product.id)) },
      "/catalog/search": previewCatalogPage(publicProducts, categoryCatalog, url.searchParams, user?.customer),
      "/orders": [], "/account": { favorites: [] }, "/notifications/count": { unreadCount: 0 },
    };
    const response = adminReadFixture(url, state) || (path.startsWith("/reviews/") ? { items: [] } : responses[path]);
    if (!response) {
      errors.push(`Unexpected read: ${path}`);
      await route.fulfill({ status: 500, json: { message: "Unexpected QA read" } });
      return;
    }
    await route.fulfill({ json: response });
  });
  return { writes, check: () => expect(errors).toEqual([]) };
}

const priceLabels = ["Giá niêm yết (VNĐ)", "Chiết khấu B2C (%)", "Giá sau CK B2C (VNĐ)", "Chiết khấu B2B (%)", "Giá sau CK B2B (VNĐ)"];

for (const width of [1440, 390]) {
  test(`Imported product content and twelve gallery images remain editable at ${width}px`, async ({ page }) => {
    const imported = {
      ...configured, published: false, brand: "Fulco", alternateCode: "NEW-600", sourceUrl: "https://fulco.vn/gia-bat",
      shortDescription: "Chất liệu inox 304\nTủ 600mm", technicalDetails: "Kích thước: 600mm\n" + "Thông số chi tiết\n".repeat(40),
      usageGuide: "Bước 1: Lắp đặt.\nBước 2: Kiểm tra.", warranty: "Bảo hành inox 304 vĩnh viễn",
      gallery: Array.from({ length: 12 }, (_, index) => `/media/uploads/qa-${index}.webp`),
    };
    await page.setViewportSize({ width, height: 1000 });
    const api = await mockPricing(page, staff, 90000, imported);
    await page.route("**/_next/image?**", route => route.fulfill({ contentType: "image/png", body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aSu8AAAAASUVORK5CYII=", "base64") }));
    await page.goto(`${base}/admin/products/${imported.id}/edit`);
    await expect(page.getByLabel("Mã sản phẩm mới", { exact: false })).toHaveValue(imported.alternateCode);
    await expect(page.getByLabel("Thông số chi tiết", { exact: false })).toHaveValue(imported.technicalDetails);
    await expect(page.getByLabel("Hướng dẫn sử dụng", { exact: false })).toHaveValue(imported.usageGuide);
    await expect(page.getByText("12/20", { exact: true })).toBeVisible();
    await capture(page, "imported-editor", width);
    await page.getByRole("button", { name: "Lưu sản phẩm", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/products$/);
    expect(api.writes[0]).toMatchObject({ published: false, alternateCode: imported.alternateCode, technicalDetails: imported.technicalDetails.trim(), usageGuide: imported.usageGuide, warranty: imported.warranty, gallery: imported.gallery });
    api.check();
  });
}
async function capture(page: Page, view: string, width: number) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await mkdir("/private/tmp/baotin-product-pricing", { recursive: true });
  await page.screenshot({ path: `/private/tmp/baotin-product-pricing/${view}-${width}.png`, fullPage: true });
}

for (const width of [1440, 768, 390, 320]) {
  test(`Five price columns and independent editable discounts at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const api = await mockPricing(page);
    await page.goto(`${base}/admin/products`);
    const table = page.locator("#admin-content table");
    for (const label of priceLabels) await expect(table.getByRole("columnheader", { name: label, exact: true })).toBeAttached();
    const row = table.locator("tbody tr").filter({ hasText: configured.code });
    await expect(row).toContainText(money(100000));
    await expect(row).toContainText("20%");
    await expect(row).toContainText(money(80000));
    await expect(row).toContainText("35%");
    await expect(row).toContainText(money(65000));
    await capture(page, "list", width);
    await page.getByRole("link", { name: "Thêm sản phẩm", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Thêm sản phẩm", exact: true })).toBeVisible();
    await page.getByLabel("Tên sản phẩm", { exact: false }).fill("Sản phẩm kiểm tra giá");
    await page.getByLabel("Mã hàng", { exact: false }).fill("QA-NEW");
    await page.getByLabel("Thương hiệu", { exact: false }).fill("QA");
    await page.locator("#product-category").selectOption(configured.category);
    await page.getByLabel(priceLabels[0], { exact: false }).fill("100000");
    await page.getByLabel(priceLabels[1], { exact: false }).fill("12.34");
    await page.getByLabel(priceLabels[3], { exact: false }).fill("35");
    await expect(page.getByLabel(priceLabels[2])).toHaveValue("87660");
    await expect(page.getByLabel(priceLabels[4])).toHaveValue("65000");
    await expect(page.getByLabel(priceLabels[2])).toHaveJSProperty("readOnly", true);
    await expect(page.getByLabel(priceLabels[4])).toHaveJSProperty("readOnly", true);
    await capture(page, "editor", width);
    await page.getByRole("button", { name: "Lưu sản phẩm", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/products$/);
    expect(api.writes).toHaveLength(1);
    expect(api.writes[0]).toMatchObject({ listPrice: 100000, b2cDiscount: 12.34, b2bDiscount: 35, price: 87660, published: false });
    expect(api.writes[0]).not.toHaveProperty("b2bPrice");
    api.check();
  });
}

test("Product CSV exports all five pricing fields and leaves legacy B2B unconfigured", async ({ page }) => {
  const api = await mockPricing(page);
  await page.goto(`${base}/admin/products`);
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Xuất CSV", exact: true }).click();
  const download = await pending;
  const csv = await readFile((await download.path())!, "utf8");
  for (const label of priceLabels) expect(csv).toContain(label);
  expect(csv).toContain('"100000","20","80000","35","65000"');
  expect(csv).toContain('"100000","20","80001","",""');
  api.check();
});

test("Legacy content-only edits preserve prices; changing pricing explicitly converts the product", async ({ page }) => {
  const api = await mockPricing(page);
  await page.goto(`${base}/admin/products/${legacy.id}/edit`);
  await expect(page.getByText("Chưa cấu hình giá niêm yết", { exact: true })).toBeVisible();
  await expect(page.getByLabel(priceLabels[2])).toHaveValue("80001");
  await expect(page.getByLabel(priceLabels[4])).toHaveValue("");
  await page.getByLabel("Tên sản phẩm", { exact: false }).fill(`${legacy.name} mới`);
  await page.getByRole("button", { name: "Lưu sản phẩm", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/products$/);
  expect(api.writes[0]).toMatchObject({ price: 80001, oldPrice: 100000, revision: 1 });
  for (const field of ["listPrice", "b2cDiscount", "b2bDiscount"]) expect(api.writes[0]).not.toHaveProperty(field);
  await page.getByRole("link", { name: `Sửa sản phẩm ${legacy.code}`, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/products/${legacy.id}/edit`));
  await expect(page.getByRole("button", { name: "Làm mới dữ liệu", exact: true })).toBeEnabled();
  await page.getByLabel(priceLabels[3], { exact: false }).fill("35");
  await expect(page.getByLabel(priceLabels[3], { exact: false })).toHaveValue("35");
  await expect(page.getByLabel(priceLabels[2])).toHaveValue("80000");
  await expect(page.getByLabel(priceLabels[4])).toHaveValue("65000");
  await page.getByRole("button", { name: "Lưu sản phẩm", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/products$/);
  expect(api.writes[1]).toMatchObject({ listPrice: 100000, b2cDiscount: 20, b2bDiscount: 35, price: 80000 });
  api.check();
});

test("Invalid discounts cannot submit or silently round; private drafts can use zero price", async ({ page }) => {
  const api = await mockPricing(page);
  await page.goto(`${base}/admin/products/${configured.id}/edit`);
  await expect(page.getByRole("button", { name: "Làm mới dữ liệu", exact: true })).toBeEnabled();
  for (const value of ["100", "-1", "12.345"]) {
    await page.getByLabel(priceLabels[1], { exact: false }).fill(value);
    await expect(page.getByLabel(priceLabels[1], { exact: false })).toHaveValue(value);
    await page.getByRole("button", { name: "Lưu sản phẩm", exact: true }).click();
    expect(api.writes).toHaveLength(0);
  }
  await page.getByRole("radio", { name: "Riêng tư", exact: true }).check();
  await page.getByLabel(priceLabels[0], { exact: false }).fill("0");
  await page.getByLabel(priceLabels[1], { exact: false }).fill("0");
  await expect(page.getByLabel(priceLabels[2])).toHaveValue("0");
  await expect(page.getByLabel(priceLabels[4])).toHaveValue("0");
  await page.getByRole("button", { name: "Lưu sản phẩm", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/products$/);
  expect(api.writes[0]).toMatchObject({ listPrice: 0, b2cDiscount: 0, b2bDiscount: 35, price: 0, published: false });
  api.check();
});

for (const width of [1440, 390]) {
  test(`Guest product detail shows retail breakdown without private B2B discounts at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const api = await mockPricing(page, null);
    await page.goto(`${base}/products/${configured.slug}`);
    const panel = page.getByRole("complementary", { name: "Mua sản phẩm", exact: true });
    const prices = panel.getByLabel("Giá niêm yết và chiết khấu", { exact: true });
    await expect(prices).toContainText(money(100000));
    await expect(prices).toContainText("20%");
    await expect(prices).toContainText(money(80000));
    await expect(prices).not.toContainText("35%");
    await expect(prices).not.toContainText(money(65000));
    await expect(prices.getByRole("link", { name: "Đăng nhập B2B", exact: true })).toBeVisible();
    await capture(page, "guest", width);
    api.check();
  });
}

test("B2B product detail shows effective policy prices, not the product default", async ({ page }) => {
  const api = await mockPricing(page, buyer, 90000);
  await page.goto(`${base}/products/${configured.slug}`);
  const panel = page.getByRole("complementary", { name: "Mua sản phẩm", exact: true });
  const prices = panel.getByLabel("Giá niêm yết và chiết khấu", { exact: true });
  await expect(prices).toContainText(money(90000));
  await expect(prices).toContainText("10%");
  await expect(prices).not.toContainText("35%");
  await expect(prices).not.toContainText(money(65000));
  await expect(panel.locator("strong").first()).toHaveText(money(90000));
  await capture(page, "b2b", 1440);
  api.check();
});

for (const price of [55000, 110000]) {
  test(`Product cards show discounts from the actual customer price ${price}`, async ({ page }) => {
    const api = await mockPricing(page, buyer, price);
    await page.goto(`${base}/search`);
    const card = page.locator(".bt-product-card").filter({ hasText: configured.code });
    await expect(card).toContainText(money(price));
    if (price === 55000) await expect(card.locator(".bg-danger")).toContainText("-45%");
    else { await expect(card.locator(".bg-danger")).toHaveCount(0); await expect(card.locator("del")).toHaveCount(0); }
    api.check();
  });
}

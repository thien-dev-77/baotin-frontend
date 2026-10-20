import { expect, test, type Page } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";
import { catalog } from "../lib/catalog";
import type { ApiAdminState } from "../lib/api-types";
import { adminReadFixture } from "./admin-read-fixtures";

const base = process.env.QA_BASE_URL || "http://127.0.0.1:3053";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname)) throw new Error("Product loading QA only targets a local frontend.");
test.setTimeout(90000);

async function mockProducts(page: Page, delayFirst = false, withBrands = false) {
  const categories = [
    { slug: "qa-parent", name: "Phụ kiện QA", image: "", description: "", subcategories: ["Tay nắm"] },
    { slug: "qa-child", parentSlug: "qa-parent", name: "Tủ bếp QA", image: "", description: "", subcategories: ["Ray trượt"] },
    { slug: "qa-other", name: "Đèn QA", image: "", description: "", subcategories: ["LED dây"] },
  ];
  const state: ApiAdminState = { products: Array.from({ length: 24 }, (_, index) => ({ ...catalog[0], image: "", id: `qa-product-${index}`, code: `QA-${index}`, name: `Sản phẩm QA ${index}`, brand: "QA", category: index < 8 ? "qa-parent" : index < 16 ? "qa-child" : "qa-other", subcategory: index < 8 ? "Tay nắm" : index < 16 ? "Ray trượt" : "LED dây", published: index % 2 === 0, revision: 1 })), categories, customers: [], orders: [], approvals: [], receipts: [], warehouse: {}, paymentDueDates: {}, today: "2026-10-14" };
  if (withBrands) state.products.forEach((product, index) => { product.brand = index < 12 ? "Fulco" : "HAFELE"; });
  const reads: string[] = [], errors: string[] = [], resourceReads: string[] = [];
  const selectionReads: string[] = [];
  let release!: () => void;
  const first = new Promise<void>(resolve => { release = resolve; });
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/api/backend/**", async route => {
    const request = route.request(), url = new URL(request.url());
    const path = url.pathname.slice("/api/backend".length);
    if (request.method() !== "GET") { errors.push(`Unexpected write: ${path}`); await route.fulfill({ status: 500, json: {} }); return; }
    if (path === "/admin/browse") { reads.push(url.search); if (delayFirst && reads.length === 1) await first; await route.fulfill({ json: adminReadFixture(url, state) }); return; }
    if (path === "/admin/products/selection") {
      selectionReads.push(url.search);
      const browseURL = new URL(url); browseURL.pathname = "/api/backend/admin/browse";
      browseURL.searchParams.set("resource", "products"); browseURL.searchParams.set("pageSize", "50");
      const result = adminReadFixture(browseURL, state);
      const selected = result && "products" in result ? result.products || [] : [];
      await route.fulfill({ json: { products: selected.map(product => ({ id: product.id, code: product.code, revision: 1 })), count: selected.length } }); return;
    }
    if (path === "/admin/resources") resourceReads.push(url.searchParams.get("include") || "");
    const responses: Record<string, unknown> = {
      "/auth/session": { user: { id: "qa-staff", role: "admin", name: "QA Admin", email: "qa@example.test", branches: ["Quy Nhơn", "Tuy Hòa"], customer: null } },
      "/admin/resources": { categories, today: state.today }, "/admin/users": { users: [] },
      "/admin/product-metadata": { categories, brands: Array.from(new Set(state.products.map(product => product.brand))).sort() },
      "/notifications/count": { unreadCount: 0 }, "/catalog/bootstrap": { products: [], categories },
    };
    if (!(path in responses)) errors.push(`Unexpected read: ${path}`);
    await route.fulfill({ json: responses[path] || {} });
  });
  return { state, reads, resourceReads, selectionReads, release, check: () => expect(errors).toEqual([]) };
}

test("Categories load independently of a delayed product list", async ({ page }) => {
  const api = await mockProducts(page, true);
  try {
    await page.goto(`${base}/admin/products`);
    await expect(page.getByRole("heading", { name: "Sản phẩm", exact: true })).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Danh mục sản phẩm", exact: true }).locator('option[value="qa-parent"]')).toHaveText("Phụ kiện QA");
    expect(api.resourceReads).toEqual([]);
    await expect(page.getByRole("combobox", { name: "Danh mục sản phẩm", exact: true })).toBeEnabled();
    expect(api.reads).toHaveLength(1);
  } finally { api.release(); }
  await expect(page.locator(".bt-admin-products-table tbody tr")).toHaveCount(10);
  api.check();
});

for (const width of [1440, 390]) test(`Brand filtering keeps pagination, bulk selection, category filters and CSV in sync at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  const api = await mockProducts(page, false, true);
  await page.goto(`${base}/admin/products?page=2`);
  const brand = page.getByRole("combobox", { name: "Thương hiệu sản phẩm", exact: true });
  await expect(brand.locator('option[value="HAFELE"]')).toHaveText("HAFELE");
  await brand.selectOption("HAFELE");
  await expect(page).toHaveURL(/brand=HAFELE/); await expect(page).not.toHaveURL(/page=2/);
  await expect(page.locator(".bt-admin-products-table tbody tr")).toHaveCount(10);
  await expect(page.locator(".bt-admin-products-table tbody")).not.toContainText("Fulco");
  await expect(brand.locator('option[value="Fulco"]')).toHaveText("Fulco");
  await page.getByRole("checkbox", { name: "Chọn tất cả sản phẩm trên trang", exact: true }).check();
  await page.getByRole("button", { name: "Chọn tất cả 12", exact: true }).click();
  await expect(page.getByText("Đã chọn 12", { exact: true })).toBeVisible();
  expect(new URLSearchParams(api.selectionReads[0]).get("brand")).toBe("HAFELE");
  await brand.selectOption("Fulco");
  await expect(page.getByText("Đã chọn 0", { exact: true })).toBeVisible();
  await expect(page.locator(".bt-admin-products-table tbody")).not.toContainText("HAFELE");
  await brand.selectOption("HAFELE");
  await page.getByRole("combobox", { name: "Danh mục sản phẩm", exact: true }).selectOption("qa-parent");
  await page.getByRole("combobox", { name: "Nhóm sản phẩm", exact: true }).selectOption("Ray trượt");
  await page.getByRole("combobox", { name: "Trạng thái sản phẩm", exact: true }).selectOption("published");
  await expect(page.locator(".bt-admin-products-table tbody tr")).toHaveCount(2);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Xuất CSV", exact: true }).click();
  const download = await downloadPromise;
  const csv = await readFile((await download.path())!, "utf8");
  expect(csv).toContain("QA-12"); expect(csv).toContain("QA-14"); expect(csv).not.toContain("Fulco");
  const lastRead = new URLSearchParams(api.reads.at(-1));
  expect(lastRead.get("brand")).toBe("HAFELE"); expect(lastRead.get("subcategory")).toBe("Ray trượt"); expect(lastRead.get("status")).toBe("published");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await mkdir("/private/tmp/baotin-admin-brand-filter", { recursive: true });
  await page.screenshot({ path: `/private/tmp/baotin-admin-brand-filter/filters-${width}.png`, fullPage: true });
  await page.getByRole("button", { name: "Xóa bộ lọc", exact: true }).click();
  await expect(page).toHaveURL(`${base}/admin/products`); await expect(brand).toHaveValue("all");
  await expect(page.locator(".bt-admin-products-table tbody tr")).toHaveCount(10);
  api.check();
});

test("Menu intent preloads one bounded page and navigation reuses that request", async ({ page }) => {
  const api = await mockProducts(page, true);
  try {
    await page.goto(`${base}/admin/users`);
    await expect(page.getByRole("heading", { name: "Tài khoản & phân quyền", exact: true })).toBeVisible();
    const link = page.locator('nav[aria-label="Quản trị nội bộ"] a[href="/admin/products"]').first();
    await link.hover(); await expect.poll(() => api.reads.length).toBe(1);
    await link.click(); await expect(page.getByRole("heading", { name: "Sản phẩm", exact: true })).toBeVisible();
    expect(api.reads).toHaveLength(1);
  } finally { api.release(); }
  await expect(page.locator(".bt-admin-products-table tbody tr")).toHaveCount(10);
  const users = page.locator('nav[aria-label="Quản trị nội bộ"] a[href="/admin/users"]').first();
  await users.click(); await expect(page.getByRole("heading", { name: "Tài khoản & phân quyền", exact: true })).toBeVisible();
  await page.locator('nav[aria-label="Quản trị nội bộ"] a[href="/admin/products"]').first().click();
  await expect(page.locator(".bt-admin-products-table tbody tr")).toHaveCount(10);
  expect(api.reads).toHaveLength(1); expect(api.resourceReads).toEqual([]);
  api.check();
});

for (const width of [1440, 390]) test(`Search, parent category and product group work together at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  const api = await mockProducts(page);
  await page.goto(`${base}/admin/products?page=2`);
  await expect(page.locator(".bt-admin-products-table tbody tr")).toHaveCount(10);
  await page.getByRole("searchbox", { name: "Tìm sản phẩm, mã hàng, thương hiệu...", exact: true }).fill("Sản phẩm QA");
  await page.getByRole("combobox", { name: "Danh mục sản phẩm", exact: true }).selectOption("qa-parent");
  await expect(page).toHaveURL(/category=qa-parent/);
  await expect(page).not.toHaveURL(/page=2/);
  await expect.poll(() => page.locator(".bt-admin-products-table tbody tr").count()).toBe(10);
  await page.getByRole("combobox", { name: "Nhóm sản phẩm", exact: true }).selectOption("Ray trượt");
  await expect(page.locator(".bt-admin-products-table tbody tr")).toHaveCount(8);
  const params = new URL(page.url()).searchParams;
  expect(params.get("q")).toBe("Sản phẩm QA"); expect(params.get("category")).toBe("qa-parent"); expect(params.get("subcategory")).toBe("Ray trượt");
  await expect(page.locator(".bt-admin-products-table tbody")).toContainText("QA-8");
  await expect(page.locator(".bt-admin-products-table tbody")).not.toContainText("QA-16");
  await page.getByRole("combobox", { name: "Trạng thái sản phẩm", exact: true }).selectOption("published");
  await expect(page.locator(".bt-admin-products-table tbody tr")).toHaveCount(4);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await mkdir("/private/tmp/baotin-admin-products-loading", { recursive: true });
  await page.screenshot({ path: `/private/tmp/baotin-admin-products-loading/filters-${width}.png`, fullPage: true });
  await page.getByRole("button", { name: "Xóa bộ lọc", exact: true }).click();
  await expect(page).toHaveURL(`${base}/admin/products`);
  await expect(page.locator(".bt-admin-products-table tbody tr")).toHaveCount(10);
  api.check();
});

import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { catalog, categoryCatalog } from "../lib/catalog";
import type { ApiAdminState } from "../lib/api-types";

const base = process.env.QA_BASE_URL || "http://127.0.0.1:3053";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname)) throw new Error("Variant UI QA only runs locally.");
test.setTimeout(120000);

for (const width of [1440, 390]) test(`Configure independent color, direction and size types at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  const root = { ...catalog[0], id: "group-root", code: "FCL303-L", variantGroupId: "group-root", variantAttributes: [{ name: "Phiên bản", value: "FCL303-L" }], published: true, revision: 1 };
  const child = { ...root, id: "group-child", code: "FCL303-R", variantAttributes: [{ name: "Phiên bản", value: "FCL303-R" }] };
  const state: ApiAdminState = { products: [root, child], categories: categoryCatalog, orders: [], customers: [], approvals: [], receipts: [], warehouse: {}, paymentDueDates: {}, today: "2026-10-14" };
  const writes: { products: { id: string; revision: number; attributes: { name: string; value: string }[] }[] }[] = [];
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/api/backend/**", async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname.slice("/api/backend".length);
    if (request.method() === "PATCH" && path === "/admin/products/group-root/variants") {
      const body = request.postDataJSON() as typeof writes[number]; writes.push(body);
      state.products = state.products.map(product => ({ ...product, revision: (product.revision || 0) + 1, variantAttributes: body.products.find(row => row.id === product.id)!.attributes }));
      await route.fulfill({ json: { products: state.products } }); return;
    }
    if (request.method() !== "GET") { errors.push(`Unexpected write: ${request.method()} ${path}`); await route.fulfill({ status: 500, json: { message: "Unexpected write" } }); return; }
    const responses: Record<string, unknown> = {
      "/auth/session": { user: { id: "qa-admin", name: "QA Admin", email: "qa@example.test", role: "admin", branches: ["Quy Nhơn"], customer: null } },
      "/admin/resources": state, "/catalog/bootstrap": { products: state.products, categories: categoryCatalog },
      "/catalog/selection": { products: state.products }, "/notifications/count": { unreadCount: 0 },
      "/orders": [], "/account": { favorites: [] },
    };
    if (!(path in responses)) errors.push(`Unexpected read: ${path}`);
    await route.fulfill({ json: responses[path] || {} });
  });
  await page.goto(`${base}/admin/products/group-child/variants`);
  await expect(page.getByRole("heading", { name: "Thiết lập loại biến thể", exact: true })).toBeVisible();
  await page.getByLabel("Tên loại biến thể 1", { exact: true }).fill("Hướng");
  await page.getByLabel("Hướng của FCL303-L", { exact: true }).fill("Trái");
  await page.getByLabel("Hướng của FCL303-R", { exact: true }).fill("Phải");
  await page.getByRole("button", { name: "Thêm Màu sắc", exact: true }).click();
  await page.getByRole("button", { name: "Thêm Kích thước", exact: true }).click();
  for (const code of ["FCL303-L", "FCL303-R"]) {
    await page.getByLabel(`Màu sắc của ${code}`, { exact: true }).fill(code.endsWith("L") ? "Đen" : "Bạc");
    await page.getByLabel(`Kích thước của ${code}`, { exact: true }).fill("600mm");
  }
  await page.getByRole("button", { name: "Lưu thiết lập biến thể", exact: true }).click();
  await expect.poll(() => writes.length).toBe(1);
  await expect(page.getByLabel("Hướng của FCL303-R", { exact: true })).toHaveValue("Phải");
  expect(writes[0].products).toEqual([
    { id: root.id, revision: 1, attributes: [{ name: "Hướng", value: "Trái" }, { name: "Màu sắc", value: "Đen" }, { name: "Kích thước", value: "600mm" }] },
    { id: child.id, revision: 1, attributes: [{ name: "Hướng", value: "Phải" }, { name: "Màu sắc", value: "Bạc" }, { name: "Kích thước", value: "600mm" }] },
  ]);
  await expect(page.getByRole("link", { name: "Tạo SKU biến thể", exact: true })).toHaveAttribute("href", "/admin/products/new?variantOf=group-root");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await mkdir("/private/tmp/baotin-variant-types-ui", { recursive: true });
  await page.screenshot({ path: `/private/tmp/baotin-variant-types-ui/types-${width}.png`, fullPage: true });
  expect(errors).toEqual([]);
});

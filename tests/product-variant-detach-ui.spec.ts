import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { catalog, categoryCatalog } from "../lib/catalog";
import type { ApiAdminState } from "../lib/api-types";
import { adminReadFixture } from "./admin-read-fixtures";

const base = process.env.QA_BASE_URL || "http://127.0.0.1:3053";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname)) throw new Error("Variant detach QA only runs locally.");
test.setTimeout(120000);
type AdminProduct = ApiAdminState["products"][number];
type DetachWrite = { groupId: string; products: { id: string; revision: number }[] };

async function mockDetach(page: Page) {
  let products: AdminProduct[] = ["FC35S-600", "FC36S-600", "FC35S-700"].map((code, index) => ({
    ...catalog[0], id: `detach-${index}`, slug: `detach-${index}`, code, variantGroupId: "detach-0",
    variantAttributes: [{ name: "Phiên bản", value: code }], published: index !== 2, revision: index + 7,
    stock: index + 17, listPrice: 1000000 * (index + 1), technicalDetails: "Thông số riêng",
  }));
  const writes: DetachWrite[] = [], errors: string[] = [];
  let readError = "", writeError = "", reads = 0;
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/_next/image?**", route => route.fulfill({ contentType: "image/png", body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aSu8AAAAASUVORK5CYII=", "base64") }));
  await page.route("**/api/backend/**", async route => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname.slice("/api/backend".length);
    const state: ApiAdminState = { products, categories: categoryCatalog, orders: [], customers: [], approvals: [], receipts: [], warehouse: {}, paymentDueDates: {}, today: "2026-10-15" };
    if (request.method() === "GET" && /\/admin\/products\/[^/]+\/variants$/.test(path)) {
      reads++;
      const selected = products.find(product => product.id === path.split("/")[3])!;
      await route.fulfill({ status: readError ? 503 : 200, json: readError ? { message: readError } : { products: products.filter(product => product.variantGroupId === selected.variantGroupId) } }); return;
    }
    if (request.method() === "POST" && path.endsWith("/detach-variant")) {
      const body = request.postDataJSON() as DetachWrite; writes.push(body);
      if (writeError) { await route.fulfill({ status: 409, json: { message: writeError } }); return; }
      const id = path.split("/")[3], remaining = products.filter(product => product.variantGroupId === body.groupId && product.id !== id);
      const nextRoot = id === body.groupId ? remaining[0].id : body.groupId;
      products = products.map(product => product.id === id ? { ...product, variantGroupId: product.id, revision: product.revision! + 1 }
        : product.variantGroupId === body.groupId && nextRoot !== body.groupId ? { ...product, variantGroupId: nextRoot, revision: product.revision! + 1 } : product);
      await route.fulfill({ status: 201, json: { id, groupId: nextRoot, products } }); return;
    }
    if (request.method() !== "GET") { errors.push(`Unexpected write: ${path}`); await route.fulfill({ status: 405, json: {} }); return; }
    const responses: Record<string, unknown> = {
      "/auth/session": { user: { id: "qa-admin", name: "QA Admin", email: "qa@example.test", role: "admin", branches: ["Quy Nhơn"], customer: null } },
      "/admin/resources": state, "/catalog/bootstrap": { products: products.filter(product => product.published), categories: categoryCatalog },
      "/catalog/selection": { products }, "/notifications/count": { unreadCount: 0 }, "/orders": [], "/account": { favorites: [] },
    };
    const response = adminReadFixture(url, state) || responses[path];
    if (!response) errors.push(`Unexpected read: ${path}`);
    await route.fulfill({ status: response ? 200 : 404, json: response || {} });
  });
  return { writes, errors, reads: () => reads, products: () => structuredClone(products), readError: (message: string) => { readError = message; }, writeError: (message: string) => { writeError = message; } };
}

for (const width of [1440, 390]) test(`Detach another SKU without deleting its product at ${width}px`, async ({ page }) => {
  const fixture = await mockDetach(page);
  await page.setViewportSize({ width, height: 1000 });
  await page.goto(`${base}/admin/products/detach-0/edit`);
  const list = page.getByRole("list", { name: "Các SKU trong nhóm", exact: true });
  await expect(list.getByRole("link", { name: "FC36S-600", exact: true })).toBeVisible();
  const detach = page.getByRole("button", { name: "Tách FC36S-600 khỏi nhóm", exact: true });
  await detach.click();
  const dialog = page.getByRole("dialog", { name: "Tách SKU khỏi nhóm", exact: true });
  await expect(dialog).toContainText("FC36S-600");
  await expect(dialog.getByRole("button", { name: "Tách khỏi nhóm", exact: true })).toBeEnabled();
  await dialog.getByRole("button", { name: "Hủy", exact: true }).click();
  expect(fixture.writes).toHaveLength(0);
  await detach.click();
  await expect(dialog.getByRole("button", { name: "Tách khỏi nhóm", exact: true })).toBeEnabled();
  await mkdir("/private/tmp/baotin-variant-detach", { recursive: true });
  await page.screenshot({ path: `/private/tmp/baotin-variant-detach/confirm-${width}.png` });
  const before = fixture.products();
  await dialog.getByRole("button", { name: "Tách khỏi nhóm", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(list.getByRole("link", { name: "FC36S-600", exact: true })).toHaveCount(0);
  await expect(list.getByRole("link")).toHaveCount(2);
  expect(fixture.writes).toEqual([{ groupId: "detach-0", products: before.map(({ id, revision }) => ({ id, revision })) }]);
  expect(fixture.products()[1]).toEqual({ ...before[1], variantGroupId: "detach-1", revision: 9 });
  await page.goto(`${base}/admin/products/detach-1/edit`);
  await expect(list.getByRole("link")).toHaveCount(1);
  await expect(page.getByRole("button", { name: /Tách .* khỏi nhóm/ })).toHaveCount(0);
  await expect(page.getByLabel("Giá trị Phiên bản", { exact: true })).toHaveValue("FC36S-600");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  expect(fixture.errors).toEqual([]);
});

test("Detaching the root reanchors the remaining group", async ({ page }) => {
  const fixture = await mockDetach(page);
  await page.goto(`${base}/admin/products/detach-1/edit`);
  await page.getByRole("button", { name: "Tách FC35S-600 khỏi nhóm", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Tách SKU khỏi nhóm", exact: true });
  await expect(dialog).toContainText("Đây là SKU gốc");
  await dialog.getByRole("button", { name: "Tách khỏi nhóm", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  const list = page.getByRole("list", { name: "Các SKU trong nhóm", exact: true });
  await expect(list.getByRole("link", { name: "FC35S-600", exact: true })).toHaveCount(0);
  await expect(list.getByRole("link")).toHaveCount(2);
  await expect(page.getByRole("link", { name: "Tạo biến thể", exact: true })).toHaveAttribute("href", /variantOf=detach-1/);
  expect(fixture.products().map(product => product.variantGroupId)).toEqual(["detach-0", "detach-1", "detach-1"]);
  expect(fixture.errors).toEqual([]);
});

test("Unsaved product edits block detaching a SKU", async ({ page }) => {
  const fixture = await mockDetach(page);
  await page.goto(`${base}/admin/products/detach-0/edit`);
  const detach = page.getByRole("button", { name: "Tách FC36S-600 khỏi nhóm", exact: true });
  await expect(detach).toBeEnabled();
  await page.getByLabel("Tên sản phẩm", { exact: false }).fill("Nội dung chưa lưu");
  await expect(detach).toBeDisabled();
  await expect(page.getByText("Lưu các thay đổi trước khi tách SKU khỏi nhóm.", { exact: true })).toBeVisible();
  expect(fixture.writes).toHaveLength(0); expect(fixture.reads()).toBe(0);
  expect(fixture.errors).toEqual([]);
});

test("Read failures and revision conflicts require a fresh group before retry", async ({ page }) => {
  const fixture = await mockDetach(page);
  fixture.readError("Không thể tải nhóm mới nhất");
  await page.goto(`${base}/admin/products/detach-0/edit`);
  await page.getByRole("button", { name: "Tách FC36S-600 khỏi nhóm", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Tách SKU khỏi nhóm", exact: true });
  const confirm = dialog.getByRole("button", { name: "Tách khỏi nhóm", exact: true });
  await expect(dialog.getByRole("alert")).toContainText("Không thể tải nhóm mới nhất");
  await expect(confirm).toBeDisabled();
  fixture.readError(""); fixture.writeError("Một SKU đã được cập nhật ở phiên khác.");
  await dialog.getByRole("button", { name: "Tải lại nhóm biến thể", exact: true }).click();
  await confirm.click();
  await expect(dialog.getByRole("alert")).toContainText("Một SKU đã được cập nhật ở phiên khác.");
  await expect(confirm).toBeDisabled();
  expect(fixture.products()[1].variantGroupId).toBe("detach-0");
  fixture.writeError("");
  await dialog.getByRole("button", { name: "Tải lại nhóm biến thể", exact: true }).click();
  await confirm.click(); await expect(dialog).toHaveCount(0);
  expect(fixture.writes).toHaveLength(2); expect(fixture.reads()).toBeGreaterThanOrEqual(3);
  expect(fixture.errors).toEqual([]);
});

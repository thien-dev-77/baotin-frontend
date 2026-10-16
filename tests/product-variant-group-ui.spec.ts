import { expect, test, type Page } from "@playwright/test";
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
      "/admin/products/group-root/variants": { products: state.products },
      "/admin/products/group-child/variants": { products: state.products },
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

type GroupProduct = ApiAdminState["products"][number];
type GroupWrite = { products: { id: string; revision: number; attributes: NonNullable<GroupProduct["variantAttributes"]> }[] };

async function mockFreshGroup(page: Page, products?: GroupProduct[]) {
  let current: GroupProduct[] = products || [600, 700, 800].map((size, index) => ({
    ...catalog[0], id: index === 0 ? "group-root" : `group-child-${size}`, slug: `group-${size}`, code: `QA-${size}`,
    variantGroupId: "group-root", published: index !== 2, revision: 7 + index,
    variantAttributes: [{ name: "Phiên bản", value: `QA-${size}` }, { name: "Kích thước", value: `${size}mm` }],
  }));
  const state: ApiAdminState = { products: structuredClone(current).map(product => ({ ...product, revision: 1 })), categories: categoryCatalog, orders: [], customers: [], approvals: [], receipts: [], warehouse: {}, paymentDueDates: {}, today: "2026-10-15" };
  const writes: GroupWrite[] = [], errors: string[] = [];
  let readError = "", writeError = "";
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/api/backend/**", async route => {
    const request = route.request(), path = new URL(request.url()).pathname.slice("/api/backend".length);
    if (request.method() === "GET" && /^\/admin\/products\/[^/]+\/variants$/.test(path)) {
      await route.fulfill({ status: readError ? 503 : 200, json: readError ? { message: readError } : { products: current } }); return;
    }
    if (request.method() === "PATCH" && path === "/admin/products/group-root/variants") {
      const body = request.postDataJSON() as GroupWrite; writes.push(body);
      const stale = body.products.length !== current.length || body.products.some(product => current.find(row => row.id === product.id)?.revision !== product.revision);
      if (writeError || stale) { await route.fulfill({ status: 409, json: { message: writeError || "Một SKU đã được cập nhật ở phiên khác. Tải lại trước khi lưu." } }); return; }
      current = current.map(product => ({ ...product, revision: (product.revision || 0) + 1, variantAttributes: body.products.find(row => row.id === product.id)!.attributes }));
      await route.fulfill({ json: { products: current } }); return;
    }
    if (request.method() !== "GET") { errors.push(`Unexpected write: ${path}`); await route.fulfill({ status: 405, json: {} }); return; }
    const responses: Record<string, unknown> = {
      "/auth/session": { user: { id: "qa-admin", name: "QA Admin", email: "qa@example.test", role: "admin", branches: ["Quy Nhơn"], customer: null } },
      "/admin/resources": state, "/catalog/bootstrap": { products: current, categories: categoryCatalog },
      "/catalog/selection": { products: current }, "/notifications/count": { unreadCount: 0 }, "/orders": [], "/account": { favorites: [] },
    };
    if (!(path in responses)) errors.push(`Unexpected read: ${path}`);
    await route.fulfill({ json: responses[path] || {} });
  });
  return {
    writes, errors,
    rows: () => structuredClone(current),
    update: (id: string, changes: Partial<GroupProduct>) => { current = current.map(product => product.id === id ? { ...product, ...changes } : product); },
    readError: (message: string) => { readError = message; },
    writeError: (message: string) => { writeError = message; },
  };
}

for (const width of [1440, 390]) test(`Detailed duplicate combinations appear below the create SKU link at ${width}px`, async ({ page }) => {
  const codes = ["FC09S-750-B-304", "FC09S-800-B-304", "FC09S-750-X-304", "FC09S-800-X-304"];
  const fixture = await mockFreshGroup(page, codes.map((code, index) => ({ ...catalog[0], code, slug: code.toLowerCase(),
    id: index === 0 ? "group-root" : `conflict-${index}`, revision: 8, published: index !== 3, variantGroupId: "group-root",
    variantAttributes: [{ name: "Kích thước", value: "800mm" }, { name: "Vật dụng", value: code }],
  })));
  const message = [
    "Tổ hợp thuộc tính bị trùng ở 2 nhóm SKU:",
    "• SKU FC09S-750-B-304, FC09S-800-B-304 cùng có Kích thước: 800mm · Vật dụng: Bát.",
    "• SKU FC09S-750-X-304, FC09S-800-X-304 cùng có Kích thước: 800mm · Vật dụng: Xoang.",
    "Kiểm tra và sửa giá trị của các SKU trên, thêm thuộc tính để phân biệt hoặc tách SKU khỏi nhóm, rồi lưu lại.",
  ].join("\n");
  fixture.writeError(message);
  await page.setViewportSize({ width, height: 1000 });
  await page.goto(`${base}/admin/products/group-root/variants`);
  for (const code of codes) await page.getByLabel(`Vật dụng của ${code}`, { exact: true }).fill(code.includes("-B-") ? "Bát" : "Xoang");
  await page.getByRole("button", { name: "Lưu thiết lập biến thể", exact: true }).click();
  const alert = page.getByRole("alert").filter({ hasText: "Tổ hợp thuộc tính bị trùng" });
  await expect(alert).toBeInViewport({ ratio: 1 });
  await expect(alert.locator("p")).toHaveText(message);
  await expect(alert.locator("p")).toHaveCSS("white-space", "pre-line");
  const create = page.getByRole("link", { name: "Tạo SKU biến thể", exact: true });
  const linkRect = (await create.boundingBox())!, errorRect = (await alert.boundingBox())!;
  expect(errorRect.y).toBeGreaterThan(linkRect.y + linkRect.height);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  for (const code of codes) await expect(page.getByLabel(`Vật dụng của ${code}`, { exact: true })).toHaveValue(code.includes("-B-") ? "Bát" : "Xoang");
  await mkdir("/private/tmp/baotin-variant-conflict-details", { recursive: true });
  await page.screenshot({ path: `/private/tmp/baotin-variant-conflict-details/error-${width}.png` });
  fixture.writeError("");
  for (const code of codes.filter(code => code.includes("-750-"))) await page.getByLabel(`Kích thước của ${code}`, { exact: true }).fill("750mm");
  await page.getByRole("button", { name: "Lưu thiết lập biến thể", exact: true }).click();
  await expect.poll(() => fixture.writes.length).toBe(2);
  await expect(page.getByRole("button", { name: "Lưu thiết lập biến thể", exact: true })).toBeEnabled();
  await expect(alert).toHaveCount(0);
  await expect(page.getByLabel("Kích thước của FC09S-750-B-304", { exact: true })).toHaveValue("750mm");
  expect(fixture.writes).toHaveLength(2); expect(fixture.errors).toEqual([]);
});

for (const width of [1440, 390]) test(`Remove version while keeping sizes with fresh SKU revisions at ${width}px`, async ({ page }) => {
  const fixture = await mockFreshGroup(page);
  await page.setViewportSize({ width, height: 1000 });
  await page.goto(`${base}/admin/products/group-child-700/variants`);
  await expect(page.getByLabel("Tên loại biến thể 1", { exact: true })).toHaveValue("Phiên bản");
  // A concurrent price/content update must not prevent removing a dimension.
  fixture.update("group-child-700", { revision: 15, price: 123456, name: "Tên mới ở phiên khác" });
  await page.getByRole("button", { name: "Xóa loại biến thể 1", exact: true }).click();
  await page.getByRole("button", { name: "Lưu thiết lập biến thể", exact: true }).click();
  await expect.poll(() => fixture.writes.length).toBe(1);
  await expect(page.getByLabel("Tên loại biến thể 1", { exact: true })).toHaveValue("Kích thước");
  await expect(page.getByLabel("Tên loại biến thể 2", { exact: true })).toHaveCount(0);
  expect(fixture.writes[0].products).toEqual([
    { id: "group-root", revision: 7, attributes: [{ name: "Kích thước", value: "600mm" }] },
    { id: "group-child-700", revision: 15, attributes: [{ name: "Kích thước", value: "700mm" }] },
    { id: "group-child-800", revision: 9, attributes: [{ name: "Kích thước", value: "800mm" }] },
  ]);
  const row = fixture.rows().find(product => product.id === "group-child-700")!;
  expect(row.name).toBe("Tên mới ở phiên khác"); expect(row.price).toBe(123456);
  await page.getByLabel("Kích thước của QA-600", { exact: true }).fill("650mm");
  await page.getByRole("button", { name: "Lưu thiết lập biến thể", exact: true }).click();
  await expect.poll(() => fixture.writes.length).toBe(2);
  await expect(page.getByLabel("Kích thước của QA-600", { exact: true })).toHaveValue("650mm");
  expect(fixture.writes[1].products.map(product => product.revision)).toEqual([8, 16, 10]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await mkdir("/private/tmp/baotin-variant-removal", { recursive: true });
  await page.screenshot({ path: `/private/tmp/baotin-variant-removal/sizes-${width}.png`, fullPage: true });
  expect(fixture.errors).toEqual([]);
});

test("A concurrent schema change keeps edits and requires a fresh group before retrying", async ({ page }) => {
  const fixture = await mockFreshGroup(page);
  await page.goto(`${base}/admin/products/group-root/variants`);
  await expect(page.getByLabel("Tên loại biến thể 1", { exact: true })).toHaveValue("Phiên bản");
  fixture.update("group-child-700", { revision: 15, variantAttributes: [{ name: "Phiên bản", value: "QA-700" }, { name: "Kích thước", value: "750mm" }] });
  await page.getByRole("button", { name: "Xóa loại biến thể 1", exact: true }).click();
  await page.getByRole("button", { name: "Lưu thiết lập biến thể", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Các thuộc tính hoặc danh sách SKU trong nhóm đã thay đổi" })).toBeVisible();
  expect(fixture.writes).toHaveLength(0);
  await expect(page.getByLabel("Tên loại biến thể 1", { exact: true })).toHaveValue("Kích thước");
  await page.getByRole("button", { name: "Tải lại nhóm biến thể", exact: true }).click();
  await page.getByRole("dialog", { name: "Bỏ thay đổi chưa lưu?", exact: true }).getByRole("button", { name: "Bỏ thay đổi", exact: true }).click();
  await expect(page.getByLabel("Tên loại biến thể 1", { exact: true })).toHaveValue("Phiên bản");
  await expect(page.getByLabel("Kích thước của QA-700", { exact: true })).toHaveValue("750mm");
  await page.getByRole("button", { name: "Xóa loại biến thể 1", exact: true }).click();
  await page.getByRole("button", { name: "Lưu thiết lập biến thể", exact: true }).click();
  await expect.poll(() => fixture.writes.length).toBe(1);
  expect(fixture.writes[0].products[1]).toEqual({ id: "group-child-700", revision: 15, attributes: [{ name: "Kích thước", value: "750mm" }] });
  expect(fixture.errors).toEqual([]);
});

test("Group read failures never expose the cached form and can be retried", async ({ page }) => {
  const fixture = await mockFreshGroup(page);
  fixture.readError("Không thể tải nhóm mới nhất");
  await page.goto(`${base}/admin/products/group-root/variants`);
  await expect(page.getByRole("alert").filter({ hasText: "Không thể tải nhóm mới nhất" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Lưu thiết lập biến thể", exact: true })).toHaveCount(0);
  fixture.readError("");
  await page.getByRole("button", { name: "Thử lại", exact: true }).click();
  await expect(page.getByLabel("Tên loại biến thể 1", { exact: true })).toHaveValue("Phiên bản");
  expect(fixture.writes).toHaveLength(0); expect(fixture.errors).toEqual([]);
});

test("A revision race at save time preserves the unsaved removal", async ({ page }) => {
  const fixture = await mockFreshGroup(page);
  fixture.writeError("Một SKU đã được cập nhật ở phiên khác. Tải lại trước khi lưu.");
  await page.goto(`${base}/admin/products/group-root/variants`);
  await page.getByRole("button", { name: "Xóa loại biến thể 1", exact: true }).click();
  await page.getByRole("button", { name: "Lưu thiết lập biến thể", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Một SKU đã được cập nhật ở phiên khác" })).toBeVisible();
  await expect(page.getByLabel("Tên loại biến thể 1", { exact: true })).toHaveValue("Kích thước");
  await expect(page.getByLabel("Kích thước của QA-700", { exact: true })).toHaveValue("700mm");
  expect(fixture.writes).toHaveLength(1); expect(fixture.errors).toEqual([]);
});

for (const width of [1440, 390]) test(`Removing types updates every related SKU including equal sizes at ${width}px`, async ({ page }) => {
  const fixture = await mockFreshGroup(page);
  fixture.update("group-child-700", { variantAttributes: [{ name: "Phiên bản", value: "QA-700" }, { name: "Kích thước", value: "600mm" }] });
  await page.setViewportSize({ width, height: 1000 });
  await page.goto(`${base}/admin/products/group-child-700/variants`);
  await expect(page.getByText(/áp dụng cho toàn bộ 3 SKU/)).toBeVisible();
  await page.getByRole("button", { name: "Xóa loại biến thể 1", exact: true }).click();
  await page.getByRole("button", { name: "Lưu thiết lập biến thể", exact: true }).click();
  await expect.poll(() => fixture.writes.length).toBe(1);
  await expect(page.getByLabel("Tên loại biến thể 1", { exact: true })).toHaveValue("Kích thước");
  for (const product of fixture.rows()) {
    expect(product.variantAttributes?.map(attribute => attribute.name)).toEqual(["Kích thước"]);
    await page.goto(`${base}/admin/products/${product.id}/variants`);
    await expect(page.getByLabel("Tên loại biến thể 1", { exact: true })).toHaveValue("Kích thước");
    await expect(page.getByLabel("Tên loại biến thể 2", { exact: true })).toHaveCount(0);
  }
  await page.getByRole("button", { name: "Xóa loại biến thể 1", exact: true }).click();
  await expect(page.getByRole("button", { name: "Lưu thiết lập biến thể", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Lưu thiết lập biến thể", exact: true }).click();
  await expect.poll(() => fixture.writes.length).toBe(2);
  await expect(page.getByText(/Nhóm không còn loại biến thể/)).toBeVisible();
  for (const product of fixture.rows()) {
    expect(product.variantAttributes).toEqual([]);
    expect(product.variantGroupId).toBe("group-root");
    await page.goto(`${base}/admin/products/${product.id}/variants`);
    await expect(page.getByText(/Nhóm không còn loại biến thể/)).toBeVisible();
    await expect(page.getByLabel("Tên loại biến thể 1", { exact: true })).toHaveCount(0);
    for (const code of ["QA-600", "QA-700", "QA-800"]) await expect(page.getByRole("rowheader", { name: code, exact: true })).toBeVisible();
  }
  expect(fixture.writes[1].products.every(product => product.attributes.length === 0)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await mkdir("/private/tmp/baotin-variant-removal", { recursive: true });
  await page.screenshot({ path: `/private/tmp/baotin-variant-removal/all-types-removed-${width}.png`, fullPage: true });
  expect(fixture.errors).toEqual([]);
});

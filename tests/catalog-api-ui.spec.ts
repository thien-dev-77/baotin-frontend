import { expect, test, type Page } from "@playwright/test";
import { catalog, categoryCatalog, getCatalogBrands, money } from "../lib/catalog";
import { previewCatalogPage } from "../lib/catalog-query";
import type { Order, Product, SessionUser } from "../lib/types";
import { readFile } from "node:fs/promises";

const base = process.env.QA_BASE_URL || "http://127.0.0.1:3010";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname)) throw new Error("Catalog UI QA only targets localhost.");
const newBrand = "Mộc & Kim+";
const newProduct: Product = { ...catalog[0], id: "QA-ADMIN-SKU", code: "QA-ADMIN-CODE", slug: "qa-admin-sku", name: "Phụ kiện mới tạo từ admin", brand: newBrand, stock: 2, price: 250000, customerPrice: 230000, oldPrice: undefined };
const updatedProduct: Product = { ...catalog[0], name: "Tên sản phẩm đã cập nhật qua API", brand: "API Other Brand", image: catalog[1].image, stock: 4, price: 60000, customerPrice: 55000, oldPrice: undefined };
const recommended: Product = { ...newProduct, id: "QA-ACCESSORY", code: "QA-ACCESSORY", slug: "qa-accessory", name: "Phụ kiện gợi ý từ API", stock: 8 };
const soldOut: Product = { ...newProduct, id: "QA-SOLD-OUT", code: "QA-SOLD-OUT", slug: "qa-sold-out", name: "Sản phẩm API đã hết hàng", brand: updatedProduct.brand, stock: 0 };
const products = [newProduct, updatedProduct, recommended, soldOut];
const user: SessionUser = { id: "qa-b2b", name: "Khách QA", email: "qa@example.test", role: "b2b", branches: ["Quy Nhơn"], customer: { id: "QA-CUSTOMER", name: "Khách QA", company: "Xưởng QA", email: "qa@example.test", phone: "0901234567", role: "b2b", status: "active", creditLimit: 0, debt: 0 } };
const items = [
  { productId: newProduct.id, quantity: 5, unitPrice: 10000 },
  { productId: updatedProduct.id, quantity: 1, unitPrice: 20000 },
  { productId: "QA-PRIVATE-OLD-SKU", quantity: 2, unitPrice: 30000 },
  { productId: soldOut.id, quantity: 3, unitPrice: 40000 },
];
const order: Order = {
  id: "QA-ORDER", customerId: user.customer!.id, date: "2026-10-08T03:00:00Z", status: "Đã giao", b2b: true, items,
  subtotal: items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0), shipping: 0, discount: 0,
  total: items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
  customer: { name: "Khách QA", phone: "0901234567", email: "qa@example.test", address: "Địa chỉ kiểm thử", city: "Gia Lai", district: "Quy Nhơn", ward: "Quy Nhơn" },
  delivery: "Nhận tại cửa hàng", payment: "Chuyển khoản", note: "",
};

async function mockApi(page: Page, currentOrder = order, currentProducts = products, bootstrapProducts = currentProducts) {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.context().route("**/api/backend/**", async route => {
    const url = new URL(route.request().url());
    const path = url.pathname.slice("/api/backend".length);
    const responses: Record<string, unknown> = {
      "/auth/session": { user },
      "/catalog/bootstrap": { products: bootstrapProducts, categories: categoryCatalog, brands: getCatalogBrands(currentProducts) },
      "/catalog": { products: currentProducts, categories: categoryCatalog },
      "/catalog/search": previewCatalogPage(currentProducts, categoryCatalog, url.searchParams, user.customer),
      "/catalog/selection": { products: currentProducts.filter(product => url.searchParams.getAll("ids").includes(product.id) || product.code.toLowerCase() === url.searchParams.get("code")?.toLowerCase()) },
      "/orders": [currentOrder],
      "/account": { favorites: [] },
      "/account/frequently-bought": { products: [] },
      "/notifications/count": { unreadCount: 0 },
    };
    if (!(path in responses) || route.request().method() !== "GET") {
      errors.push(`Unexpected request: ${route.request().method()} ${path}`);
      await route.fulfill({ status: 500, json: { message: "Unexpected QA request" } });
      return;
    }
    await route.fulfill({ json: responses[path] });
  });
  return () => expect(errors).toEqual([]);
}

async function capture(page: Page, view: string, width: number) {
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.screenshot({ path: `/private/tmp/baotin-api-wiring-${view}-${width}.png`, fullPage: true, animations: "disabled" });
}

for (const width of [1440, 768, 390, 320]) {
  test(`API products drive order details, reorder, recommendations and brands at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width > 1000 ? 1000 : 844 });
    const check = await mockApi(page);
    await page.goto(`${base}/account/orders/${order.id}`);
    const lines = page.getByRole("region", { name: "Sản phẩm trong đơn hàng", exact: true });
    await expect(lines.getByRole("link", { name: newProduct.name, exact: true })).toBeVisible();
    await expect(lines.getByRole("link", { name: updatedProduct.name, exact: true })).toBeVisible();
    await expect(lines.locator("img").nth(1)).toHaveAttribute("data-image-src", updatedProduct.image);
    await expect(lines.getByText("Sản phẩm QA-PRIVATE-OLD-SKU", { exact: true })).toBeVisible();
    await expect(lines.getByText(money(60000), { exact: true })).toBeVisible();
    await expect(lines.getByText("Hiện chưa thể mua lại.", { exact: true })).toHaveCount(2);
    await expect(lines.getByText(money(50000), { exact: true })).toBeVisible();
    await expect(lines.getByText(catalog[0].name, { exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await capture(page, "order", width);

    await page.getByRole("button", { name: "Đặt lại đơn này", exact: true }).click();
    await expect(page).toHaveURL(`${base}/cart`);
    await expect(page.getByRole("spinbutton", { name: newProduct.name, exact: true })).toHaveValue("2");
    await expect(page.getByRole("spinbutton", { name: updatedProduct.name, exact: true })).toHaveValue("1");
    const suggestions = page.getByRole("region", { name: "Sản phẩm gợi ý", exact: true });
    await expect(suggestions.locator(".bt-product-card")).toHaveCount(1);
    await expect(suggestions.getByRole("link", { name: recommended.name, exact: true }).last()).toBeVisible();
    await expect(suggestions.getByRole("link", { name: newProduct.name, exact: true })).toHaveCount(0);
    await expect(page.getByRole("spinbutton", { name: soldOut.name, exact: true })).toHaveCount(0);
    await expect(page.getByText(money(newProduct.customerPrice! * 2 + updatedProduct.customerPrice!), { exact: true }).first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await capture(page, "cart", width);

    await page.goto(`${base}/search`);
    if (width < 1024) await page.getByRole("button", { name: /^Bộ lọc/ }).click();
    const filters = width < 1024 ? page.getByRole("dialog", { name: "Lọc sản phẩm" }) : page.locator("main aside");
    await filters.getByRole("checkbox", { name: newBrand, exact: true }).check();
    if (width < 1024) await page.getByRole("button", { name: "Xem 2 sản phẩm", exact: true }).click();
    await expect(page.locator(".bt-product-card")).toHaveCount(2);
    await page.getByRole("tab", { name: "Thương hiệu", exact: true }).click();
    await expect(page.getByRole("link", { name: newBrand, exact: true })).toHaveAttribute("href", "/brand/moc-kim");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await capture(page, "brands", width);
    const search = page.locator("header").getByRole("combobox", { name: "Tìm sản phẩm, mã hàng, thương hiệu" });
    await search.click();
    const searchInput = width < 640 ? page.getByRole("dialog", { name: "Tìm kiếm sản phẩm" }).getByRole("combobox") : search;
    await searchInput.fill(newBrand);
    const suggestionsList = page.getByRole("listbox", { name: "Gợi ý tìm kiếm" });
    await expect(suggestionsList.getByRole("option", { name: newBrand, exact: true })).toHaveAttribute("href", "/brand/moc-kim");
    check();
  });
}

test("Unavailable order lines stay visible and cannot be reordered", async ({ page }) => {
  const unavailableOrder = { ...order, items: order.items.slice(2) };
  const check = await mockApi(page, unavailableOrder);
  await page.goto(`${base}/account/orders/${order.id}`);
  await expect(page.getByText("Sản phẩm QA-PRIVATE-OLD-SKU", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Đặt lại đơn này", exact: true })).toBeDisabled();
  const lines = page.getByRole("region", { name: "Sản phẩm trong đơn hàng", exact: true });
  await expect(lines.getByText("Hiện chưa thể mua lại.", { exact: true })).toHaveCount(2);
  check();
});

test("An empty API catalog does not restore mock recommendations or brands", async ({ page }) => {
  const check = await mockApi(page, order, []);
  await page.goto(`${base}/search`);
  await expect(page.getByText("Không tìm thấy sản phẩm phù hợp", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Thương hiệu", exact: true }).click();
  await expect(page.getByText("Không tìm thấy thương hiệu", { exact: true })).toBeVisible();
  await page.goto(`${base}/cart`);
  await expect(page.getByRole("region", { name: "Sản phẩm gợi ý", exact: true })).toHaveCount(0);
  check();
});

test("Order snapshots survive renames and private products without changing old totals", async ({ page }) => {
  const snapshot = { name: "Tên lúc đặt đơn", code: "OLD-CODE", slug: "old-slug", image: catalog[2].image, unit: "bộ cũ" };
  const historical = { ...order, items: [
    { ...order.items[1], snapshot },
    { ...order.items[2], snapshot: { ...snapshot, name: "Sản phẩm đã chuyển riêng tư" } },
  ] };
  const check = await mockApi(page, historical, products, []);
  await page.goto(`${base}/account/orders/${order.id}`);
  const lines = page.getByRole("region", { name: "Sản phẩm trong đơn hàng", exact: true });
  await expect(lines.getByRole("link", { name: snapshot.name, exact: true })).toHaveAttribute("href", `/products/${updatedProduct.slug}`);
  await expect(lines.locator("img").first()).toHaveAttribute("data-image-src", snapshot.image);
  await expect(lines.getByText("Mã: OLD-CODE · SL: 1 bộ cũ", { exact: true })).toBeVisible();
  await expect(lines.getByText("Sản phẩm đã chuyển riêng tư", { exact: true })).toBeVisible();
  await expect(lines.getByRole("link", { name: "Sản phẩm đã chuyển riêng tư", exact: true })).toHaveCount(0);
  await expect(lines.getByText(money(20000), { exact: true })).toBeVisible();
  await expect(lines.getByText(updatedProduct.name, { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Đặt lại đơn này", exact: true }).click();
  await expect(page).toHaveURL(`${base}/cart`);
  await expect(page.getByRole("spinbutton", { name: updatedProduct.name, exact: true })).toHaveValue("1");
  check();
});

const pagedProducts = Array.from({ length: 27 }, (_, index): Product => ({ ...newProduct,
  id: `QA-PAGE-${index}`, slug: `qa-page-${index}`, code: `QA-PAGE-${index}`,
  name: `Sản phẩm phân trang ${index + 1}`, price: 10000 + index * 1000, customerPrice: 9000 + index * 1000, stock: 8,
}));

for (const width of [1440, 768, 390, 320]) {
  test(`Paginated API products outside bootstrap render and retain URL filters at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width > 1000 ? 1000 : 844 });
    const check = await mockApi(page, order, pagedProducts, []);
    await page.goto(`${base}/search`);
    await expect(page.locator(".bt-product-card")).toHaveCount(12);
    await expect(page.locator(".bt-product-card").first()).toContainText(pagedProducts[0].name);
    await page.getByRole("button", { name: "Sau", exact: true }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(page.locator(".bt-product-card").first()).toContainText(pagedProducts[12].name);
    await expect(page.getByText("Trang 2 / 3", { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.locator(".bt-product-card").first()).toContainText(pagedProducts[12].name);
    await page.getByRole("combobox", { name: "Sắp xếp sản phẩm" }).selectOption("high");
    await expect(page).not.toHaveURL(/page=2/);
    await expect(page).toHaveURL(/sort=high/);
    await expect(page.locator(".bt-product-card").first()).toContainText(pagedProducts[26].name);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await capture(page, "paged", width);
    check();
  });
}

test("Exact-code quick order finds a product not included in bootstrap", async ({ page }) => {
  const check = await mockApi(page, order, pagedProducts, []);
  await page.goto(`${base}/account/products`);
  await page.locator('input[name="code"]').fill(pagedProducts[26].code);
  await page.locator('input[name="quantity"]').fill("2");
  await page.getByRole("button", { name: "Thêm vào giỏ", exact: true }).click();
  await page.goto(`${base}/cart`);
  await expect(page.getByRole("spinbutton", { name: pagedProducts[26].name, exact: true })).toHaveValue("2");
  check();
});

test("Changing pages retains product rows while the server navigation is pending", async ({ page }) => {
  const check = await mockApi(page, order, pagedProducts, []);
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route(url => url.origin === new URL(base).origin && url.pathname === "/search", async route => {
    if (new URL(route.request().url()).searchParams.get("page") === "2") await pending;
    await route.continue();
  });
  try {
    await page.goto(`${base}/search`);
    await expect(page.locator(".bt-product-card").first()).toContainText(pagedProducts[0].name);
    const navigation = page.getByRole("button", { name: "Sau", exact: true }).click();
    const results = page.getByRole("region", { name: "Kết quả sản phẩm", exact: true });
    await expect(results).toHaveAttribute("aria-busy", "true");
    await expect(results.locator(".bt-product-card")).toHaveCount(12);
    await expect(results.locator(".bt-product-card").first()).toContainText(pagedProducts[0].name);
    await expect(page.getByText("Đang cập nhật sản phẩm…", { exact: true })).toBeVisible();
    release();
    await navigation;
    await expect(results.locator(".bt-product-card").first()).toContainText(pagedProducts[12].name);
    check();
  } finally { release(); }
});

test("Catalog browsing is paginated, while explicit CSV and print include all SKUs", async ({ page }) => {
  const all = Array.from({ length: 78 }, (_, index): Product => ({ ...newProduct, id: `QA-EXPORT-${index}`, code: `QA-EXPORT-${index}`, slug: `qa-export-${index}`, name: `Catalog SKU ${index}` }));
  const check = await mockApi(page, order, all, []);
  let exports = 0;
  page.on("request", request => { if (new URL(request.url()).pathname === "/api/backend/catalog") exports++; });
  await page.goto(`${base}/catalog`);
  await expect(page.locator("main tbody tr")).toHaveCount(60);
  await expect(page.getByText("Trang 1 / 2", { exact: true })).toBeVisible();
  expect(exports).toBe(0);
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Tải CSV", exact: true }).click();
  const download = await downloading;
  const csv = await readFile((await download.path())!, "utf8");
  for (const product of all) expect(csv).toContain(product.code);
  expect(exports).toBe(1);
  await page.evaluate(() => {
    const target = window as Window & { qaPrintedRows?: number };
    window.print = () => { target.qaPrintedRows = document.querySelectorAll("main tbody tr").length; window.dispatchEvent(new Event("afterprint")); };
  });
  await page.getByRole("button", { name: "In / Tải PDF", exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as Window & { qaPrintedRows?: number }).qaPrintedRows)).toBe(78);
  await expect(page.locator("main tbody tr")).toHaveCount(60);
  expect(exports).toBe(2);
  check();
});

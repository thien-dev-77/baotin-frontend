import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { catalog, categoryCatalog, money } from "../lib/catalog";
import { previewCatalogPage } from "../lib/catalog-query";
import type { Product, SessionUser } from "../lib/types";

const base = process.env.QA_BASE_URL || "http://127.0.0.1:3010";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname)) throw new Error("Card QA requires a local frontend.");
const buyer: SessionUser = { id: "qa-card-user", email: "cards@example.test", name: "QA Cards", role: "b2b", branches: ["Quy Nhơn"], customer: { id: "qa-card-customer", email: "cards@example.test", name: "QA Cards", phone: "0901234567", company: "QA", role: "b2b", status: "active" } };
const categories = [categoryCatalog.find(item => item.slug === "khoa")!, categoryCatalog[0], { ...categoryCatalog[1], visible: false }];
const products: Product[] = [
  ...catalog.filter(item => item.category === "khoa" && item.subcategory === "Khóa điện tử").slice(-5).map((product, index) => ({
    ...product, listPrice: 16000000, b2cDiscount: 20, customerPrice: 12800000, price: 12800000, oldPrice: 16000000,
    name: index === 0 ? "Khóa nhận diện khuôn mặt cửa nhôm IBC T06 cao cấp chống nước" : product.name,
    material: "Hợp kim", color: "Đen", size: "", variantAttributes: [{ name: "Mở khóa", value: "Vân tay" }, { name: "Kết nối", value: "Ứng dụng" }],
    reviewSummary: { rating: index === 0 ? 4.5 : 0, count: index === 0 ? 2 : 0 },
  })),
  ...catalog.filter(item => item.category === "phu-kien-bep").slice(0, 5).map(product => ({ ...product, reviewSummary: { rating: 0, count: 0 } })),
];

async function mockCards(page: Page, customer = buyer) {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  const calls: string[] = [];
  await page.route("**/api/backend/**", async route => {
    const url = new URL(route.request().url());
    const path = url.pathname.slice("/api/backend".length);
    calls.push(path);
    const responses: Record<string, unknown> = {
      "/auth/session": { user: customer }, "/catalog/bootstrap": { products, categories },
      "/catalog/selection": { products: products.filter(product => url.searchParams.getAll("ids").includes(product.id)) },
      "/catalog/search": previewCatalogPage(products, categories, url.searchParams, customer.customer),
      "/orders": [], "/account": { favorites: [] }, "/notifications/count": { unreadCount: 0 },
      "/account/preferences": { favorites: JSON.parse(route.request().postData() || "{}").favorites || [] },
    };
    if (!(path in responses)) errors.push(`Unexpected request: ${path}`);
    await route.fulfill({ json: responses[path] || [] });
  });
  return { calls, check: () => expect(errors).toEqual([]) };
}

for (const [width, columns] of [[1440, 5], [1024, 5], [768, 3], [390, 2], [320, 2]]) {
  test(`Reference product cards and banner-free category sections at ${width}px`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, isMobile: width < 1024, hasTouch: width < 1024 });
    try {
      const page = await context.newPage();
      const api = await mockCards(page);
      await page.goto(base);
      await expect(page.locator("[data-category-products]")).toHaveCount(2);
      const section = page.locator("[data-category-products]").first();
      await expect(section.getByRole("heading", { name: "Khóa", exact: true })).toBeVisible();
      await expect(section.locator(".bt-category-product-banner")).toHaveCount(0);
      await expect(section.getByRole("link", { name: "Xem tất cả", exact: true })).toHaveAttribute("href", "/category/khoa");
      await expect(section.getByRole("link", { name: "Khóa điện tử", exact: true })).toHaveAttribute("href", `/category/khoa?subcategory=${encodeURIComponent("Khóa điện tử")}`);
      const cards = section.locator(".bt-product-card");
      await expect(cards).toHaveCount(5);
      const card = cards.first();
      await card.scrollIntoViewIfNeeded();
      await page.evaluate(() => document.fonts.ready);
      const media = card.locator(".bt-product-card-media");
      const title = card.locator(".bt-product-card-title");
      await expect(title).toHaveCSS("font-weight", "400");
      expect(await title.evaluate(element => { const spacing = getComputedStyle(element).letterSpacing; return spacing === "normal" || Number.parseFloat(spacing) === 0; })).toBe(true);
      await expect(title).toHaveCSS("-webkit-line-clamp", "2");
      await expect(title).toHaveAttribute("title", products[0].name);
      expect(await title.evaluate(element => element.clientHeight <= Number.parseFloat(getComputedStyle(element).lineHeight) * 2)).toBe(true);
      const image = media.locator("img");
      await expect(image).toHaveAttribute("loading", "lazy");
      await expect(image).toHaveCSS("object-fit", "contain");
      await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBe(true);
      await expect(card.locator(".bt-product-card-discount")).toHaveText("GIẢM-20%");
      await expect(card.locator(".bt-product-card-discount")).toHaveCSS("background-color", "rgb(255, 196, 0)");
      await expect(card.locator(".bt-product-card-discount")).toHaveCSS("color", "rgb(23, 23, 23)");
      await expect(card.locator("del")).toHaveText(money(16000000));
      await expect(card.locator(".bt-price-amount")).toHaveText(money(12800000));
      await expect(card.locator(".bt-price-amount")).toHaveCSS("color", "rgb(23, 23, 23)");
      await expect(card.locator(".bt-product-card-reviews")).toContainText("2 đánh giá");
      await expect(card.locator(".bt-product-card-star").last().locator("span")).toHaveAttribute("style", "width: 50%;");
      await expect(card.getByRole("list", { name: "Thuộc tính sản phẩm" })).toContainText("Vân tay");
      await expect(card.getByRole("list", { name: "Thuộc tính sản phẩm" })).toContainText("Ứng dụng");
      await expect(card.getByRole("button", { name: /Thêm.*giỏ/ })).toHaveCount(0);
      const details = card.locator(".bt-product-card-details");
      await expect(details).toHaveText("Xem chi tiết");
      await expect(details).toHaveAttribute("aria-label", `Xem chi tiết - ${products[0].name}`);
      await expect(details).toHaveAttribute("href", `/products/${products[0].slug}`);
      await expect(details).toHaveCSS("font-weight", "400");
      await expect(details).toHaveCSS("font-size", "15px");
      await expect(details).toHaveCSS("border-radius", "6px");
      await expect(details.locator("svg")).toHaveAttribute("width", "18");
      await expect(details.locator("svg")).toHaveAttribute("stroke-width", "1.6");
      if (width >= 1024) {
        await media.hover();
        await expect(details).toHaveCSS("opacity", "1");
        const area = (await media.boundingBox())!;
        const button = (await details.boundingBox())!;
        expect(Math.abs(button.x - area.x - 6)).toBeLessThan(1);
        expect(Math.abs(area.width - button.width - 12)).toBeLessThan(1);
        expect(Math.abs(area.y + area.height - button.y - button.height - 6)).toBeLessThan(1);
        expect(button.height).toBe(44);
        const favorite = (await card.locator(".bt-product-card-favorite").boundingBox())!;
        expect(favorite.y + favorite.height).toBeLessThanOrEqual(button.y - 4);
        await expect(details).toHaveCSS("background-color", "rgb(255, 196, 0)");
        await expect(details).toHaveCSS("color", "rgb(23, 23, 23)");
        await details.hover();
        await expect(details).toHaveCSS("background-color", "rgb(229, 176, 0)");
        const contentBefore = await card.locator(".bt-product-card-content").boundingBox();
        await page.mouse.move(0, 0);
        await expect(details).toHaveCSS("opacity", "0");
        expect(await card.locator(".bt-product-card-content").boundingBox()).toEqual(contentBefore);
        await media.locator(".bt-product-card-image-link").focus();
        await expect(details).toHaveCSS("opacity", "1");
      } else {
        await media.hover();
        await expect(details).toBeHidden();
        await media.locator(".bt-product-card-image-link").focus();
        await expect(details).toBeHidden();
      }
      await card.getByRole("button", { name: /^Yêu thích / }).click();
      await expect(card.getByRole("button", { name: /^Bỏ yêu thích / })).toHaveAttribute("aria-pressed", "true");
      await expect(card.getByRole("button", { name: /^Bỏ yêu thích / })).toHaveCSS("color", "rgb(255, 196, 0)");
      expect(await section.locator(".bt-category-product-row").evaluate(element => getComputedStyle(element).gridTemplateColumns.split(" ").length)).toBe(columns);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      expect(await cards.evaluateAll(elements => elements.every(element => element.scrollWidth <= element.clientWidth + 1))).toBe(true);
      expect(api.calls.filter(path => path.startsWith("/reviews/"))).toEqual([]);
      await mkdir("/private/tmp/baotin-reference-cards", { recursive: true });
      await section.screenshot({ path: `/private/tmp/baotin-reference-cards/category-${width}.png`, animations: "disabled", style: "header { visibility: hidden; } nextjs-portal { display: none; }" });
      api.check();
    } finally { await context.close(); }
  });
}

test("The same product card layout is used in catalog grid and list views", async ({ page }) => {
  const api = await mockCards(page);
  await page.goto(`${base}/search`);
  const card = page.locator(".bt-product-card").filter({ hasText: products[0].code });
  await expect(card.locator(".bt-product-card-title")).toHaveText(products[0].name);
  await expect(card.locator(".bt-product-card-image-link img")).toHaveCSS("object-fit", "contain");
  await page.getByRole("button", { name: "Dạng danh sách", exact: true }).click();
  await expect(card).toHaveClass(/bt-product-card--list/);
  const media = card.locator(".bt-product-card-media");
  const details = card.locator(".bt-product-card-details");
  await media.hover();
  await expect(details).toHaveCSS("opacity", "1");
  const area = (await media.boundingBox())!;
  const button = (await details.boundingBox())!;
  expect(Math.abs(area.width - button.width - 12)).toBeLessThan(1);
  expect(Math.abs(area.y + area.height - button.y - button.height - 6)).toBeLessThan(1);
  expect(await details.locator("span").evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  expect(await card.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  api.check();
});

test("Product card hover respects reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const api = await mockCards(page);
  await page.goto(`${base}/search`);
  const card = page.locator(".bt-product-card").filter({ hasText: products[0].code });
  await card.locator(".bt-product-card-media").hover();
  await expect(card.locator(".bt-product-card-details")).toHaveCSS("opacity", "1");
  await expect(card.locator(".bt-product-card-details")).toHaveCSS("transition-property", "none");
  await expect(card.locator(".bt-product-card-favorite")).toHaveCSS("transition-property", "none");
  api.check();
});

test("Bottom hover link opens real API product details without adding a cart line", async ({ page, request }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const response = await request.get(`${base}/api/backend/catalog/bootstrap`);
  expect(response.ok()).toBe(true);
  const result = await response.json() as { products: Product[] };
  const product = result.products.find(product => product.featured)!;
  expect(product).toBeTruthy();
  await page.goto(base);
  const card = page.locator("[data-product-showcase] .bt-product-card").filter({ hasText: `Mã: ${product.code}` });
  await card.locator(".bt-product-card-media").hover();
  const details = card.getByRole("link", { name: `Xem chi tiết - ${product.name}`, exact: true });
  await expect(details).toHaveCSS("opacity", "1");
  await details.click();
  await expect(page).toHaveURL(`${base}/products/${product.slug}`);
  await expect(page.getByRole("heading", { level: 1, name: product.name, exact: true })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("baotin-commerce-api-v1") || "{}").cart || [])).toEqual([]);
});

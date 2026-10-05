import { chromium, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

const base = process.env.QA_BASE_URL || "http://localhost:3010";
const directory = "/tmp/bao-tin-ui-qa/product-cards";
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {}) });
const issues = [];

async function inspectCard(page, card, touch, screenshot) {
  await expect(card).toBeVisible();
  await card.evaluate((element) => window.scrollTo({ top: element.getBoundingClientRect().top + scrollY - document.querySelector("header").getBoundingClientRect().height - 20, behavior: "instant" }));
  const media = card.locator(".bt-product-card-media");
  const image = media.locator("img");
  const details = media.locator(".bt-product-card-details");
  await image.evaluate((element) => element.decode());
  await expect(image).toHaveCSS("object-fit", "cover");
  expect(await media.evaluate((element) => {
    const image = element.querySelector("img");
    return image.clientWidth === element.clientWidth && image.clientHeight === element.clientHeight;
  })).toBe(true);
  await expect(card.getByRole("button", { name: /^Thêm .* vào giỏ/ })).toHaveCount(0);
  await expect(details).toHaveText("Xem sản phẩm");
  await expect(details).toHaveAttribute("aria-label", /^Xem sản phẩm - /);
  await expect(details).toHaveAttribute("href", /\/products\//);
  if (!touch) {
    await page.mouse.move(0, 0);
    await expect(details).toHaveCSS("opacity", "0");
    await media.locator(".bt-product-card-image-link").focus();
    await expect(details).toHaveCSS("opacity", "1");
    await page.keyboard.press("Tab");
    await expect(details).toBeFocused();
    await page.evaluate(() => document.activeElement.blur());
    await card.locator(":scope > div:last-child").hover();
    await expect(details).toHaveCSS("opacity", "0");
    await media.hover();
    await expect(details).toHaveCSS("opacity", "1");
    const area = await media.boundingBox();
    const button = await details.boundingBox();
    expect(Math.abs(button.x + button.width / 2 - area.x - area.width / 2)).toBeLessThan(1);
    expect(Math.abs(button.y + button.height / 2 - area.y - area.height / 2)).toBeLessThan(1);
    expect(button.height).toBeGreaterThanOrEqual(44);
    expect(button.width).toBeLessThanOrEqual(area.width);
    expect(await details.locator("span").evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  } else {
    await media.hover();
    await expect(details).toBeHidden();
    await expect(details).toHaveCSS("display", "none");
    await media.locator(".bt-product-card-image-link").focus();
    await expect(details).toBeHidden();
    await page.keyboard.press("Tab");
    await expect(card.getByRole("button", { name: /yêu thích/i })).toBeFocused();
  }
  expect(await card.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  expect(await card.locator(".bt-price-amount").evaluate((element) => element.getBoundingClientRect().width <= element.parentElement.clientWidth)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  if (screenshot) await card.screenshot({ path: `${directory}/${screenshot}.png` });
}

try {
  for (const [width, height, columns, touch] of [[1440, 1000, 5, false], [1280, 900, 5, false], [1024, 900, 5, false], [768, 1024, 3, true], [390, 844, 2, true], [320, 812, 2, true]]) {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: touch });
    try {
      const page = await context.newPage();
      page.on("pageerror", (error) => issues.push(error.message));
      await page.goto(base);
      await expect(page.locator("header[aria-busy]")).toHaveAttribute("aria-busy", "false");
      await page.evaluate(() => document.fonts.ready);
      await expect(page.getByRole("region", { name: "Danh sách sản phẩm", exact: true })).toHaveCount(0);
      const home = page.locator(".grid-flow-col").first();
      await expect(home.locator(".bt-product-card")).toHaveCount(10);
      if (!touch) {
        const carousel = page.locator(".grid-flow-col").first();
        const track = await carousel.boundingBox();
        const card = await carousel.locator(".bt-product-card").first().boundingBox();
        expect(Math.abs(card.width * 5 + 48 - track.width)).toBeLessThan(1);
      }
      const first = home.locator(".bt-product-card").first();
      await inspectCard(page, first, touch, `${width}-home-hover`);
      await first.getByRole("button", { name: /^Yêu thích / }).click();
      await expect(first.getByRole("button", { name: /^Bỏ yêu thích / })).toHaveAttribute("aria-pressed", "true");
      await first.locator(touch ? ".bt-product-card-image-link" : ".bt-product-card-details").click();
      await expect(page).toHaveURL(`${base}/products/ban-le-giam-chan-hafele`);
      await expect(page.getByRole("heading", { level: 1 })).toContainText("Bản lề");
      await page.getByRole("spinbutton", { name: "Số lượng", exact: true }).fill("2");
      await page.getByRole("button", { name: "Thêm vào giỏ hàng", exact: true }).click();
      await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("baotin-commerce-v1")).cart[0]?.quantity)).toBe(2);
      await inspectCard(page, page.getByRole("region", { name: "Danh sách sản phẩm liên quan", exact: true }).locator(".bt-product-card").first(), touch, `${width}-related-row`);
      for (const [name, route] of [["category", "/category/phu-kien-bep"], ["locks", "/category/khoa"], ["search", "/search?q=ray%20450"], ["brand", "/brand/hafele"], ["promotion", "/promotions"], ["wishlist", "/wishlist"]]) {
        await page.goto(`${base}${route}`);
        await expect(page.locator("header[aria-busy]")).toHaveAttribute("aria-busy", "false");
        expect(await page.locator(".bt-product-card").first().evaluate((element) => getComputedStyle(element.parentElement).gridTemplateColumns.split(" ").length)).toBe(columns);
        expect(await page.locator(".bt-product-card .bt-price-amount").evaluateAll((elements) => elements.every((element) => element.getBoundingClientRect().width <= element.parentElement.clientWidth))).toBe(true);
        if (name === "category") {
          const rows = await page.locator(".bt-product-card").evaluateAll((cards) => {
            const counts = {};
            for (const card of cards) {
              const top = Math.round(card.getBoundingClientRect().top);
              counts[top] = (counts[top] || 0) + 1;
            }
            return Object.values(counts);
          });
          expect(rows).toEqual(Array.from({ length: Math.ceil(12 / columns) }, (_, index) => Math.min(columns, 12 - index * columns)));
        }
        await inspectCard(page, page.locator(".bt-product-card").first(), touch, `${width}-${name}`);
      }
      await page.goto(`${base}/category/ban-le`);
      if (!touch) {
        await page.getByRole("button", { name: "Dạng danh sách", exact: true }).click();
        await inspectCard(page, page.locator(".bt-product-card").first(), false, `${width}-catalog-list`);
      }
      await page.goto(base);
      const soldOut = home.locator(".bt-product-card").nth(9);
      await inspectCard(page, soldOut, touch);
      await expect(soldOut.getByText("Tạm hết hàng", { exact: true })).toBeVisible();
      await soldOut.locator(touch ? ".bt-product-card-image-link" : ".bt-product-card-details").click();
      await expect(page.getByRole("button", { name: "Thêm vào giỏ hàng", exact: true })).toBeDisabled();
      console.log(`PASS ${width}px: ${columns} listing columns; hidden homepage list, shared cards, hover/focus/touch, detail purchase, sold-out state`);
    } finally {
      await context.close();
    }
  }
  expect(issues).toEqual([]);
  const report = { viewports: 6, desktopColumns: 5, homepageProductList: false, carouselProducts: 10, sharedCards: true, hoverFocusTouch: true, detailPurchase: true, issues, passed: true };
  await writeFile(`${directory}/report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} finally {
  await browser.close();
}

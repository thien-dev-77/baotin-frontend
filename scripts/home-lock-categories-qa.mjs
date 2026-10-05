import { chromium, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

const base = process.env.QA_BASE_URL || "http://localhost:3010";
const directory = "/tmp/bao-tin-ui-qa/home-lock-categories";
const groups = [
  ["Khóa điện tử", ["499.21.232", "499.21.234", "912.21.048", "912.21.046", "499.21.226"]],
  ["Khóa cửa", ["499.63.636", "499.63.628", "499.63.620", "499.63.612", "499.63.604"]],
  ["Khóa tủ", ["232.26.621", "234.98.611", "235.19.211", "210.11.001", "235.88.621"]],
  ["Tay nắm cửa", ["903.92.559", "903.99.368", "903.98.463", "903.98.464", "903.98.462"]],
  ["Phụ kiện cửa", ["950.45.015", "489.15.001", "489.70.230", "489.70.203", "489.71.450"]]
];
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {}) });
const issues = [];

async function ready(page) {
  await expect(page.locator("header[aria-busy]")).toHaveAttribute("aria-busy", "false");
  await page.evaluate(() => document.fonts.ready);
}

async function filtered(page, title, codes) {
  await ready(page);
  await expect(page.getByRole("button", { name: title, exact: true }).first()).toHaveAttribute("aria-pressed", "true");
  const cards = page.locator(".bt-product-card");
  for (const code of codes) await expect(cards.filter({ hasText: `Mã: ${code}` })).toHaveCount(1);
  for (const [otherTitle, otherCodes] of groups) {
    if (title !== otherTitle) for (const code of otherCodes) await expect(cards.filter({ hasText: `Mã: ${code}` })).toHaveCount(0);
  }
  await expect(page.locator("[data-category-products]")).toHaveCount(0);
}

try {
  for (const width of [1440, 1280, 1024, 768, 390, 320]) {
    const touch = width < 1024;
    const context = await browser.newContext({ viewport: { width, height: 900 }, hasTouch: touch, isMobile: touch });
    const page = await context.newPage();
    page.on("pageerror", (error) => issues.push(error.message));
    try {
      await page.goto(base);
      await ready(page);
      await expect(page.locator("[data-category-products]")).toHaveCount(5);
      for (const [title, codes] of groups) {
        const section = page.getByRole("region", { name: title, exact: true });
        const banner = section.locator(".bt-category-product-banner");
        const href = `/category/khoa?subcategory=${encodeURIComponent(title)}`;
        await expect(banner).toHaveAttribute("href", href);
        await expect(section.getByRole("link", { name: "Xem tất cả", exact: true })).toHaveAttribute("href", href);
        await section.evaluate((element) => window.scrollTo({ top: element.getBoundingClientRect().top + scrollY - document.querySelector("header").getBoundingClientRect().height - 12, behavior: "instant" }));
        await section.locator("img").evaluateAll(async (images) => Promise.all(images.map((image) => image.decode())));
        const cards = section.locator(".bt-product-card");
        await expect(cards).toHaveCount(5);
        for (const code of codes) await expect(cards.filter({ hasText: `Mã: ${code}` })).toHaveCount(1);
        const bounds = await cards.evaluateAll((elements) => elements.map((element) => {
          const { top, height, width } = element.getBoundingClientRect();
          return { top, height, width };
        }));
        expect(new Set(bounds.map((item) => Math.round(item.top))).size).toBe(1);
        expect(new Set(bounds.map((item) => Math.round(item.height))).size).toBe(1);
        expect(await banner.evaluate((element) => {
          const outer = element.getBoundingClientRect();
          return [...element.querySelectorAll("h2, p, span")].every((child) => {
            const rect = child.getBoundingClientRect();
            return rect.top >= outer.top && rect.bottom <= outer.bottom && rect.right <= outer.right;
          });
        })).toBe(true);
        await expect(cards.getByRole("button", { name: /^Thêm .* vào giỏ/ })).toHaveCount(0);
        const details = cards.first().locator(".bt-product-card-details");
        await expect(details).toHaveText("Xem sản phẩm");
        await expect(details).toHaveAttribute("aria-label", /^Xem sản phẩm - /);
        if (touch) await expect(details).toBeHidden();
        else {
          await cards.first().locator(".bt-product-card-media").hover();
          await expect(details).toHaveCSS("opacity", "1");
        }
        await section.screenshot({ path: `${directory}/${width}-${groups.findIndex(([name]) => name === title)}.png` });
        const row = section.locator(".bt-category-product-row");
        if (touch) {
          expect(await row.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
          await row.focus();
          await row.evaluate((element) => element.scrollLeft = element.scrollWidth);
          expect(await row.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
        } else {
          const track = await row.boundingBox();
          expect(Math.abs(bounds[0].width * 5 + 48 - track.width)).toBeLessThan(1);
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      }
      if (width === 1440 || width === 390) {
        for (const [title, codes] of groups) {
          await page.goto(base);
          await ready(page);
          const section = page.getByRole("region", { name: title, exact: true });
          await section.getByRole("link", { name: width === 1440 ? `Xem danh mục ${title}` : "Xem tất cả", exact: true }).click();
          await filtered(page, title, codes);
          await page.reload();
          await filtered(page, title, codes);
        }
      }
      if (width === 1440) {
        for (const [, codes] of groups) for (const code of codes) {
          await page.goto(`${base}/products/hafele-${code.replaceAll(".", "-")}`);
          await ready(page);
          await expect(page.getByRole("heading", { level: 1 })).toContainText("Hafele");
          await expect(page.getByRole("button", { name: "Thêm vào giỏ hàng", exact: true })).toBeEnabled();
        }
        await page.getByRole("spinbutton", { name: "Số lượng", exact: true }).fill("2");
        await page.getByRole("button", { name: "Thêm vào giỏ hàng", exact: true }).click();
        await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("baotin-commerce-v1")).cart.find((line) => line.productId === "HF-489.71.450")?.quantity)).toBe(2);
        for (const query of ["subcategory=unknown", "subcategory=Kh%C3%B3a%20t%E1%BB%A7&subcategory=Kh%C3%B3a%20c%E1%BB%ADa"]) {
          await page.goto(`${base}/category/khoa?${query}`);
          await ready(page);
          await expect(page.locator("main button[aria-pressed=true]")).toHaveCount(1);
          for (const [title] of groups) await expect(page.getByRole("button", { name: title, exact: true }).first()).toHaveAttribute("aria-pressed", "false");
        }
      }
      console.log(`PASS ${width}px: five banners, twenty-five shared cards, single rows, images and category links`);
    } finally {
      await context.close();
    }
  }
  expect(issues).toEqual([]);
  const report = { passed: true, viewports: 6, groups: 5, products: 25, categoryFiltering: true, detailPurchase: true, issues };
  await writeFile(`${directory}/report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} finally {
  await browser.close();
}

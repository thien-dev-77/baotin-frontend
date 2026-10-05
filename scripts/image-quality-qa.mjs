import { chromium, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

const base = process.env.QA_BASE_URL || "http://localhost:3010";
const directory = "/tmp/bao-tin-ui-qa/image-quality";
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {}) });
const errors = [];
const results = [];
const codes = ["LED-12V-8W", "433.02.450", "BT-RK-01", "TN-201"];

async function ready(page) {
  await expect(page.locator("header[aria-busy]")).toHaveAttribute("aria-busy", "false");
  await page.evaluate(() => document.fonts.ready);
}

async function checkImage(image, density) {
  await image.evaluate((element) => element.decode());
  const info = await image.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 64;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(element, 0, 0, 64, 64);
    const pixels = ctx.getImageData(0, 0, 64, 64).data;
    const colors = new Set();
    for (let i = 0; i < pixels.length; i += 4) colors.add(`${pixels[i] >> 4},${pixels[i + 1] >> 4},${pixels[i + 2] >> 4}`);
    return {
      src: element.getAttribute("src"),
      naturalWidth: element.naturalWidth,
      naturalHeight: element.naturalHeight,
      width: bounds.width,
      height: bounds.height,
      fit: getComputedStyle(element).objectFit,
      filter: getComputedStyle(element).filter,
      colors: colors.size
    };
  });
  expect(info.width).toBeGreaterThan(0);
  expect(info.height).toBeGreaterThan(0);
  expect(info.filter).toBe("none");
  // Chrome hardware is mostly grayscale; a blank image has only one color bin.
  expect(info.colors, info.src).toBeGreaterThan(10);
  const sourceDensity = info.fit === "contain"
    ? Math.max(info.naturalWidth / info.width, info.naturalHeight / info.height)
    : Math.min(info.naturalWidth / info.width, info.naturalHeight / info.height);
  expect(sourceDensity, `${info.src}: insufficient source pixels`).toBeGreaterThanOrEqual(density);
  return info;
}

try {
  for (const [width, height, density, touch] of [[1440, 1000, 2, false], [1024, 900, 2, false], [768, 1024, 2, false], [1024, 900, 2, true], [390, 844, 3, true], [320, 812, 2, true]]) {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: density, hasTouch: touch, isMobile: touch });
    try {
      const page = await context.newPage();
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("response", (response) => {
        if (response.url().includes("/images/") && response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
      });
      await page.goto(base);
      await ready(page);
      const hero = page.locator(".bt-home-hero-banner");
      const originalBounds = await hero.boundingBox();
      const images = [];
      for (let slide = 1; slide <= 3; slide++) {
        await hero.getByRole("button", { name: `Chọn slide ${slide}`, exact: true }).click();
        const image = hero.locator('img[data-active="true"]');
        await expect(image).toHaveCSS("opacity", "1");
        images.push(await checkImage(image, density));
        const bounds = await hero.boundingBox();
        expect(bounds.width).toBe(originalBounds.width);
        expect(bounds.height).toBe(originalBounds.height);
        await hero.screenshot({ path: `${directory}/${width}-${touch ? "touch" : "mouse"}-hero-${slide}.png` });
      }
      const categories = page.locator("section").filter({ has: page.getByRole("heading", { name: "Danh mục sản phẩm chính", exact: true }) });
      await expect(categories.locator("img")).toHaveCount(8);
      for (const image of await categories.locator("img").all()) images.push(await checkImage(image, density));
      await categories.screenshot({ path: `${directory}/${width}-${touch ? "touch" : "mouse"}-categories.png` });

      for (const code of codes) {
        const card = page.locator(".bt-product-card").filter({ hasText: `Mã: ${code}` }).first();
        await card.evaluate((element) => {
          element.scrollIntoView({ block: "center", inline: "center", behavior: "instant" });
          window.scrollBy({ top: -document.querySelector("header").getBoundingClientRect().height, behavior: "instant" });
        });
        await page.mouse.move(0, 0);
        images.push(await checkImage(card.locator("img"), density));
        const overlay = card.locator(".bt-product-card-details");
        const imageLink = card.locator(".bt-product-card-image-link");
        const href = await imageLink.getAttribute("href");
        const src = await card.locator("img").getAttribute("src");
        if (!touch && width >= 1024) {
          await expect(overlay).toHaveCSS("opacity", "0");
          await card.locator(".bt-product-card-media").hover();
          await expect(overlay).toHaveCSS("opacity", "1");
        } else {
          await card.locator(".bt-product-card-media").hover();
          await expect(overlay).toBeHidden();
          await imageLink.focus();
          await expect(overlay).toBeHidden();
        }
        await card.screenshot({ path: `${directory}/${width}-${touch ? "touch" : "mouse"}-${code}.png` });
        const productLink = !touch && width >= 1024 ? overlay : imageLink;
        await (touch ? productLink.tap() : productLink.click());
        await expect(page).toHaveURL(base + href);
        await ready(page);
        const photo = page.locator("img[fetchpriority=high]");
        await expect(photo).toHaveAttribute("src", src);
        // Gallery photos stay at original resolution; cards/hero must cover display density.
        images.push(await checkImage(photo, 1));
        await expect(page.getByRole("button", { name: "Thêm vào giỏ hàng", exact: true })).toBeEnabled();
        await page.goto(base);
        await ready(page);
        const title = page.locator(".bt-product-card").filter({ hasText: `Mã: ${code}` }).first().locator(":scope > div:last-child > a").first();
        await title.evaluate((element) => element.scrollIntoView({ block: "center", inline: "center", behavior: "instant" }));
        await title.click();
        await expect(page).toHaveURL(base + href);
        await page.goto(base);
        await ready(page);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      results.push({ width, height, density, touch, images });
      console.log(`PASS ${width}px @${density}x ${touch ? "touch" : "mouse"}: 3 hero slides, 8 categories, 4 products, details and mobile links`);
    } finally {
      await context.close();
    }
  }
  expect(errors).toEqual([]);
  await writeFile(`${directory}/report.json`, JSON.stringify({ passed: true, errors, results }, null, 2));
} finally {
  await browser.close();
}

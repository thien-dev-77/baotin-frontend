import { chromium, expect } from "@playwright/test";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const base = process.env.QA_BASE_URL || "http://localhost:3010";
const directory = "/tmp/bao-tin-ui-qa/product-detail";
const baselineDirectory = process.env.QA_DETAIL_BASELINE_DIR;
const baseline = baselineDirectory ? JSON.parse(await readFile(`${baselineDirectory}/report.json`, "utf8")) : [];
const money = (value) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {}) });
const issues = [];

async function ready(page) {
  await expect(page.locator("header[aria-busy]")).toHaveAttribute("aria-busy", "false");
  await page.evaluate(async () => {
    await document.fonts.ready;
    for (const image of document.images) image.loading = "eager";
    await Promise.all([...document.images].map((image) => image.decode()));
  });
}

async function readCart(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem("baotin-commerce-v1"))?.cart || []);
}

async function inspectLayout(page, width) {
  const boxes = await page.evaluate(() => {
    const rect = (selector) => {
      const { x, y, width, height, right, bottom } = document.querySelector(selector).getBoundingClientRect();
      return { x, y, width, height, right, bottom };
    };
    return {
      main: rect("main"),
      layout: rect(".bt-product-detail-layout"),
      intro: rect(".bt-product-detail-intro"),
      gallery: rect(".bt-product-detail-intro > section"),
      information: rect(".bt-product-detail-information"),
      tabs: rect("#product-tabs"),
      purchase: rect(".bt-product-detail-purchase"),
      related: rect('section[aria-labelledby="related-products-heading"]'),
      bundle: rect("main > section"),
      cardTops: [...document.querySelectorAll(".bt-product-detail-related-row .bt-product-card")].map((card) => card.getBoundingClientRect().top)
    };
  });
  for (const box of [boxes.layout, boxes.information, boxes.tabs, boxes.purchase, boxes.related]) {
    expect(box.x).toBeGreaterThanOrEqual(boxes.main.x - 1);
    expect(box.right).toBeLessThanOrEqual(boxes.main.right + 1);
  }
  expect(Math.abs(boxes.information.x - boxes.gallery.x)).toBeLessThan(1);
  expect(boxes.information.y).toBeGreaterThanOrEqual(boxes.intro.bottom + 23);
  expect(boxes.related.y).toBeGreaterThanOrEqual(boxes.bundle.bottom + 31);
  expect(Math.max(...boxes.cardTops) - Math.min(...boxes.cardTops)).toBeLessThan(1);
  const related = page.getByRole("region", { name: "Danh sách sản phẩm liên quan", exact: true });
  await expect(related.locator(".bt-product-card")).toHaveCount(4);
  expect(await related.locator(".bt-product-card").evaluateAll((cards) => cards.every((card) => card.querySelector(".bt-product-card-media").clientWidth === card.clientWidth))).toBe(true);
  const purchase = page.getByRole("complementary", { name: "Mua sản phẩm", exact: true });
  if (width >= 1024) {
    expect(Math.abs(boxes.information.width - boxes.intro.width)).toBeLessThan(1);
    expect(boxes.information.right).toBeLessThan(boxes.purchase.x);
    await expect(purchase).toHaveCSS("position", "sticky");
    await page.evaluate(() => window.scrollTo({ top: 250, behavior: "instant" }));
    await expect.poll(async () => Math.abs((await purchase.boundingBox()).y - await page.locator("header").evaluate((header) => header.getBoundingClientRect().bottom + 16))).toBeLessThan(1);
    await page.screenshot({ path: `${directory}/${width}-sticky.png`, animations: "disabled" });
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  } else {
    await expect(purchase).toHaveCSS("position", "static");
    expect(boxes.purchase.y).toBeGreaterThanOrEqual(boxes.intro.bottom + 23);
    expect(boxes.information.y).toBeGreaterThanOrEqual(boxes.purchase.bottom + 23);
    await related.focus();
    await page.keyboard.press("ArrowRight");
    await expect.poll(() => related.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
    await related.evaluate((element) => element.scrollTo({ left: 0, behavior: "instant" }));
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  }
  await page.getByRole("link", { name: "Xem thông số kỹ thuật", exact: true }).click();
  await expect.poll(() => page.locator("#specifications").evaluate((element) => Math.abs(element.getBoundingClientRect().top - document.querySelector("header").getBoundingClientRect().bottom - 16))).toBeLessThan(2);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
}

try {
  for (const width of [1440, 1280, 1024, 768, 390, 320]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, hasTouch: width < 1024, isMobile: width < 1024 });
    const page = await context.newPage();
    page.on("pageerror", (error) => issues.push(error.message));
    try {
      await page.goto(`${base}/products/ban-le-giam-chan-hafele`);
      await ready(page);
      await page.mouse.move(0, 0);
      const screenshot = await page.screenshot({ path: `${directory}/${width}-initial.png`, fullPage: true, animations: "disabled" });
      if (baselineDirectory) {
        const previous = baseline.find((item) => item.width === width);
        expect(previous).toBeDefined();
        expect(createHash("sha256").update(screenshot).digest("hex")).toBe(previous.hash);
      }
      if (width < 1024) {
        // Full-page capture resets Chromium's emulated touch media features.
        const session = await context.newCDPSession(page);
        await session.send("Emulation.setTouchEmulationEnabled", { enabled: false });
        await session.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 1 });
        await expect.poll(() => page.evaluate(() => matchMedia("(pointer: coarse)").matches)).toBe(true);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await expect(page.locator("main dl > div")).toHaveCount(8);
      await expect(page.locator("main table tr")).toHaveCount(8);
      await inspectLayout(page, width);

      const gallery = page.getByRole("region", { name: "Hình ảnh sản phẩm", exact: true });
      const photo = gallery.locator('img[fetchpriority="high"]');
      const firstPhoto = "/images/catalog/hinge-detail.png";
      const secondPhoto = "/images/catalog/hinge-hd.jpg";
      await expect(photo).toHaveAttribute("src", firstPhoto);
      await gallery.getByRole("button", { name: "Ảnh tiếp theo", exact: true }).click();
      await expect(photo).toHaveAttribute("src", secondPhoto);
      await gallery.getByRole("button", { name: "Ảnh tiếp theo", exact: true }).click();
      await expect(photo).toHaveAttribute("src", firstPhoto);
      await gallery.getByRole("button", { name: "Ảnh trước", exact: true }).click();
      await expect(photo).toHaveAttribute("src", secondPhoto);
      await gallery.getByRole("button", { name: "Xem ảnh 1", exact: true }).click();
      await gallery.getByRole("button", { name: "Xem ảnh 2", exact: true }).click();
      await expect(gallery.getByRole("button", { name: "Xem ảnh 2", exact: true })).toHaveAttribute("aria-pressed", "true");
      await gallery.getByRole("button", { name: "Phóng to ảnh", exact: true }).click();
      await expect(page.getByRole("dialog").locator("img")).toHaveAttribute("src", secondPhoto);
      await page.getByRole("dialog").screenshot({ path: `${directory}/${width}-zoom.png` });
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await expect(gallery.getByRole("button", { name: "Phóng to ảnh", exact: true })).toBeFocused();

      const purchase = page.getByRole("complementary", { name: "Mua sản phẩm", exact: true });
      const quantity = purchase.getByRole("spinbutton", { name: "Số lượng", exact: true });
      await quantity.fill("2.8");
      await expect(quantity).toHaveValue("2");
      await quantity.fill("9999");
      await expect(quantity).toHaveValue("100");
      await expect(purchase.getByRole("button", { name: "Tăng Số lượng", exact: true })).toBeDisabled();
      await quantity.fill("2");
      await purchase.getByRole("button", { name: "Thêm vào giỏ hàng", exact: true }).click();
      await expect.poll(async () => (await readCart(page)).find((line) => line.productId === "311.72.501")?.quantity).toBe(2);
      await purchase.getByRole("button", { name: "Yêu thích", exact: true }).click();
      await expect(purchase.getByRole("button", { name: "Đã yêu thích", exact: true })).toBeVisible();

      const bundle = page.locator("main > section").filter({ has: page.getByRole("heading", { name: "Sản phẩm thường được mua cùng", exact: true }) });
      const checkboxes = bundle.getByRole("checkbox");
      await expect(checkboxes).toHaveCount(4);
      for (const checkbox of await checkboxes.all()) await checkbox.uncheck();
      const addBundle = bundle.getByRole("button", { name: "Thêm tất cả vào giỏ hàng", exact: true });
      await expect(addBundle).toBeDisabled();
      await checkboxes.nth(0).check();
      await checkboxes.nth(1).check();

      await page.getByRole("button", { name: "4.8 (126 đánh giá)", exact: true }).click();
      await expect(page.getByRole("tab", { name: "Đánh giá", exact: true })).toHaveAttribute("aria-selected", "true");
      await page.getByRole("button", { name: "Viết đánh giá", exact: true }).click();
      const reviewDialog = page.getByRole("dialog", { name: "Viết đánh giá", exact: true });
      await reviewDialog.getByRole("button", { name: "Gửi đánh giá", exact: true }).click();
      await expect(reviewDialog).toBeVisible();
      await reviewDialog.getByLabel("Tên của bạn", { exact: false }).fill("Khách thử nghiệm");
      await reviewDialog.getByLabel("Mức đánh giá", { exact: false }).selectOption("4");
      await reviewDialog.getByLabel("Nhận xét", { exact: false }).fill(`Đánh giá thử ở ${width}px`);
      await reviewDialog.getByRole("button", { name: "Gửi đánh giá", exact: true }).click();
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await expect(page.getByRole("tabpanel")).toContainText(`Đánh giá thử ở ${width}px`);
      await expect(page.getByRole("button", { name: "4.8 (127 đánh giá)", exact: true })).toHaveCount(1);

      await page.getByRole("tab", { name: "Mô tả sản phẩm", exact: true }).focus();
      await page.keyboard.press("ArrowRight");
      await expect(page.getByRole("tab", { name: "Tài liệu / Hướng dẫn", exact: true })).toHaveAttribute("aria-selected", "true");
      const downloadPromise = page.waitForEvent("download");
      await page.getByRole("button", { name: "Tải bảng thông số", exact: true }).click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toBe("311.72.501-thong-so.csv");
      const csv = await readFile(await download.path(), "utf8");
      expect(csv.charCodeAt(0)).toBe(0xfeff);
      expect(csv.split("\r\n")).toHaveLength(9);
      expect(csv).toContain('"Mã hàng","311.72.501"');
      expect(csv).toContain('"Bảo hành","24 tháng"');
      await page.getByRole("tab", { name: "Đánh giá", exact: true }).click();
      await expect(page.getByRole("tabpanel")).toContainText(`Đánh giá thử ở ${width}px`);
      await page.getByRole("tab", { name: "Câu hỏi thường gặp", exact: true }).click();
      await page.getByText("Làm sao chọn đúng mã phụ kiện?", { exact: true }).click();
      await expect(page.getByRole("tabpanel").getByText(/Đối chiếu mã hàng/)).toBeVisible();

      await expect(quantity).toHaveValue("2");
      await expect(photo).toHaveAttribute("src", secondPhoto);
      await expect(checkboxes.nth(0)).toBeChecked();
      await expect(checkboxes.nth(1)).toBeChecked();
      await expect(checkboxes.nth(2)).not.toBeChecked();
      await expect(checkboxes.nth(3)).not.toBeChecked();
      await addBundle.click();
      await expect.poll(async () => (await readCart(page)).find((line) => line.productId === "311.72.501")?.quantity).toBe(3);
      await expect.poll(async () => (await readCart(page)).map((line) => line.productId).sort()).toEqual(["311.72.501", "BT-118"]);

      const relatedCard = page.locator(".bt-product-card").first();
      await relatedCard.evaluate((element) => window.scrollTo({ top: element.getBoundingClientRect().top + scrollY - document.querySelector("header").getBoundingClientRect().height - 20, behavior: "instant" }));
      if (width >= 1024) await relatedCard.locator(".bt-product-card-media").hover();
      const relatedDetails = relatedCard.locator(".bt-product-card-details");
      if (width >= 1024) await expect(relatedDetails).toHaveCSS("opacity", "1");
      else await expect(relatedDetails).toBeHidden();
      const relatedLink = relatedCard.locator(width >= 1024 ? ".bt-product-card-details" : ".bt-product-card-image-link");
      const relatedHref = await relatedLink.getAttribute("href");
      await relatedLink.click();
      await expect(page).toHaveURL(base + relatedHref);
      await ready(page);
      await expect(page.getByRole("spinbutton", { name: "Số lượng", exact: true })).toHaveValue("1");
      await expect(page.getByRole("button", { name: "Xem ảnh 1", exact: true })).toHaveAttribute("aria-pressed", "true");
      await expect(page.getByRole("tab", { name: "Mô tả sản phẩm", exact: true })).toHaveAttribute("aria-selected", "true");
      await expect(page.getByRole("button", { name: "4.8 (126 đánh giá)", exact: true })).toHaveCount(1);
      for (const checkbox of await page.locator("main > section").getByRole("checkbox").all()) await expect(checkbox).toBeChecked();

      await page.goto(`${base}/products/hafele-499-21-226`);
      await ready(page);
      await expect(page.getByRole("button", { name: "Ảnh trước", exact: true })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Ảnh tiếp theo", exact: true })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Thêm vào giỏ hàng", exact: true })).toBeEnabled();
      await page.goto(`${base}/products/kep-kinh-inox-hoan-thien`);
      await ready(page);
      await expect(page.getByRole("button", { name: "Thêm vào giỏ hàng", exact: true })).toBeDisabled();
      await page.goto(base);
      await ready(page);
      await expect(page.getByRole("region", { name: "Danh sách sản phẩm", exact: true })).toHaveCount(0);
      await expect(page.locator("[data-category-products]")).toHaveCount(5);
      console.log(`PASS ${width}px: contained information, horizontal related row, responsive purchase panel, gallery, reviews, CSV, bundle, product resets`);
    } finally {
      await context.close();
    }
  }

  for (const width of [1440, 1024]) {
    const context = await browser.newContext({ viewport: { width, height: 600 } });
    try {
      const page = await context.newPage();
      page.on("pageerror", (error) => issues.push(error.message));
      await page.goto(`${base}/products/ban-le-giam-chan-hafele`);
      await ready(page);
      const purchase = page.getByRole("complementary", { name: "Mua sản phẩm", exact: true });
      await page.evaluate(() => window.scrollTo({ top: 250, behavior: "instant" }));
      await expect.poll(async () => Math.abs((await purchase.boundingBox()).y - await page.locator("header").evaluate((header) => header.getBoundingClientRect().bottom + 16))).toBeLessThan(1);
      const box = await purchase.boundingBox();
      expect(box.y + box.height).toBeLessThanOrEqual(585);
      await purchase.focus();
      await page.keyboard.press("End");
      await expect.poll(() => purchase.evaluate((element) => element.scrollTop + element.clientHeight >= element.scrollHeight - 1)).toBe(true);
      await page.screenshot({ path: `${directory}/${width}-short-screen.png`, animations: "disabled" });
      await page.keyboard.press("Home");
      await expect.poll(() => purchase.evaluate((element) => element.scrollTop)).toBe(0);
      await purchase.hover();
      await page.mouse.wheel(0, 300);
      await expect.poll(() => purchase.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
      await page.setViewportSize({ width: 768, height: 900 });
      await expect(purchase).toHaveCSS("position", "static");
      await expect(purchase).toHaveCSS("max-height", "none");
      console.log(`PASS ${width}x600: header-safe sticky panel, keyboard/wheel scroll, responsive resize`);
    } finally {
      await context.close();
    }
  }

  const context = await browser.newContext();
  try {
    await context.addInitScript(() => localStorage.setItem("baotin-customer", JSON.stringify({ id: "qa-detail@example.com", name: "Khách B2B thử nghiệm", email: "qa-detail@example.com", phone: "0901234567", company: "Xưởng thử nghiệm", role: "b2b", status: "active" })));
    const page = await context.newPage();
    page.on("pageerror", (error) => issues.push(error.message));
    await page.goto(`${base}/products/ban-le-giam-chan-hafele`);
    await ready(page);
    const purchase = page.getByRole("complementary", { name: "Mua sản phẩm", exact: true });
    await expect(purchase.getByText("Giá B2B", { exact: true })).toBeVisible();
    await expect(purchase.locator("strong.text-danger")).toHaveText(money(25000));
    await expect(page.getByRole("heading", { name: "Mua số lượng lớn?", exact: true })).toHaveCount(0);
    await expect(page.locator("main > section label .text-danger").first()).toHaveText(money(25000));
    await page.goto(`${base}/product/ban-le-giam-chan-hafele`);
    await expect(page).toHaveURL(`${base}/products/ban-le-giam-chan-hafele`);
    const response = await page.goto(`${base}/products/unknown-product`);
    // App Router may start streaming before notFound() sets the HTTP status.
    expect([200, 404]).toContain(response.status());
    await expect(page.getByRole("heading", { name: "Không tìm thấy trang", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Thêm vào giỏ hàng", exact: true })).toHaveCount(0);
    await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute("content", "noindex");
    console.log("PASS B2B prices, alias redirect and unknown-product route");
  } finally {
    await context.close();
  }
  expect(issues).toEqual([]);
  const report = { passed: true, viewports: 6, shortScreenViewports: 2, containedInformation: true, horizontalRelatedRow: true, stickyPurchase: true, unchangedScreenshots: baselineDirectory ? 6 : null, galleryZoom: true, reviewsAcrossTabs: true, specificationDownload: true, bundleSelection: true, productStateReset: true, b2bPricing: true, homepageProductList: false, issues };
  await writeFile(`${directory}/report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} finally {
  await browser.close();
}

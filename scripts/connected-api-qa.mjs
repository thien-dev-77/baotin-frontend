import { chromium, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const backendDir = process.env.QA_BACKEND_DIR ? resolve(process.env.QA_BACKEND_DIR) : fileURLToPath(new URL("../../baotin-b2b-be/", import.meta.url));
if (!existsSync(join(backendDir, "package.json")) || !existsSync(join(backendDir, ".env.local"))) throw new Error("Set QA_BACKEND_DIR to the separate backend directory with local test configuration.");
const backendRequire = createRequire(join(backendDir, "package.json"));
backendRequire("dotenv").config({ path: join(backendDir, ".env.local"), quiet: true });
const { Client } = backendRequire("pg");
const base = process.env.QA_BASE_URL || "http://localhost:3010";
if (!base.includes("localhost:") || !process.env.DATABASE_URL?.includes("127.0.0.1")) throw new Error("Connected QA targets local services only.");
const password = process.env.SEED_PASSWORD;
const output = "/tmp/bao-tin-ui-qa/connected";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {}) });
const sql = new Client({ connectionString: process.env.DATABASE_URL }); await sql.connect();
const schema = process.env.DB_SCHEMA || "baotin_app";
const issues = [], createdOrders = [];
const field = (page, name) => page.getByLabel(name, { exact: false }).and(page.locator("input,select,textarea"));
async function check(page) {
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  expect(await page.locator("h1").first().evaluate((element) => getComputedStyle(element).fontFamily)).toContain("Inter");
}
async function login(page, identity, path) {
  await page.goto(`${base}${path}`);
  await page.locator('input[name="identity"]').fill(identity);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
}
try {
  const catalog = await (await fetch(`${base}/api/backend/catalog`)).json();
  const product = catalog.products.find((item) => item.id === "LED-12V-8W");
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage(); page.on("pageerror", (error) => issues.push(error.message));
  await login(page, "kh001@baotin.local", "/login?next=/account");
  await expect(page).toHaveURL(`${base}/account`);
  await expect(page.getByRole("heading", { name: "Xin chào, Nguyễn Minh An" })).toBeVisible();
  const cookies = await context.cookies(); expect(cookies.find((cookie) => cookie.name === "baotin_session").httpOnly).toBe(true);
  expect(await page.evaluate(() => localStorage.getItem("baotin-customer"))).toBeNull();
  await page.goto(`${base}/products/${product.slug}`);
  await expect(page.getByRole("heading", { name: product.name, exact: true, level: 1 })).toBeVisible();
  await expect.poll(() => page.locator(".bt-product-detail-purchase").textContent()).toContain("40.500");
  await page.getByRole("button", { name: "Thêm vào giỏ hàng", exact: true }).click();
  await page.goto(`${base}/checkout`);
  await field(page, "Họ và tên").fill("Nguyễn Minh An"); await field(page, "Số điện thoại").fill("0901000101");
  await field(page, "Tỉnh/Thành phố").selectOption("Gia Lai"); await field(page, "Quận/Huyện").fill("Quy Nhơn");
  await field(page, "Phường/Xã").fill("Quy Nhơn"); await field(page, "Địa chỉ").fill("123 địa chỉ kiểm thử");
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await page.getByRole("radio", { name: /Nhận tại cửa hàng/ }).check();
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await page.getByRole("checkbox", { name: /Tôi đồng ý với/ }).check();
  await check(page); await page.screenshot({ path: `${output}/1440-checkout.png`, fullPage: true });
  await page.getByRole("button", { name: "Đặt hàng", exact: true }).click();
  await expect(page).toHaveURL(/\/order\/success\?id=BT-/);
  const id = new URL(page.url()).searchParams.get("id"); createdOrders.push(id);
  await page.reload(); await expect(page.getByRole("heading", { name: "Đặt hàng thành công", exact: true })).toBeVisible();
  const adminContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const adminPage = await adminContext.newPage(); adminPage.on("pageerror", (error) => issues.push(error.message));
  await login(adminPage, "admin@baotin.local", "/admin");
  await expect(adminPage.locator("#admin-content")).toHaveAttribute("aria-busy", "false");
  await adminPage.goto(`${base}/admin/orders?order=${id}`);
  await expect(adminPage.locator("dialog[open]")).toContainText(id);
  await adminPage.getByRole("button", { name: "Xác nhận đơn", exact: true }).click();
  await expect(adminPage.locator("dialog[open]")).toContainText("Chờ soạn hàng");
  await page.goto(`${base}/account/orders/${id}`);
  await expect(page.getByText("Đang xử lý", { exact: true }).first()).toBeVisible();
  await page.reload(); await expect(page.getByText("Đang xử lý", { exact: true }).first()).toBeVisible();
  await adminPage.goto(`${base}/admin/accounting`); await expect(adminPage.locator("#admin-content")).toHaveAttribute("aria-busy", "false");
  await adminPage.getByRole("tab", { name: "Đơn cần thu", exact: true }).click();
  await check(adminPage); await adminPage.screenshot({ path: `${output}/1440-accounting.png`, fullPage: true });
  await adminPage.goto(`${base}/admin/products`); await expect(adminPage.locator("#admin-content")).toHaveAttribute("aria-busy", "false");
  await adminPage.getByPlaceholder("Tìm sản phẩm, mã hàng, thương hiệu...").fill(product.code);
  await adminPage.getByLabel(`Sửa sản phẩm ${product.code}`).click();
  await expect(adminPage.getByLabel("Ảnh sản phẩm")).toHaveCount(1);
  await adminContext.close();
  for (const [width, height] of [[1440, 1000], [768, 1024], [390, 844], [320, 812]]) {
    const mobile = await browser.newContext({ viewport: { width, height }, hasTouch: width < 1000, isMobile: width < 1000 });
    const view = await mobile.newPage(); view.on("pageerror", (error) => issues.push(error.message));
    await view.goto(base); await expect(view.locator(".bt-product-card").first()).toBeVisible();
    await view.evaluate(async () => { for (const image of document.querySelectorAll("img")) { image.loading = "eager"; try { await image.decode(); } catch {} } });
    expect(await view.locator("img").evaluateAll((images) => images.filter((image) => image.complete && !image.naturalWidth).map((image) => image.src))).toEqual([]);
    expect(await view.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await view.screenshot({ path: `${output}/${width}-home.png`, fullPage: true });
    await view.goto(`${base}/products/${product.slug}`); await expect(view.getByRole("heading", { name: product.name, exact: true, level: 1 })).toBeVisible();
    await check(view); await view.screenshot({ path: `${output}/${width}-product.png`, fullPage: true });
    await mobile.close(); console.log(`PASS connected UI ${width}px: images, layout, product detail`);
  }
  await context.close(); expect(issues).toEqual([]);
  console.log("PASS UI checkout -> Sales -> account reload, JWT HttpOnly, upload control, accounting");
} finally {
  await browser.close();
  await sql.query(`DELETE FROM "${schema}".audit_events WHERE "resourceId"=ANY($1)`, [createdOrders]);
  await sql.query(`DELETE FROM "${schema}".orders WHERE id=ANY($1)`, [createdOrders]);
  await sql.end();
}

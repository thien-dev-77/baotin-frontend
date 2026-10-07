import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile, mkdir, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";

const base = process.env.QA_BASE_URL || "http://localhost:3010";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname)) throw new Error("Product UI QA only runs locally.");
const backend = resolve(process.env.QA_BACKEND_DIR || "../backend");
const requireBackend = createRequire(resolve(backend, "package.json"));
const env = requireBackend("dotenv").parse(await readFile(resolve(backend, ".env.local"), "utf8"));
if (new URL(env.DATABASE_URL).hostname !== "127.0.0.1") throw new Error("Never run product UI QA against Supabase.");
const schema = env.DB_SCHEMA || "baotin_app";
if (!/^[a-z][a-z0-9_]{0,40}$/.test(schema)) throw new Error("Invalid local schema.");
const sql = new (requireBackend("pg").Client)({ connectionString: env.DATABASE_URL });
await sql.connect();
const screenshots = "/private/tmp/baotin-products-ui";
await mkdir(screenshots, { recursive: true });
const browser = await chromium.launch();
const errors = [];
let created = "";
let uploaded = [];
const code = `UI-QA-${randomUUID()}`;
const headers = { Origin: base, "X-BaoTin-Client": "web" };
const login = async context => {
  const response = await context.request.post(`${base}/api/backend/auth/login`, { headers, data: { identity: "admin@baotin.local", password: env.SEED_PASSWORD } });
  assert.equal(response.status(), 201, "Local admin login failed.");
};
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await login(context);
  const page = await context.newPage();
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(`${base}/admin/products`);
  await page.getByRole("link", { name: "Thêm sản phẩm", exact: true }).click();
  await page.getByRole("heading", { name: "Thêm sản phẩm", exact: true }).waitFor();
  assert.equal(await page.getByRole("radio", { name: "Riêng tư", exact: true }).isChecked(), true);
  await page.getByLabel("Tên sản phẩm", { exact: false }).fill("Sản phẩm kiểm thử UI");
  await page.getByLabel("Mã hàng", { exact: false }).fill(code);
  await page.getByLabel("Đường dẫn", { exact: false }).fill(code.toLowerCase());
  await page.getByLabel("Thương hiệu", { exact: false }).fill("Bảo Tín");
  await page.getByLabel("Danh mục", { exact: false }).selectOption("led-tu-ke");
  await page.getByLabel("Nhóm sản phẩm", { exact: true }).selectOption("LED dây");
  await page.getByLabel("Giá bán lẻ", { exact: false }).fill("125000");
  await page.getByLabel("Thông số kỹ thuật", { exact: false }).fill("12V · 8W · 3000K");
  await page.getByLabel("Mô tả sản phẩm", { exact: true }).fill("Mô tả đã lưu từ giao diện.");
  const files = await Promise.all(["red", "green", "blue"].map(async color => ({ name: `${color}.png`, mimeType: "image/png", buffer: await sharp({ create: { width: 400, height: 300, channels: 3, background: color } }).png().toBuffer() })));
  const uploadResponse = page.waitForResponse(response => response.url().endsWith("/media/product-images") && response.request().method() === "POST");
  await page.getByLabel("Thêm ảnh sản phẩm", { exact: true }).setInputFiles(files);
  uploaded = (await (await uploadResponse).json()).urls;
  assert.equal(uploaded.length, 3);
  await page.getByRole("button", { name: "Chọn ảnh 3 làm đại diện", exact: true }).click();
  await page.getByRole("button", { name: "Xóa ảnh 3", exact: true }).click();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({ path: `${screenshots}/new-desktop.png`, fullPage: true });
  const saveResponse = page.waitForResponse(response => response.url().endsWith("/admin/products") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Lưu sản phẩm", exact: true }).click();
  const saved = await saveResponse;
  assert.equal(saved.status(), 201, await saved.text());
  const result = await saved.json(); created = result.id;
  assert.equal(result.product.published, false);
  assert.deepEqual(result.product.gallery, [uploaded[2], uploaded[0]]);
  await page.waitForURL(`${base}/admin/products`);
  assert.equal((await context.request.get(`${base}/api/backend/catalog/${code.toLowerCase()}`)).status(), 404);
  assert.equal((await context.request.get(`${base}/products/${code.toLowerCase()}`)).status(), 404);
  await page.getByLabel("Tìm sản phẩm, mã hàng, thương hiệu...", { exact: true }).fill(code);
  await page.getByRole("link", { name: `Sửa sản phẩm ${code}`, exact: true }).click();
  await page.getByRole("heading", { name: "Sửa sản phẩm", exact: true }).waitFor();
  assert.equal(await page.getByLabel("Mô tả sản phẩm", { exact: true }).inputValue(), "Mô tả đã lưu từ giao diện.");
  await page.getByLabel("Mô tả sản phẩm", { exact: true }).fill("Mô tả mới được cập nhật.");
  await page.getByRole("radio", { name: "Công khai", exact: true }).check();
  const editResponse = page.waitForResponse(response => response.url().endsWith(`/admin/products/${created}`) && response.request().method() === "PATCH");
  await page.getByRole("button", { name: "Lưu sản phẩm", exact: true }).click();
  assert.equal((await editResponse).status(), 200);
  await page.waitForURL(`${base}/admin/products`);
  const anonymous = await browser.newContext({ javaScriptEnabled: false });
  const publicPage = await anonymous.newPage();
  const publicResponse = await publicPage.goto(`${base}/products/${code.toLowerCase()}`);
  assert.equal(publicResponse.status(), 200);
  assert.ok((await publicPage.locator("main").innerText()).includes("Mô tả mới được cập nhật."));
  await anonymous.close();
  await context.close();

  for (const width of [1440, 768, 390, 320]) {
    const device = await browser.newContext({ viewport: { width, height: 1000 }, hasTouch: width < 1024, isMobile: width < 768 });
    try {
      await login(device);
      const view = await device.newPage();
      view.on("pageerror", error => errors.push(error.message));
      for (const [path, name] of [["/admin/products", "list"], [`/admin/products/${created}/edit`, "edit"]]) {
        await view.goto(`${base}${path}`);
        await view.getByRole("heading", { name: name === "list" ? "Sản phẩm" : "Sửa sản phẩm", exact: true }).waitFor();
        await view.evaluate(async () => { await document.fonts.ready; });
        assert.ok(await view.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Overflow: ${name} at ${width}`);
        if (name === "edit") {
          await view.locator("ol img").first().scrollIntoViewIfNeeded();
          await view.waitForFunction(() => [...document.querySelectorAll("ol img")].every(img => img.complete && img.naturalWidth > 0));
          assert.equal(await view.getByRole("button", { name: "Lưu sản phẩm", exact: true }).isEnabled(), true);
        }
        await view.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
        await view.screenshot({ path: `${screenshots}/${name}-${width}.png`, fullPage: true });
      }
      if (width === 1440) {
        await view.getByRole("radio", { name: "Riêng tư", exact: true }).check();
        const hidden = view.waitForResponse(response => response.url().endsWith(`/admin/products/${created}`) && response.request().method() === "PATCH");
        await view.getByRole("button", { name: "Lưu sản phẩm", exact: true }).click();
        assert.equal((await hidden).status(), 200);
        await view.waitForURL(`${base}/admin/products`);
        await view.getByLabel("Trạng thái sản phẩm", { exact: true }).selectOption("hidden");
        await view.getByLabel("Tìm sản phẩm, mã hàng, thương hiệu...", { exact: true }).fill(code);
        assert.ok((await view.locator("tbody").innerText()).includes("Riêng tư"));
        assert.equal((await device.request.get(`${base}/products/${code.toLowerCase()}`)).status(), 404);
      }
    } finally { await device.close(); }
  }
  assert.deepEqual(errors, []);
  console.log("Product UI QA passed: create/edit, multi-upload, cover/removal, public/private SSR, filters, image rendering and 1440/768/390/320 layouts.");
  console.log(`Screenshots: ${screenshots}`);
} finally {
  await browser.close();
  if (created) {
    await sql.query(`DELETE FROM "${schema}".audit_events WHERE "resourceId"=$1`, [created]);
    await sql.query(`DELETE FROM "${schema}".products WHERE id=$1 AND data->>'code'=$2`, [created, code]);
  }
  await sql.end();
  for (const url of uploaded) {
    if (/^\/media\/uploads\/[a-f0-9-]+\.webp$/.test(url)) await unlink(resolve(backend, "media", url.slice("/media/".length))).catch(() => {});
  }
}

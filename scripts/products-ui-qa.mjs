import { chromium, expect } from "@playwright/test";
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
const { productMediaRoot } = requireBackend("./dist/media/product-media.js");
const mediaRoot = productMediaRoot(process.env.MEDIA_DIR || env.MEDIA_DIR || "media");
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
let createdVariant = "";
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
  await page.getByLabel("Giá niêm yết (VNĐ)", { exact: false }).fill("125000");
  await page.getByLabel("Chiết khấu B2C (%)", { exact: false }).fill("20");
  await page.getByLabel("Chiết khấu B2B (%)", { exact: false }).fill("35");
  assert.equal(await page.getByLabel("Giá sau CK B2C (VNĐ)", { exact: true }).inputValue(), "100000");
  assert.equal(await page.getByLabel("Giá sau CK B2B (VNĐ)", { exact: true }).inputValue(), "81250");
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
  assert.equal(result.product.listPrice, 125000);
  assert.equal(result.product.b2cDiscount, 20);
  assert.equal(result.product.b2bDiscount, 35);
  assert.equal(result.product.price, 100000);
  assert.equal(result.product.oldPrice, 125000);
  assert.deepEqual(result.product.gallery, [uploaded[2], uploaded[0]]);
  await page.waitForURL(url => url.pathname === "/admin/products");
  assert.equal((await context.request.get(`${base}/api/backend/catalog/${code.toLowerCase()}`)).status(), 404);
  assert.equal((await context.request.get(`${base}/products/${code.toLowerCase()}`)).status(), 404);
  await page.getByLabel("Tìm sản phẩm, mã hàng, thương hiệu...", { exact: true }).fill(code);
  await page.getByRole("link", { name: `Sửa sản phẩm ${code}`, exact: true }).click();
  await page.getByRole("heading", { name: "Sửa sản phẩm", exact: true }).waitFor();
  assert.equal(await page.getByLabel("Mô tả sản phẩm", { exact: true }).inputValue(), "Mô tả đã lưu từ giao diện.");
  await page.getByLabel("Mô tả sản phẩm", { exact: true }).fill("Mô tả mới được cập nhật.");
  await page.getByRole("button", { name: "Thêm thuộc tính", exact: true }).click();
  await page.getByLabel("Tên thuộc tính 1", { exact: true }).fill("Kích thước khoang tủ (T)");
  await page.getByLabel("Giá trị Kích thước khoang tủ (T)", { exact: true }).fill("600mm");
  await page.getByRole("button", { name: "Thêm thuộc tính", exact: true }).click();
  await page.getByLabel("Tên thuộc tính 2", { exact: true }).fill("Màu sắc");
  await page.getByLabel("Giá trị Màu sắc", { exact: true }).fill("Bạc");
  await page.getByRole("radio", { name: "Công khai", exact: true }).check();
  const editResponse = page.waitForResponse(response => response.url().endsWith(`/admin/products/${created}`) && response.request().method() === "PATCH");
  await page.getByRole("button", { name: "Lưu sản phẩm", exact: true }).click();
  assert.equal((await editResponse).status(), 200);
  await page.waitForURL(url => url.pathname === "/admin/products");
  const anonymous = await browser.newContext({ javaScriptEnabled: false });
  const publicPage = await anonymous.newPage();
  const publicResponse = await publicPage.goto(`${base}/products/${code.toLowerCase()}`);
  assert.equal(publicResponse.status(), 200);
  assert.ok((await publicPage.locator("main").innerText()).includes("Mô tả mới được cập nhật."));
  await anonymous.close();
  await page.goto(`${base}/admin/products/${created}/edit`);
  await page.getByRole("link", { name: "Tạo biến thể", exact: true }).click();
  await page.getByRole("heading", { name: "Thêm biến thể", exact: true }).waitFor();
  await page.getByLabel("Mã hàng", { exact: false }).fill(`${code}-800`);
  await page.getByLabel("Đường dẫn", { exact: false }).fill(`${code.toLowerCase()}-800`);
  await page.getByLabel("Giá trị Kích thước khoang tủ (T)", { exact: true }).fill("800mm");
  await page.getByLabel("Giá trị Màu sắc", { exact: true }).fill("Đen");
  await page.getByLabel("Giá niêm yết (VNĐ)", { exact: false }).fill("150000");
  await page.getByRole("radio", { name: "Công khai", exact: true }).check();
  const variantSave = page.waitForResponse(response => response.url().endsWith("/admin/products") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Lưu sản phẩm", exact: true }).click();
  const variantResponse = await variantSave;
  assert.equal(variantResponse.status(), 201, await variantResponse.text());
  const variant = await variantResponse.json(); createdVariant = variant.id;
  assert.equal(variant.product.variantGroupId, created);
  assert.equal(variant.product.size, "800mm");
  assert.equal(variant.product.color, "Đen");
  assert.equal(variant.product.price, 120000);
  await sql.query(`INSERT INTO "${schema}".inventory_balances (id,branch,"productId","onHand") VALUES ($1,$2,$3,3)`, [`Quy Nhơn:${createdVariant}`, "Quy Nhơn", createdVariant]);
  await page.waitForURL(url => url.pathname === "/admin/products");
  for (const width of [1440, 390]) {
    const guest = await browser.newContext({ viewport: { width, height: 900 }, isMobile: width < 768, hasTouch: width < 768 });
    try {
      const view = await guest.newPage();
      view.on("pageerror", error => errors.push(error.message));
      await view.goto(`${base}/products/${code.toLowerCase()}`);
      await expect(view.getByRole("group", { name: /Kích thước khoang tủ/ })).toBeVisible();
      await expect(view.getByRole("link", { name: "800mm", exact: true })).toBeVisible();
      await expect(view.getByRole("group", { name: /Màu sắc/ })).toContainText("Bạc");
      assert.ok(await view.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Variant overflow at ${width}`);
      await view.screenshot({ path: `${screenshots}/variant-${width}.png`, fullPage: true });
      await view.getByRole("link", { name: "800mm", exact: true }).click();
      await view.waitForURL(url => url.pathname === `/products/${code.toLowerCase()}-800`);
      await expect(view.getByRole("complementary", { name: "Mua sản phẩm" })).toContainText("120.000");
      await expect(view.getByRole("group", { name: /Kích thước khoang tủ/ })).toContainText("800mm");
      await expect(view.getByRole("group", { name: /Màu sắc/ })).toContainText("Đen");
      await view.getByRole("button", { name: "Thêm vào giỏ hàng", exact: true }).click();
      assert.ok((await view.evaluate(() => JSON.parse(localStorage.getItem("baotin-commerce-api-v1") || "{}").cart || [])).some(item => item.productId === createdVariant));
    } finally { await guest.close(); }
  }
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
          await expect(view.getByLabel("Giá sau CK B2C (VNĐ)", { exact: true })).toHaveValue("100000");
          await expect(view.getByLabel("Giá sau CK B2B (VNĐ)", { exact: true })).toHaveValue("81250");
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
        await view.waitForURL(url => url.pathname === "/admin/products");
        await view.getByLabel("Trạng thái sản phẩm", { exact: true }).selectOption("hidden");
        await view.getByLabel("Tìm sản phẩm, mã hàng, thương hiệu...", { exact: true }).fill(code);
        await expect(view.locator("tbody tr").filter({ hasText: code })).toContainText("Riêng tư");
        assert.equal((await device.request.get(`${base}/products/${code.toLowerCase()}`)).status(), 404);
      }
    } finally { await device.close(); }
  }
  assert.deepEqual(errors, []);
  console.log("Product UI QA passed: create/edit, flexible variants, SKU cart selection, multi-upload, public/private SSR, filters and responsive layouts.");
  console.log(`Screenshots: ${screenshots}`);
} finally {
  await browser.close();
  if (createdVariant) {
    await sql.query(`DELETE FROM "${schema}".inventory_balances WHERE "productId"=$1`, [createdVariant]);
    await sql.query(`DELETE FROM "${schema}".audit_events WHERE "resourceId"=$1`, [createdVariant]);
    await sql.query(`DELETE FROM "${schema}".products WHERE id=$1 AND data->>'code'=$2`, [createdVariant, `${code}-800`]);
  }
  if (created) {
    await sql.query(`DELETE FROM "${schema}".audit_events WHERE "resourceId"=$1`, [created]);
    await sql.query(`DELETE FROM "${schema}".products WHERE id=$1 AND data->>'code'=$2`, [created, code]);
  }
  await sql.end();
  for (const url of uploaded) {
    if (/^\/media\/uploads\/[a-f0-9-]+\.webp$/.test(url)) await unlink(resolve(mediaRoot, url.slice("/media/".length))).catch(() => {});
  }
}

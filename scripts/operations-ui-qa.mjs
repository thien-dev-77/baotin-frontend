import { chromium } from "@playwright/test";
import { readFile, mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";

const base = process.env.QA_BASE_URL || "http://localhost:3010";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname))
  throw new Error("QA only runs locally.");
const backend = resolve(process.env.QA_BACKEND_DIR || "../backend");
const requireBackend = createRequire(resolve(backend, "package.json"));
const env = requireBackend("dotenv").parse(
  await readFile(resolve(backend, ".env.local"), "utf8"),
);
if (new URL(env.DATABASE_URL).hostname !== "127.0.0.1")
  throw new Error("QA must not target Supabase.");
const screenshots = "/private/tmp/baotin-operations-ui";
await mkdir(screenshots, { recursive: true });
const browser = await chromium.launch();
const { Client } = requireBackend("pg");
const sql = new Client({ connectionString: env.DATABASE_URL });
await sql.connect();
const schema = env.DB_SCHEMA || "baotin_app";
if (!/^[a-z][a-z0-9_]{0,40}$/.test(schema))
  throw new Error("Invalid test schema");
let createdUser = "";
const problems = [];
try {
  for (const width of [1440, 768, 390, 320]) {
    const context = await browser.newContext({
      viewport: { width, height: 1000 },
      hasTouch: width < 1024,
      isMobile: width < 768,
    });
    try {
      const page = await context.newPage();
      page.on("pageerror", (error) => problems.push(error.message));
      const login = await context.request.post(
        `${base}/api/backend/auth/login`,
        {
          headers: { Origin: base, "X-BaoTin-Client": "web" },
          data: { identity: "admin@baotin.local", password: env.SEED_PASSWORD },
        },
      );
      assert.equal(login.status(), 201, "QA login failed");
      for (const [path, heading] of [
        ["pricing", "Bảng giá B2B"],
        ["ledger", "Sổ tồn kho & công nợ"],
        ["users", "Tài khoản & phân quyền"],
        ["integrations", "KiotViet"],
        ["settings", "Bảo mật tài khoản"],
      ]) {
        await page.goto(`${base}/admin/${path}`);
        await page
          .getByRole("heading", { name: heading, exact: true })
          .waitFor();
        if (path !== "settings")
          await page
            .locator(path === "integrations" ? '[role="tablist"]' : "table")
            .waitFor();
        assert.equal(
          await page.getByLabel("Kỳ báo cáo", { exact: true }).count(),
          0,
        );
        assert.equal(
          await page.getByLabel("Chi nhánh", { exact: true }).count(),
          ["users", "settings"].includes(path) ? 0 : 1,
        );
        if (path === "pricing") {
          const refreshed = page.waitForResponse(
            (response) =>
              response.url().includes("/admin/pricing?branch=") &&
              response.request().method() === "GET",
          );
          await page
            .getByRole("button", { name: "Làm mới dữ liệu", exact: true })
            .click();
          assert.equal((await refreshed).status(), 200);
          await page.locator("table").waitFor();
        }
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
          `Overflow: ${path} ${width}`,
        );
        await page.screenshot({
          path: `${screenshots}/${path}-${width}.png`,
          fullPage: true,
        });
      }
      await page.goto(`${base}/admin/pricing`);
      await page
        .getByRole("button", { name: "Tạo bảng giá", exact: true })
        .click();
      await page.getByRole("dialog").waitFor();
      await page.screenshot({
        path: `${screenshots}/pricing-form-${width}.png`,
        fullPage: true,
      });
      await page.getByRole("button", { name: "Đóng", exact: true }).click();
      await page.goto(`${base}/admin/users`);
      await page
        .getByRole("button", { name: "Tạo nhân viên", exact: true })
        .click();
      await page.getByRole("dialog").waitFor();
      await page.screenshot({
        path: `${screenshots}/user-form-${width}.png`,
        fullPage: true,
      });
      assert.equal(
        await page
          .getByRole("dialog")
          .locator('input[type="password"]')
          .count(),
        2,
      );
      if (width === 1440) {
        const email = `qa-${randomUUID()}@example.test`;
        await page
          .getByLabel("Họ tên", { exact: false })
          .fill("QA temporary staff");
        await page.getByLabel("Email đăng nhập", { exact: false }).fill(email);
        await page.locator('input[name="password"]').fill(env.SEED_PASSWORD);
        await page.locator('input[name="confirm"]').fill(env.SEED_PASSWORD);
        const created = page.waitForResponse(
          (response) =>
            response.url().endsWith("/admin/users") &&
            response.request().method() === "POST",
        );
        await page
          .getByRole("button", { name: "Lưu tài khoản", exact: true })
          .click();
        const response = await created;
        assert.equal(response.status(), 201);
        createdUser = (await response.json()).id;
        await page.getByLabel(`Sửa ${email}`, { exact: true }).click();
        await page
          .getByLabel("Họ tên", { exact: false })
          .fill("QA updated staff");
        const saved = page.waitForResponse(
          (response) =>
            response.url().endsWith("/admin/users") &&
            response.request().method() === "POST",
        );
        await page
          .getByRole("button", { name: "Lưu tài khoản", exact: true })
          .click();
        assert.equal((await saved).status(), 201);
        await page
          .getByRole("cell", { name: new RegExp(`QA updated staff`) })
          .waitFor();
      } else {
        await page.getByRole("button", { name: "Đóng", exact: true }).click();
      }
      console.log(`Operations UI OK: ${width}px`);
    } finally {
      await context.close();
    }
  }
  assert.deepEqual(problems, []);
} finally {
  await browser.close();
  if (createdUser) {
    await sql.query(
      `DELETE FROM "${schema}".audit_events WHERE "resourceId"=$1`,
      [createdUser],
    );
    await sql.query(`DELETE FROM "${schema}".users WHERE id=$1`, [createdUser]);
  }
  await sql.end();
}

import { chromium, expect } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const base = process.env.QA_BASE_URL || "http://localhost:3010";
const directory = "/tmp/bao-tin-ui-qa/admin-warehouse";
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {}) });
const issues = [];

async function go(page, route = "/warehouse") {
  await page.goto(`${base}/admin${route}`);
  await expect(page.locator("#admin-content")).toHaveAttribute("aria-busy", "false");
}
function dialog(page) { return page.locator("dialog[open]"); }
async function close(page) { await dialog(page).locator('button[aria-label="Đóng"]').click(); }
async function checkAll(page) { for (const checkbox of await dialog(page).getByRole("checkbox").all()) await checkbox.check(); }
async function report(page, quantity = "2") {
  await dialog(page).getByRole("button", { name: "Báo thiếu hàng", exact: true }).click();
  await page.getByLabel("Số lượng thiếu", { exact: false }).fill(quantity);
  await page.getByLabel("Ghi chú thiếu hàng", { exact: false }).fill("Thiếu hàng tại vị trí soạn, cần đối chiếu lại.");
  await page.getByRole("button", { name: "Gửi báo thiếu", exact: true }).click();
}
function watch(page) { page.on("pageerror", (error) => issues.push(error.message)); }

try {
  for (const [width, height, touch] of [[1440, 1000, false], [1024, 900, false], [768, 1024, true], [390, 844, true], [320, 812, true]]) {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: touch });
    try {
      const page = await context.newPage();
      watch(page);
      await go(page);
      await page.evaluate(() => document.fonts.ready);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("Soạn hàng & giao hàng");
      await expect(page.locator("tbody tr")).toHaveCount(3);
      await expect(page.getByLabel("Kỳ báo cáo")).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Soạn đơn BT26100003", exact: true })).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: `${directory}/${width}-queue.png`, fullPage: true });
      for (const status of ["Chờ soạn hàng", "Đang soạn", "Sẵn sàng giao"]) {
        await page.getByRole("group", { name: "Trạng thái soạn hàng" }).getByRole("button", { name: status, exact: true }).click();
        await expect(page.locator("tbody tr")).toHaveCount(1);
      }
      await page.getByRole("group", { name: "Trạng thái soạn hàng" }).getByRole("button", { name: "Tất cả", exact: true }).click();
      await page.getByLabel("Chi nhánh", { exact: true }).selectOption("Tuy Hòa");
      await expect(page.getByText("Không có dữ liệu phù hợp.", { exact: true })).toBeVisible();
      await expect(page.getByRole("button", { name: "Xuất CSV" })).toBeDisabled();
      await page.getByLabel("Chi nhánh", { exact: true }).selectOption("Nha Trang");
      await expect(page.locator("tbody tr")).toHaveCount(1);
      await page.getByLabel("Chi nhánh", { exact: true }).selectOption("Quy Nhơn");
      await page.getByRole("searchbox").fill("BT-RK-01");
      await expect(page.locator("tbody tr")).toHaveCount(1);
      await page.getByRole("searchbox").fill("");
      await page.getByRole("button", { name: "Soạn đơn BT26100004", exact: true }).click();
      await expect(dialog(page).getByRole("button", { name: "Hủy đơn", exact: true })).toHaveCount(0);
      await expect(dialog(page).getByText("Tổng giá trị", { exact: true })).toHaveCount(0);
      await expect(dialog(page).getByRole("checkbox").first()).toBeDisabled();
      await dialog(page).getByRole("button", { name: "Bắt đầu soạn", exact: true }).click();
      await expect(dialog(page).getByRole("checkbox").first()).toBeEnabled();
      await expect(dialog(page).getByRole("button", { name: "Hoàn tất soạn hàng", exact: true })).toBeDisabled();
      await dialog(page).locator("img").evaluateAll((images) => Promise.all(images.map((image) => image.decode())));
      await page.screenshot({ path: `${directory}/${width}-picking.png` });
      await report(page, "1");
      await expect(dialog(page).getByRole("button", { name: "Hoàn tất soạn hàng", exact: true })).toBeDisabled();
      await expect(dialog(page).getByRole("button", { name: "Xác nhận đã đủ hàng", exact: true })).toBeDisabled();
      expect(await dialog(page).evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
      await page.screenshot({ path: `${directory}/${width}-shortage.png` });
      await page.getByLabel("Kết quả xử lý thiếu hàng", { exact: false }).fill("Đã đối chiếu và bổ sung đủ hàng mẫu.");
      await checkAll(page);
      await dialog(page).getByRole("button", { name: "Xác nhận đã đủ hàng", exact: true }).click();
      await expect(dialog(page).getByRole("button", { name: "Hoàn tất soạn hàng", exact: true })).toBeEnabled();
      await dialog(page).getByRole("button", { name: "Hoàn tất soạn hàng", exact: true }).click();
      await dialog(page).getByRole("button", { name: "Bàn giao vận chuyển", exact: true }).click();
      await expect(dialog(page).getByRole("button", { name: "Xác nhận đã giao", exact: true })).toHaveCount(0);
      await expect(dialog(page).getByRole("region", { name: "Lịch sử thao tác mẫu" })).toContainText("Đã xử lý thiếu hàng");
      await close(page);
      await expect(page.getByRole("button", { name: "Soạn đơn BT26100004", exact: true })).toHaveCount(0);
      console.log(`PASS warehouse ${width}px: queue, branch, SKU search, checklist, shortage, resolution, handoff`);
    } finally { await context.close(); }
  }

  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  try {
    const page = await context.newPage();
    watch(page);
    await go(page, "/warehouse?order=BT26100004");
    await dialog(page).getByRole("button", { name: "Bắt đầu soạn", exact: true }).click();
    await dialog(page).getByRole("checkbox").first().check();
    await expect(dialog(page).getByRole("button", { name: "Hoàn tất soạn hàng", exact: true })).toBeDisabled();
    await dialog(page).getByRole("button", { name: "Báo thiếu hàng", exact: true }).click();
    const quantity = page.getByLabel("Số lượng thiếu", { exact: false });
    await quantity.fill("100");
    await page.getByLabel("Ghi chú thiếu hàng", { exact: false }).fill("Ghi nhận thiếu hàng mẫu.");
    await expect(page.getByRole("button", { name: "Gửi báo thiếu", exact: true })).toBeDisabled();
    await quantity.fill("1.5");
    await expect(page.getByRole("button", { name: "Gửi báo thiếu", exact: true })).toBeDisabled();
    await quantity.fill("2");
    await page.getByLabel("Ghi chú thiếu hàng", { exact: false }).fill("   ");
    await expect(page.getByRole("button", { name: "Gửi báo thiếu", exact: true })).toBeDisabled();
    await page.getByLabel("Ghi chú thiếu hàng", { exact: false }).fill("Thiếu 2 sản phẩm, cần kiểm lại vị trí kho.");
    await page.getByRole("button", { name: "Gửi báo thiếu", exact: true }).click();
    await expect(dialog(page).getByRole("checkbox").first()).not.toBeChecked();
    await checkAll(page);
    await expect(dialog(page).getByRole("button", { name: "Hoàn tất soạn hàng", exact: true })).toBeDisabled();
    await close(page);
    await page.getByRole("button", { name: "Có báo thiếu", exact: true }).click();
    await expect(page.locator("tbody tr")).toHaveCount(1);
    const filePromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Xuất CSV" }).click();
    const file = await filePromise;
    await file.saveAs(`${directory}/shortages.csv`);
    const csv = await readFile(`${directory}/shortages.csv`, "utf8");
    expect(csv).toContain('"BT26100004"');
    expect(csv).toContain('"Chưa xử lý"');
    expect(csv).not.toContain("Giá");
    await go(page, "/orders?order=BT26100004");
    await expect(dialog(page).getByRole("button", { name: "Hoàn tất soạn hàng", exact: true })).toBeDisabled();
    await expect(dialog(page)).toContainText("Đơn đang có báo thiếu hàng chưa được xử lý.");
    await page.reload();
    await expect(dialog(page)).toContainText("Thiếu 2 sản phẩm, cần kiểm lại vị trí kho.");
    const before = await page.evaluate(() => JSON.parse(localStorage.getItem("baotin-admin-preview-v1")));
    expect(before.warehouse.BT26100004.issue.quantity).toBe(2);
    expect(before.warehouse.BT26100004.checks["BT-RK-01"]).toBe(true);
    await page.getByLabel("Kết quả xử lý thiếu hàng", { exact: false }).fill("Đã kiểm đủ số lượng theo đơn.");
    await dialog(page).getByRole("button", { name: "Xác nhận đã đủ hàng", exact: true }).click();
    await dialog(page).getByRole("button", { name: "Hoàn tất soạn hàng", exact: true }).click();
    await dialog(page).getByRole("button", { name: "Bàn giao vận chuyển", exact: true }).click();
    await close(page);

    await go(page, "/warehouse?order=BT26100006");
    await report(page, "1");
    await expect(dialog(page).getByRole("button", { name: "Bàn giao vận chuyển", exact: true })).toBeDisabled();
    await page.getByLabel("Kết quả xử lý thiếu hàng", { exact: false }).fill("Đã có đủ hàng mẫu.");
    await expect(dialog(page).getByRole("button", { name: "Xác nhận đã đủ hàng", exact: true })).toBeDisabled();
    await checkAll(page);
    await expect(dialog(page).getByRole("button", { name: "Bàn giao vận chuyển", exact: true })).toBeDisabled();
    await dialog(page).getByRole("button", { name: "Xác nhận đã đủ hàng", exact: true }).click();
    await dialog(page).getByRole("button", { name: "Bàn giao vận chuyển", exact: true }).click();
    await close(page);
    await go(page, "/warehouse?order=BT26100003");
    await expect(dialog(page).getByRole("button", { name: "Xác nhận đơn", exact: true })).toHaveCount(0);
    await expect(dialog(page).getByRole("button", { name: "Hủy đơn", exact: true })).toHaveCount(0);
    await close(page);
    await go(page, "/orders?order=BT26100003");
    await dialog(page).getByRole("button", { name: "Xác nhận đơn", exact: true }).click();
    await close(page);
    await go(page);
    await expect(page.getByRole("button", { name: "Soạn đơn BT26100003", exact: true })).toBeVisible();
    await page.evaluate(() => {
      const state = JSON.parse(localStorage.getItem("baotin-admin-preview-v1"));
      state.orders.BT26100012 = { status: "Chờ soạn hàng" };
      localStorage.setItem("baotin-admin-preview-v1", JSON.stringify(state));
    });
    await go(page);
    await expect(page.getByRole("button", { name: "Soạn đơn BT26100012", exact: true })).toBeVisible();
    const record = await page.evaluate(() => JSON.parse(localStorage.getItem("baotin-admin-preview-v1")).warehouse.BT26100004);
    expect(record.history.some((event) => event.label === "Báo thiếu hàng")).toBe(true);
    expect(record.history.some((event) => event.label === "Đã xử lý thiếu hàng")).toBe(true);
    expect(record.issue.resolvedAt).toBeTruthy();
    expect(record.issue.resolution).toBe("Đã kiểm đủ số lượng theo đơn.");

    await page.evaluate(() => localStorage.setItem("baotin-admin-preview-v1", JSON.stringify({ orders: { BT26100003: { status: "Chờ soạn hàng" } }, customers: {}, approvals: {}, published: {} })));
    await go(page);
    await expect(page.getByRole("button", { name: "Soạn đơn BT26100003", exact: true })).toBeVisible();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("baotin-admin-preview-v1")).warehouse)).toEqual({});
    await page.evaluate(() => localStorage.setItem("baotin-admin-preview-v1", JSON.stringify({ warehouse: { BT26100004: { checks: { "unknown-SKU": true }, history: [{ at: "not-a-time", label: "invalid" }], issue: { productId: "BT-RK-01", quantity: 9999, note: "invalid", reportedAt: new Date().toISOString() } } } })));
    await go(page, "/warehouse?order=BT26100004");
    await expect(dialog(page).getByText("Báo thiếu hàng", { exact: true })).toHaveCount(1);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("baotin-admin-preview-v1")).warehouse.BT26100004)).toEqual({ checks: {}, history: [] });
    await close(page);
    await page.getByRole("button", { name: "Khôi phục dữ liệu mẫu", exact: true }).click();
    await dialog(page).getByRole("button", { name: "Khôi phục", exact: true }).click();
    await expect(page.locator("tbody tr")).toHaveCount(3);
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("baotin-admin-preview-v1")).warehouse)).toEqual({});
    console.log("PASS warehouse rules: quantity validation, cross-page gate, persistence/history, ready-stage shortage, confirmed-only queue, older orders, legacy/corrupt storage, reset");
  } finally { await context.close(); }

  expect(issues).toEqual([]);
  const result = { passed: true, viewports: 5, confirmedOrdersOnly: true, checklist: true, shortageGate: true, persistence: true, history: true, csv: true, legacyStorage: true, issues };
  await writeFile(`${directory}/report.json`, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally { await browser.close(); }

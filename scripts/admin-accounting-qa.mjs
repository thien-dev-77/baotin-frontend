import { chromium, expect } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const base = process.env.QA_BASE_URL || "http://localhost:3010";
const directory = "/tmp/bao-tin-ui-qa/admin-accounting";
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {}) });
const issues = [];
const dialog = (page) => page.locator("dialog[open]");
const field = (page, name) => page.getByLabel(name, { exact: false }).and(page.locator("input, select, textarea"));
async function go(page, path = "/accounting") { await page.goto(`${base}/admin${path}`); await expect(page.locator("#admin-content")).toHaveAttribute("aria-busy", "false"); }
async function close(page) { await dialog(page).locator('button[aria-label="Đóng"]').click(); }
async function store(page) { return page.evaluate(() => JSON.parse(localStorage.getItem("baotin-admin-preview-v1"))); }
async function newReceipt(page, reference, amount = "100000") {
  await page.getByRole("tab", { name: "Đơn cần thu", exact: true }).click();
  await page.getByRole("button", { name: "Lập phiếu BT26100004", exact: true }).click();
  await field(page, "Số tiền thu").fill(amount);
  await field(page, "Mã giao dịch / chứng từ").fill(reference);
  await page.getByRole("button", { name: "Lập phiếu thu", exact: true }).click();
}
try {
  for (const [width, height, touch] of [[1440, 1000, false], [1024, 900, false], [768, 1024, true], [390, 844, true], [320, 812, true]]) {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: touch });
    try {
      const page = await context.newPage();
      page.on("pageerror", (error) => issues.push(error.message));
      await go(page);
      await expect(page.getByText("Không có dữ liệu phù hợp.", { exact: true })).toBeVisible();
      await page.getByRole("tab", { name: "Đơn cần thu", exact: true }).click();
      await expect(page.getByRole("button", { name: "Lập phiếu BT26100001", exact: true })).toHaveCount(0);
      await page.evaluate(() => document.fonts.ready);
      expect(await page.locator("h1").evaluate((element) => getComputedStyle(element).fontFamily)).toContain("Inter");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: `${directory}/${width}-outstanding.png`, fullPage: true });
      await newReceipt(page, `GD-${width}`);
      await expect(dialog(page)).toHaveCount(0);
      expect((await store(page)).receipts[0].status).toBe("Chờ đối chiếu");
      await page.getByRole("button", { name: "Xem phiếu PTM0001", exact: true }).click();
      await expect(page.getByRole("button", { name: "Xác nhận đối chiếu", exact: true })).toBeDisabled();
      await field(page, "Số tiền thực nhận").fill("90000");
      await field(page, "Kết quả kiểm tra").fill("Kiểm tra sao kê mẫu.");
      await page.getByRole("button", { name: "Xác nhận đối chiếu", exact: true }).click();
      await expect(dialog(page).getByRole("alert")).toContainText("không khớp");
      expect((await store(page)).receipts[0].status).toBe("Chờ đối chiếu");
      await field(page, "Số tiền thực nhận").fill("100000");
      expect(await dialog(page).evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
      await page.screenshot({ path: `${directory}/${width}-reconcile.png` });
      await page.getByRole("button", { name: "Xác nhận đối chiếu", exact: true }).click();
      await expect(dialog(page)).toHaveCount(0);
      await page.reload();
      await expect(page.locator("tbody").getByText("Đã đối chiếu", { exact: true })).toBeVisible();
      expect((await store(page)).receipts[0].reconciliation.amount).toBe(100000);
      await newReceipt(page, `gd-${width}`, "50000");
      await expect(dialog(page).getByRole("alert")).toContainText("đã có phiếu thu");
      await field(page, "Mã giao dịch / chứng từ").fill(`GD2-${width}`);
      await page.getByRole("button", { name: "Lập phiếu thu", exact: true }).click();
      await expect(dialog(page)).toHaveCount(0);
      expect((await store(page)).receipts).toHaveLength(2);
      await page.getByRole("button", { name: "Xem phiếu PTM0002", exact: true }).click();
      await field(page, "Mã đối chiếu").fill(`GD-${width}`);
      await field(page, "Kết quả kiểm tra").fill("Thử đối chiếu trùng.");
      await page.getByRole("button", { name: "Xác nhận đối chiếu", exact: true }).click();
      await expect(dialog(page).getByRole("alert")).toContainText("đã được sử dụng");
      await close(page);
      const download = page.waitForEvent("download");
      await page.getByRole("button", { name: "Xuất CSV", exact: true }).click();
      const csv = await download;
      await csv.saveAs(`${directory}/${width}-receipts.csv`);
      expect(await readFile(`${directory}/${width}-receipts.csv`, "utf8")).toContain('"PTM0001"');
      await page.getByLabel("Chi nhánh", { exact: true }).selectOption("Tuy Hòa");
      await expect(page.getByText("Không có dữ liệu phù hợp.", { exact: true })).toBeVisible();
      await page.getByLabel("Chi nhánh", { exact: true }).selectOption("Quy Nhơn");
      await go(page, "/orders?order=BT26100004");
      await expect(page.getByRole("button", { name: "Hủy đơn", exact: true })).toBeDisabled();
      await expect(dialog(page)).toContainText("Đơn có phiếu thu còn hiệu lực");
      expect((await store(page)).orders.BT26100004).toBeUndefined();
      await go(page);
      for (const id of ["PTM0001", "PTM0002"]) {
        await page.getByRole("button", { name: `Xem phiếu ${id}`, exact: true }).click();
        await page.getByRole("button", { name: "Hủy phiếu thu", exact: true }).click();
        await expect(page.getByRole("button", { name: "Xác nhận hủy phiếu", exact: true })).toBeDisabled();
        await field(page, "Lý do hủy phiếu").fill("Chứng từ mẫu bị nhập sai.");
        await page.getByRole("button", { name: "Xác nhận hủy phiếu", exact: true }).click();
        await expect(dialog(page)).toHaveCount(0);
      }
      await go(page, "/orders?order=BT26100004");
      await page.getByRole("button", { name: "Hủy đơn", exact: true }).click();
      await field(page, "Lý do hủy đơn").fill("Đã xử lý phiếu thu mẫu.");
      await page.getByRole("button", { name: "Xác nhận hủy", exact: true }).click();
      await expect.poll(async () => (await store(page)).orders.BT26100004?.status).toBe("Đã hủy");
      await go(page);
      expect((await store(page)).receipts).toHaveLength(2);
      expect((await store(page)).receipts.every((item) => item.status === "Đã hủy")).toBe(true);
      await page.evaluate(() => localStorage.setItem("baotin-admin-preview-v1", JSON.stringify({ orders: { BT26100002: { status: "Chờ soạn hàng" } } })));
      await go(page);
      await page.getByRole("tab", { name: "Đơn cần thu", exact: true }).click();
      await page.getByRole("button", { name: "Hạn thanh toán BT26100002", exact: true }).click();
      await field(page, "Ngày đến hạn").fill("2026-10-04");
      await page.getByRole("button", { name: "Lưu hạn thanh toán", exact: true }).click();
      await page.reload();
      expect((await store(page)).paymentDueDates.BT26100002).toBe("2026-10-04");
      await go(page, "/credit?status=overlimit");
      await expect(page.locator("tbody tr")).toHaveCount(1);
      await expect(page.locator("tbody")).toContainText("28.500.000");
      await page.evaluate(() => {
        localStorage.setItem("baotin-commerce-v1", JSON.stringify({ cart: [], favorites: [], orders: [], coupon: "KEEP" }));
        localStorage.setItem("baotin-admin-preview-v1", JSON.stringify({ receipts: [{ id: "PTM0001", orderId: "unknown", amount: -1 }], paymentDueDates: { BT26100002: "2026-02-30", unknown: "2026-10-04" } }));
      });
      await go(page);
      expect((await store(page)).receipts).toEqual([]);
      expect((await store(page)).paymentDueDates).toEqual({});
      const commerce = await page.evaluate(() => localStorage.getItem("baotin-commerce-v1"));
      await page.getByRole("button", { name: "Khôi phục dữ liệu mẫu", exact: true }).click();
      await dialog(page).getByRole("button", { name: "Khôi phục", exact: true }).click();
      expect(await page.evaluate(() => localStorage.getItem("baotin-commerce-v1"))).toBe(commerce);
      console.log(`PASS accounting ${width}px: partial receipt, mismatch, duplicate, reload, void, cancellation gate, due date, branch, CSV, legacy/reset`);
    } finally { await context.close(); }
  }
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    page.on("pageerror", (error) => issues.push(error.message));
    await go(page);
    await page.getByRole("tab", { name: "Đơn cần thu", exact: true }).click();
    await page.getByRole("button", { name: "Lập phiếu BT26100004", exact: true }).click();
    const available = Number(await field(page, "Số tiền thu").inputValue());
    await dialog(page).locator("form").evaluate((form) => { form.noValidate = true; });
    await field(page, "Mã giao dịch / chứng từ").fill("VALIDATION");
    for (const amount of ["0", "-1", "1.5", String(available + 1)]) {
      await field(page, "Số tiền thu").fill(amount);
      await page.getByRole("button", { name: "Lập phiếu thu", exact: true }).click();
      await expect(dialog(page).getByRole("alert")).toContainText("Số tiền");
      expect((await store(page)).receipts).toEqual([]);
    }
    await field(page, "Số tiền thu").fill(String(available));
    for (const date of ["2026-10-02", "2026-10-05"]) {
      await field(page, "Ngày thu").fill(date);
      await page.getByRole("button", { name: "Lập phiếu thu", exact: true }).click();
      await expect(dialog(page).getByRole("alert")).toContainText("Ngày thu");
    }
    await field(page, "Ngày thu").fill("2026-10-04");
    await page.getByRole("button", { name: "Lập phiếu thu", exact: true }).click();
    await expect(dialog(page)).toHaveCount(0);
    await page.getByRole("tab", { name: "Đơn cần thu", exact: true }).click();
    await expect(page.getByRole("button", { name: "Lập phiếu BT26100004", exact: true })).toBeDisabled();
    await page.getByRole("tab", { name: "Phiếu thu", exact: true }).click();
    await page.getByRole("button", { name: "Xem phiếu PTM0001", exact: true }).click();
    await field(page, "Kết quả kiểm tra").fill("Đã nhận đủ toàn bộ tiền theo đơn.");
    await page.getByRole("button", { name: "Xác nhận đối chiếu", exact: true }).click();
    await expect(dialog(page)).toHaveCount(0);
    await page.getByRole("tab", { name: "Đơn cần thu", exact: true }).click();
    await expect(page.getByRole("button", { name: "Lập phiếu BT26100004", exact: true })).toHaveCount(0);
    await page.reload();
    const saved = await store(page);
    const receipt = saved.receipts[0];
    const variants = [
      { ...receipt, branch: "Tuy Hòa" },
      { ...receipt, amount: available + 1 },
      { ...receipt, amount: -1 },
      { ...receipt, date: "2026-02-30" },
      { ...receipt, reconciliation: { ...receipt.reconciliation, amount: 1 } },
      { ...receipt, reconciliation: undefined },
      { ...receipt, createdAt: "invalid" }
    ];
    for (const variant of variants) {
      await page.evaluate((value) => localStorage.setItem("baotin-admin-preview-v1", JSON.stringify({ receipts: [value] })), variant);
      await go(page);
      expect((await store(page)).receipts).toEqual([]);
    }
    await page.evaluate((value) => localStorage.setItem("baotin-admin-preview-v1", JSON.stringify({ receipts: [value, { ...value, id: "PTM0002" }] })), receipt);
    await go(page);
    expect((await store(page)).receipts).toHaveLength(1);
    console.log("PASS accounting guards: invalid amount/date, full payment, reservation, branch/amount/audit parser, duplicate hydration");
  } finally { await context.close(); }
  expect(issues).toEqual([]);
  const report = { passed: true, viewports: 5, issues };
  await writeFile(`${directory}/report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} finally { await browser.close(); }

import { chromium, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

const base = process.env.QA_BASE_URL || "http://localhost:3010";
const directory = "/tmp/bao-tin-ui-qa/admin-approvals";
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {}) });
const issues = [];
const dialog = (page) => page.locator("dialog[open]");
const field = (page, name) => page.getByLabel(name, { exact: false }).and(page.locator("input, select, textarea"));
async function go(page, route) {
  await page.goto(`${base}/admin${route}`);
  await expect(page.locator("#admin-content")).toHaveAttribute("aria-busy", "false");
}
function watch(page) { page.on("pageerror", (error) => issues.push(error.message)); }
async function close(page) { await dialog(page).locator('button[aria-label="Đóng"]').click(); }
async function dismissToast(page) { await page.locator('button[aria-label="Đóng thông báo"]').evaluateAll((buttons) => buttons.forEach((button) => button.click())); }
async function newOrder(page, customer = "KH001", credit = false) {
  await go(page, "/orders/new");
  await page.getByLabel("Khách hàng", { exact: true }).selectOption(customer);
  await page.getByRole("button", { name: "Thêm sản phẩm", exact: true }).click();
  await dialog(page).getByRole("searchbox").fill("LED-12V-8W");
  await dialog(page).getByRole("button", { name: "Thêm LED-12V-8W", exact: true }).click();
  await dialog(page).getByRole("button", { name: /^Xong/ }).click();
  await page.getByRole("spinbutton", { name: "Số lượng LED-12V-8W", exact: true }).fill("2");
  if (credit) await field(page, "Thanh toán").selectOption("Công nợ B2B");
  await page.getByRole("button", { name: "Tạo đơn chờ xác nhận", exact: true }).click();
  await expect(page).toHaveURL(/orders\?order=BTM2610\d+/);
  await expect(dialog(page)).toBeVisible();
  return new URL(page.url()).searchParams.get("order");
}
async function send(page, orderId, type = "price", price = "35000") {
  await go(page, `/approvals/new?order=${orderId}&type=${type}`);
  if (type === "price") await field(page, "Giá đề nghị LED-12V-8W").fill(price);
  await field(page, "Lý do đề nghị").fill(type === "price" ? "Khách đề nghị giá cho đơn công trình này." : "Khách đề nghị nhận hàng trước, cần xem xét khoản quá hạn.");
  await page.getByRole("button", { name: "Gửi yêu cầu duyệt", exact: true }).click();
  await expect(page).toHaveURL(/approvals\?request=YCM\d+/);
  await expect(dialog(page)).toBeVisible();
  return new URL(page.url()).searchParams.get("request");
}
async function decision(page, id, approve = true) {
  await go(page, `/approvals?request=${id}`);
  await field(page, "Ý kiến xử lý").fill(approve ? "Duyệt ngoại lệ cho riêng đơn hàng này." : "Chưa phù hợp, đề nghị gửi lại mức giá khác.");
  await dialog(page).getByRole("button", { name: approve ? "Duyệt yêu cầu" : "Từ chối", exact: true }).click();
  await expect(dialog(page)).toHaveCount(0);
}

try {
  for (const [width, height, touch] of [[1440, 1000, false], [1024, 900, false], [768, 1024, true], [390, 844, true], [320, 812, true]]) {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: touch });
    try {
      const page = await context.newPage();
      watch(page);
      const orderId = await newOrder(page);
      await dialog(page).getByRole("link", { name: "Xin duyệt ngoại lệ", exact: true }).click();
      await expect(page).toHaveURL(`${base}/admin/approvals/new?order=${orderId}`);
      await expect(field(page, "Đơn B2B chờ xác nhận")).toHaveValue(orderId);
      await field(page, "Giá đề nghị LED-12V-8W").fill("35000");
      await field(page, "Lý do đề nghị").fill("Khách xin giá dự án cho đơn LED tủ bếp.");
      await page.evaluate(() => document.fonts.ready);
      await page.locator("#admin-content img").evaluateAll((images) => Promise.all(images.map((image) => image.decode())));
      expect(await page.locator("h1").evaluate((element) => getComputedStyle(element).fontFamily)).toContain("Inter");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await dismissToast(page);
      await page.evaluate(() => scrollTo(0, 0));
      await page.screenshot({ path: `${directory}/${width}-price-form.png`, fullPage: true });
      await page.getByRole("button", { name: "Gửi yêu cầu duyệt", exact: true }).click();
      await expect(page).toHaveURL(/approvals\?request=YCM\d+/);
      const requestId = new URL(page.url()).searchParams.get("request");
      await expect(dialog(page).getByRole("region", { name: "Dữ liệu đề nghị" })).toContainText("40.500");
      await expect(dialog(page).getByRole("region", { name: "Dữ liệu đề nghị" })).toContainText("70.000");
      await expect(dialog(page).getByRole("button", { name: "Duyệt yêu cầu", exact: true })).toBeDisabled();
      await field(page, "Ý kiến xử lý").fill("   ");
      await expect(dialog(page).getByRole("button", { name: "Duyệt yêu cầu", exact: true })).toBeDisabled();
      await field(page, "Ý kiến xử lý").fill("Duyệt mức giá đề nghị cho đơn này.");
      expect(await dialog(page).evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
      await dismissToast(page);
      await page.screenshot({ path: `${directory}/${width}-price-review.png` });
      await go(page, `/orders?order=${orderId}`);
      await expect(dialog(page).getByRole("button", { name: "Xác nhận đơn", exact: true })).toBeDisabled();
      await expect(dialog(page).getByRole("link", { name: "Sửa đơn", exact: true })).toHaveCount(0);
      await decision(page, requestId);
      await go(page, `/orders?order=${orderId}`);
      await expect(dialog(page)).toContainText("70.000");
      await expect(dialog(page).getByRole("button", { name: "Xác nhận đơn", exact: true })).toBeEnabled();
      await page.reload();
      await expect(dialog(page)).toContainText("70.000");
      await expect(dialog(page).getByRole("region", { name: "Lịch sử thao tác mẫu" })).toContainText("Duyệt ngoại lệ");
      await go(page, "/warehouse");
      await expect(page.getByRole("button", { name: `Soạn đơn ${orderId}`, exact: true })).toHaveCount(0);
      await go(page, `/orders?order=${orderId}`);
      await dialog(page).getByRole("button", { name: "Xác nhận đơn", exact: true }).click();
      await go(page, "/warehouse");
      await expect(page.getByRole("button", { name: `Soạn đơn ${orderId}`, exact: true })).toBeVisible();

      const creditOrder = await newOrder(page, "KH002", true);
      await go(page, `/approvals/new?order=${creditOrder}&type=credit`);
      await expect(page.getByRole("tab", { name: "Công nợ", exact: true })).toHaveAttribute("aria-selected", "true");
      await field(page, "Lý do đề nghị").fill("Đề nghị ngoại lệ do khách có khoản quá hạn.");
      await dismissToast(page);
      await page.evaluate(() => scrollTo(0, 0));
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: `${directory}/${width}-credit-form.png`, fullPage: true });
      await page.getByRole("button", { name: "Gửi yêu cầu duyệt", exact: true }).click();
      await expect(page).toHaveURL(/approvals\?request=YCM\d+/);
      const creditRequest = new URL(page.url()).searchParams.get("request");
      await expect(dialog(page).getByRole("region", { name: "Dữ liệu đề nghị" })).toContainText("28.500.000");
      await dismissToast(page);
      expect(await dialog(page).evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
      await page.screenshot({ path: `${directory}/${width}-credit-review.png` });
      await decision(page, creditRequest);
      await go(page, `/orders?order=${creditOrder}`);
      await expect(dialog(page).getByRole("button", { name: "Xác nhận đơn", exact: true })).toBeEnabled();
      await go(page, "/credit");
      await page.getByRole("button", { name: "Xem khách KH002", exact: true }).click();
      await expect(dialog(page)).toContainText("25.000.000");
      await expect(dialog(page)).toContainText("28.500.000");
      console.log(`PASS approvals ${width}px: price/credit forms, snapshots, font/images, scope, reload, confirm gate, warehouse`);
    } finally { await context.close(); }
  }

  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  try {
    const page = await context.newPage();
    watch(page);
    const orderId = await newOrder(page, "KH002", true);
    await go(page, `/approvals/new?order=${orderId}`);
    await field(page, "Lý do đề nghị").fill("Thử giá chưa thay đổi.");
    await page.getByRole("button", { name: "Gửi yêu cầu duyệt", exact: true }).click();
    await expect(page.locator("#admin-content").getByRole("alert")).toContainText("ít nhất một SKU giảm giá");
    const priceInput = field(page, "Giá đề nghị LED-12V-8W");
    for (const price of ["0", "40501", "35000.5"]) {
      await priceInput.fill(price);
      await page.getByRole("button", { name: "Gửi yêu cầu duyệt", exact: true }).click();
      await expect(page).toHaveURL(`${base}/admin/approvals/new?order=${orderId}`);
      expect(await priceInput.evaluate((input) => input.validity.valid)).toBe(false);
    }
    await priceInput.fill("35000");
    await field(page, "Lý do đề nghị").fill("   ");
    await page.getByRole("button", { name: "Gửi yêu cầu duyệt", exact: true }).click();
    await expect(page.locator("#admin-content").getByRole("alert")).toContainText("Nhập lý do");
    const priceRequest = await send(page, orderId);
    await field(page, "Ý kiến xử lý").fill("Kiểm tra phạm vi chi nhánh.");
    await page.getByLabel("Chi nhánh", { exact: true }).selectOption("Tuy Hòa");
    await expect(dialog(page).getByRole("button", { name: "Duyệt yêu cầu", exact: true })).toBeDisabled();
    await expect(dialog(page).getByRole("button", { name: "Từ chối", exact: true })).toBeDisabled();
    await go(page, `/approvals/new?order=${orderId}`);
    await expect(page.getByRole("button", { name: "Gửi yêu cầu duyệt", exact: true })).toBeDisabled();
    await expect(page.getByRole("status").filter({ hasText: "Đã có yêu cầu cùng loại" })).toBeVisible();
    const creditRequest = await send(page, orderId, "credit");
    await decision(page, priceRequest);
    await go(page, `/orders?order=${orderId}`);
    await expect(dialog(page)).toContainText("70.000");
    await expect(dialog(page).getByRole("region", { name: "Ngoại lệ của đơn" }).getByRole("link")).toHaveCount(2);
    await expect(dialog(page).getByRole("button", { name: "Xác nhận đơn", exact: true })).toBeDisabled();
    await decision(page, creditRequest);
    await go(page, `/orders?order=${orderId}`);
    await expect(dialog(page).getByRole("button", { name: "Xác nhận đơn", exact: true })).toBeEnabled();
    await go(page, `/orders/${orderId}/edit`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Không thể sửa đơn");
    await go(page, `/approvals/new?order=${orderId}`);
    await expect(page.getByRole("button", { name: "Gửi yêu cầu duyệt", exact: true })).toBeDisabled();
    await go(page, "/products");
    await page.getByRole("searchbox").fill("LED-12V-8W");
    await expect(page.locator("tbody")).toContainText("45.000");

    const retryOrder = await newOrder(page);
    const rejected = await send(page, retryOrder);
    await decision(page, rejected, false);
    await go(page, `/orders?order=${retryOrder}`);
    await expect(dialog(page)).toContainText("81.000");
    await expect(dialog(page).getByRole("button", { name: "Xác nhận đơn", exact: true })).toBeDisabled();
    const revised = await send(page, retryOrder, "price", "36000");
    expect(revised).not.toBe(rejected);
    await decision(page, revised);
    await go(page, `/orders?order=${retryOrder}`);
    await expect(dialog(page)).toContainText("72.000");
    await expect(dialog(page).getByRole("button", { name: "Xác nhận đơn", exact: true })).toBeEnabled();
    await page.reload();
    await expect(dialog(page)).toContainText("72.000");
    await go(page, `/approvals?request=${rejected}`);
    await expect(dialog(page)).toContainText("Từ chối");
    await expect(dialog(page).getByRole("button", { name: "Duyệt yêu cầu", exact: true })).toHaveCount(0);

    const cancelledOrder = await newOrder(page);
    const cancelledRequest = await send(page, cancelledOrder);
    await go(page, `/orders?order=${cancelledOrder}`);
    await dialog(page).getByRole("button", { name: "Hủy đơn", exact: true }).click();
    await field(page, "Lý do hủy đơn").fill("Khách dừng công trình.");
    await dialog(page).getByRole("button", { name: "Xác nhận hủy", exact: true }).click();
    await go(page, `/approvals?request=${cancelledRequest}`);
    await field(page, "Ý kiến xử lý").fill("Đơn đã hủy, đóng yêu cầu này.");
    await expect(dialog(page).getByRole("button", { name: "Duyệt yêu cầu", exact: true })).toBeDisabled();
    await expect(dialog(page).getByRole("button", { name: "Từ chối", exact: true })).toBeEnabled();
    await dialog(page).getByRole("button", { name: "Từ chối", exact: true }).click();
    await expect(dialog(page)).toHaveCount(0);

    await go(page, "/approvals/new?order=BT26100003");
    await expect(field(page, "Đơn B2B chờ xác nhận")).toHaveValue("");
    await expect(page.getByRole("button", { name: "Gửi yêu cầu duyệt", exact: true })).toBeDisabled();
    await go(page, "/approvals/new?order=BT26100013");
    await expect(field(page, "Đơn B2B chờ xác nhận")).toHaveValue("");
    await page.getByLabel("Chi nhánh", { exact: true }).selectOption("Tuy Hòa");
    await expect(field(page, "Đơn B2B chờ xác nhận")).toHaveValue("BT26100013");
    await expect(field(page, "Đơn B2B chờ xác nhận").locator(`option[value="${orderId}"]`)).toHaveCount(0);
    await page.getByRole("tab", { name: "Công nợ", exact: true }).click();
    await expect(page.getByRole("button", { name: "Gửi yêu cầu duyệt", exact: true })).toBeDisabled();
    await go(page, `/approvals?request=${priceRequest}`);
    await page.getByLabel("Chi nhánh", { exact: true }).selectOption("Tuy Hòa");
    await expect(dialog(page)).toContainText("Đã duyệt");

    await go(page, `/approvals?request=${revised}`);
    const state = await page.evaluate(() => JSON.parse(localStorage.getItem("baotin-admin-preview-v1")));
    expect(state.approvalRequests).toHaveLength(5);
    const fixture = state.approvalRequests.find((item) => item.id === priceRequest);
    const commerce = { cart: [{ productId: "LED-12V-8W", quantity: 2 }], favorites: [], orders: [], coupon: "" };
    await page.evaluate(({ state, fixture, creditRequest, commerce }) => {
      state.approvalRequests.push({ ...fixture, id: "YCM9901", customerId: "KH005" });
      state.approvalRequests.push({ ...fixture, id: "YCM9902", snapshot: { ...fixture.snapshot, lines: [{ productId: "missing-SKU", quantity: 2, unitPrice: 40500, requestedPrice: 1 }] } });
      state.approvalRequests.push({ ...fixture, id: "YCM9903", snapshot: { ...fixture.snapshot, lines: [{ ...fixture.snapshot.lines[0], requestedPrice: 0 }] } });
      state.approvalRequests.push({ ...fixture, id: "YCM9904", snapshot: { ...fixture.snapshot, lines: [{ ...fixture.snapshot.lines[0], requestedPrice: 40501 }] } });
      state.approvalRequests.push({ ...fixture, id: "YCM9905", snapshot: { ...fixture.snapshot, lines: [{ ...fixture.snapshot.lines[0], quantity: 100 }] } });
      state.approvalRequests.push({ ...fixture, id: "YCM9906", branch: "Nha Trang" });
      state.approvalRequests.push({ ...fixture, id: "YCM9907", reason: "   " });
      state.approvalRequests.push({ ...fixture, id: "YCM9908", createdAt: "invalid-date" });
      state.approvalRequests.push(fixture);
      state.approvalRequests[0].snapshot.requestedTotal = 1;
      const credit = state.approvalRequests.find((item) => item.id === creditRequest);
      credit.snapshot.amount = 1;
      localStorage.setItem("baotin-admin-preview-v1", JSON.stringify(state));
      localStorage.setItem("baotin-commerce-v1", JSON.stringify(commerce));
    }, { state, fixture, creditRequest, commerce });
    await page.reload();
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("baotin-admin-preview-v1")).approvalRequests.length)).toBe(5);
    const parsed = await page.evaluate(() => JSON.parse(localStorage.getItem("baotin-admin-preview-v1")));
    expect(parsed.approvalRequests[0].snapshot.requestedTotal).toBe(70000);
    await go(page, `/orders?order=${orderId}`);
    await expect(dialog(page).getByRole("button", { name: "Xác nhận đơn", exact: true })).toBeDisabled();
    await close(page);
    await page.getByRole("button", { name: "Khôi phục dữ liệu mẫu", exact: true }).click();
    await dialog(page).getByRole("button", { name: "Khôi phục", exact: true }).click();
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("baotin-admin-preview-v1")).approvalRequests)).toEqual([]);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("baotin-commerce-v1")))).toEqual(commerce);
    await page.evaluate(() => localStorage.setItem("baotin-admin-preview-v1", JSON.stringify({ orders: {}, customers: {}, approvals: {}, published: {}, warehouse: {}, salesOrders: [], orderEdits: {} })));
    await go(page, "/approvals");
    await expect(page.locator("tbody tr")).toHaveCount(2);
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("baotin-admin-preview-v1")).approvalRequests)).toEqual([]);
    console.log("PASS approvals rules: validation, duplicate gate, price+credit independence, scope, reject/resubmit, cancelled order, branch, corrupt/legacy storage, reset isolation");
  } finally { await context.close(); }
  expect(issues).toEqual([]);
  await writeFile(`${directory}/report.json`, JSON.stringify({ base, viewports: 5, issues, passed: true }, null, 2));
} finally { await browser.close(); }

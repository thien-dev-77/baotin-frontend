import { chromium, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

const base = process.env.QA_BASE_URL || "http://localhost:3010";
const directory = "/tmp/bao-tin-ui-qa/admin-sales";
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {}) });
const issues = [];
const commerceFixture = { cart: [{ productId: "LED-12V-8W", quantity: 2 }], favorites: ["LED-12V-8W"], orders: [], coupon: "BAOTIN10" };
const dialog = (page) => page.locator("dialog[open]");
const field = (page, name) => page.getByLabel(name, { exact: false }).and(page.locator("input, select, textarea"));
async function go(page, route = "/orders/new") {
  await page.goto(`${base}/admin${route}`);
  await expect(page.locator("#admin-content")).toHaveAttribute("aria-busy", "false");
}
async function add(page, code = "LED-12V-8W") {
  await page.getByRole("button", { name: "Thêm sản phẩm", exact: true }).click();
  await dialog(page).getByRole("searchbox").fill(code);
  await dialog(page).getByRole("button", { name: `Thêm ${code}`, exact: true }).click();
  await expect(dialog(page).getByRole("button", { name: `Thêm ${code}`, exact: true })).toBeDisabled();
  await dialog(page).getByRole("button", { name: /^Xong/ }).click();
}
async function retail(page) {
  await field(page, "Người nhận").fill("Khách hàng thử nghiệm");
  await field(page, "Số điện thoại").fill("0901234567");
}
async function saved(page) {
  await expect(page).toHaveURL(/\/admin\/orders\?order=BTM2610\d+/);
  await expect(dialog(page)).toBeVisible();
  return new URL(page.url()).searchParams.get("order");
}
function watch(page) { page.on("pageerror", (error) => issues.push(error.message)); }
async function close(page) { await dialog(page).locator('button[aria-label="Đóng"]').click(); }

try {
  for (const [width, height, touch] of [[1440, 1000, false], [1024, 900, false], [768, 1024, true], [390, 844, true], [320, 812, true]]) {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: touch });
    try {
      const page = await context.newPage();
      watch(page);
      await go(page, "/orders");
      await page.getByRole("link", { name: "Tạo đơn hộ khách", exact: true }).click();
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("Tạo đơn hộ khách");
      await retail(page);
      await page.getByLabel("Nguồn đơn", { exact: true }).selectOption("Điện thoại");
      await page.getByRole("button", { name: "Thêm sản phẩm", exact: true }).click();
      await dialog(page).getByRole("searchbox").fill("LED-12V-8W");
      await dialog(page).locator("img").evaluateAll((images) => Promise.all(images.map((image) => image.decode())));
      expect(await dialog(page).evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
      await page.screenshot({ path: `${directory}/${width}-picker.png` });
      await page.keyboard.press("Escape");
      await expect(page.getByRole("button", { name: "Thêm sản phẩm", exact: true })).toBeFocused();
      await add(page);
      await page.getByRole("spinbutton", { name: "Số lượng LED-12V-8W", exact: true }).fill("2");
      await field(page, "Hình thức giao hàng").selectOption("Giao nội thành");
      await field(page, "Địa chỉ / điểm nhận hàng").fill("Địa chỉ giao hàng demo Quy Nhơn");
      await field(page, "Ghi chú đơn hàng").fill("Gọi trước khi giao hàng.");
      await page.evaluate(() => document.fonts.ready);
      expect(await page.locator("h1").evaluate((element) => getComputedStyle(element).fontFamily)).toContain("Inter");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.evaluate(() => scrollTo(0, 0));
      await page.screenshot({ path: `${directory}/${width}-create.png`, fullPage: true });
      await add(page, "912.21.046");
      await page.getByRole("spinbutton", { name: "Số lượng 912.21.046", exact: true }).fill("999");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.getByRole("button", { name: "Xóa 912.21.046", exact: true }).click();
      await page.getByRole("button", { name: "Tạo đơn chờ xác nhận", exact: true }).click();
      const id = await saved(page);
      await expect(dialog(page)).toContainText("Điện thoại");
      await expect(dialog(page)).toContainText("Địa chỉ giao hàng demo Quy Nhơn");
      await expect(dialog(page).getByRole("button", { name: "Xác nhận đơn", exact: true })).toBeEnabled();
      await dialog(page).getByRole("link", { name: "Sửa đơn", exact: true }).click();
      await expect(page).toHaveURL(`${base}/admin/orders/${id}/edit`);
      await expect(page.getByLabel("Khách hàng", { exact: true })).toBeDisabled();
      await expect(page.getByLabel("Nguồn đơn", { exact: true })).toBeDisabled();
      await page.getByRole("spinbutton", { name: "Số lượng LED-12V-8W", exact: true }).fill("3");
      await field(page, "Người nhận").fill("Người nhận mới");
      await field(page, "Lý do sửa đơn").fill("Khách tăng số lượng và đổi người nhận.");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.evaluate(() => scrollTo(0, 0));
      await page.screenshot({ path: `${directory}/${width}-edit.png`, fullPage: true });
      await page.getByRole("button", { name: "Lưu thay đổi", exact: true }).click();
      expect(await saved(page)).toBe(id);
      await page.reload();
      await expect(dialog(page)).toContainText("Người nhận mới");
      await expect(dialog(page)).toContainText("135.000");
      await expect(dialog(page).getByRole("region", { name: "Lịch sử thao tác mẫu" })).toContainText("Khách tăng số lượng");
      await dialog(page).getByRole("button", { name: "Xác nhận đơn", exact: true }).click();
      await expect(dialog(page).getByRole("link", { name: "Sửa đơn", exact: true })).toHaveCount(0);
      await close(page);
      await go(page, `/warehouse?order=${id}`);
      await expect(dialog(page)).toContainText("Địa chỉ giao hàng demo Quy Nhơn");
      await expect(dialog(page).getByText("Tổng giá trị", { exact: true })).toHaveCount(0);
      await dialog(page).getByRole("button", { name: "Bắt đầu soạn", exact: true }).click();
      await dialog(page).getByRole("checkbox").check();
      await dialog(page).getByRole("button", { name: "Hoàn tất soạn hàng", exact: true }).click();
      await page.reload();
      await expect(dialog(page).getByRole("button", { name: "Bàn giao vận chuyển", exact: true })).toBeEnabled();
      await go(page, `/orders/${id}/edit`);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("Không thể sửa đơn");
      console.log(`PASS sales ${width}px: create, image, font, picker keyboard, edit, reload, confirm, warehouse`);
    } finally { await context.close(); }
  }

  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  try {
    const page = await context.newPage();
    watch(page);
    await go(page);
    await retail(page);
    await page.getByRole("button", { name: "Tạo đơn chờ xác nhận", exact: true }).click();
    await expect(page.locator("#admin-content").getByRole("alert")).toContainText("Thêm ít nhất một SKU");
    await add(page);
    await field(page, "Số điện thoại").fill("123");
    await page.getByRole("button", { name: "Tạo đơn chờ xác nhận", exact: true }).click();
    await expect(page.locator("#admin-content").getByRole("alert")).toContainText("Kiểm tra người nhận");
    await field(page, "Số điện thoại").fill("0901234567");
    await field(page, "Hình thức giao hàng").selectOption("Giao nội thành");
    await page.getByRole("button", { name: "Tạo đơn chờ xác nhận", exact: true }).click();
    await expect(page).toHaveURL(`${base}/admin/orders/new`);
    expect(await field(page, "Địa chỉ / điểm nhận hàng").evaluate((input) => input.validity.valueMissing)).toBe(true);
    await field(page, "Hình thức giao hàng").selectOption("Nhận tại cửa hàng");
    await page.getByRole("button", { name: "Xóa LED-12V-8W", exact: true }).click();
    await expect(page.getByText("Chưa có sản phẩm trong đơn.", { exact: true })).toBeVisible();
    await add(page);
    await page.getByRole("spinbutton", { name: "Số lượng LED-12V-8W", exact: true }).fill("999");
    await expect(page.getByRole("status").filter({ hasText: "Tồn kho không đủ" })).toBeVisible();
    await page.getByRole("button", { name: "Tạo đơn chờ xác nhận", exact: true }).click();
    const shortageId = await saved(page);
    await expect(dialog(page).getByRole("button", { name: "Xác nhận đơn", exact: true })).toBeDisabled();
    await go(page, "/warehouse");
    await expect(page.getByRole("button", { name: `Soạn đơn ${shortageId}`, exact: true })).toHaveCount(0);

    await go(page);
    await page.getByLabel("Khách hàng", { exact: true }).selectOption("KH001");
    await expect(field(page, "Người nhận")).toHaveValue("Nguyễn Minh An");
    await expect(page.getByLabel("Khách hàng", { exact: true }).locator('option[value="KH003"]')).toHaveAttribute("disabled", "");
    await expect(page.getByLabel("Khách hàng", { exact: true }).locator('option[value="KH005"]')).toHaveCount(0);
    await add(page);
    await field(page, "Thanh toán").selectOption("Công nợ B2B");
    await page.getByRole("button", { name: "Tạo đơn chờ xác nhận", exact: true }).click();
    const b2bId = await saved(page);
    await expect(dialog(page)).toContainText("40.500");
    await expect(dialog(page).getByRole("button", { name: "Xác nhận đơn", exact: true })).toBeEnabled();
    await close(page);
    await expect(page.locator("tbody tr").first()).toContainText(b2bId);
    await go(page, "/customers");
    await page.getByRole("button", { name: "Xem khách KH001", exact: true }).click();
    await expect(dialog(page).getByRole("link", { name: b2bId, exact: false })).toBeVisible();
    await go(page);
    await page.getByLabel("Khách hàng", { exact: true }).selectOption("KH002");
    await add(page);
    await field(page, "Thanh toán").selectOption("Công nợ B2B");
    await expect(page.getByRole("status").filter({ hasText: "Công nợ vượt hạn mức" })).toBeVisible();
    await page.getByRole("button", { name: "Tạo đơn chờ xác nhận", exact: true }).click();
    const creditId = await saved(page);
    await expect(dialog(page).getByRole("button", { name: "Xác nhận đơn", exact: true })).toBeDisabled();
    await go(page, "/customers");
    await page.getByRole("button", { name: "Xem khách KH003", exact: true }).click();
    await dialog(page).getByRole("button", { name: "Kích hoạt tài khoản", exact: true }).click();
    await close(page);
    await go(page);
    await page.getByLabel("Khách hàng", { exact: true }).selectOption("KH003");
    await expect(field(page, "Thanh toán").getByRole("option", { name: "Công nợ B2B", exact: true })).toHaveAttribute("disabled", "");
    await page.getByRole("button", { name: "Thêm sản phẩm", exact: true }).click();
    await dialog(page).getByLabel("Danh mục chọn sản phẩm", { exact: true }).selectOption("led-tu-ke");
    await expect(dialog(page).locator("ul li")).toHaveCount(4);
    await dialog(page).getByLabel("Danh mục chọn sản phẩm", { exact: true }).selectOption("all");
    await dialog(page).getByRole("button", { name: "Trang sau", exact: true }).click();
    await expect(dialog(page)).toContainText("11-20 / 63");
    await dialog(page).getByRole("searchbox").fill("khong-co-SKU-nay");
    await expect(dialog(page).getByText("Không tìm thấy sản phẩm.", { exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await go(page, "/orders?order=BT26100001");
    await expect(dialog(page).getByRole("link", { name: "Sửa đơn", exact: true })).toHaveCount(0);
    await go(page, "/orders/BT26100001/edit");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Không thể sửa đơn");

    await go(page, "/orders/BT26100003/edit");
    await field(page, "Số điện thoại").fill("0901234567");
    await field(page, "Lý do sửa đơn").fill("   ");
    await page.getByRole("button", { name: "Lưu thay đổi", exact: true }).click();
    await expect(page.locator("#admin-content").getByRole("alert")).toContainText("Nhập lý do");
    await field(page, "Lý do sửa đơn").fill("Bổ sung thông tin nhận hàng.");
    await page.getByRole("button", { name: "Lưu thay đổi", exact: true }).click();
    await expect(page).toHaveURL(`${base}/admin/orders?order=BT26100003`);
    await page.reload();
    await expect(dialog(page)).toContainText("0901234567");

    await go(page);
    await page.getByLabel("Chi nhánh", { exact: true }).selectOption("Tuy Hòa");
    await expect(page.getByLabel("Khách hàng", { exact: true }).locator('option[value="KH001"]')).toHaveCount(0);
    await page.getByLabel("Khách hàng", { exact: true }).selectOption("KH005");
    await add(page);
    await page.getByRole("button", { name: "Tạo đơn chờ xác nhận", exact: true }).click();
    const branchId = await saved(page);
    await expect(dialog(page)).toContainText("Tuy Hòa");
    await page.reload();
    const state = await page.evaluate(() => JSON.parse(localStorage.getItem("baotin-admin-preview-v1")));
    expect(state.salesOrders).toHaveLength(4);
    expect(state.salesOrders.find((item) => item.id === branchId).customerId).toBe("KH005");
    expect(new Set(state.salesOrders.map((item) => item.id)).size).toBe(4);
    const retailOrder = state.salesOrders.find((item) => item.id === shortageId);
    await page.evaluate(({ state, retailOrder, commerceFixture }) => {
      state.salesOrders.push({ ...retailOrder, id: "BTM26109999", customerId: "not-a-customer" });
      state.salesOrders.push({ ...retailOrder, id: "BTM26109998", items: [{ productId: "missing-SKU", quantity: 1, unitPrice: 1 }] });
      state.salesOrders.push({ ...retailOrder, id: "BTM26109997", items: [{ productId: "LED-12V-8W", quantity: -2, unitPrice: 45000 }] });
      state.salesOrders.push({ ...retailOrder, id: "BTM26109996", items: [{ productId: "LED-12V-8W", quantity: 1, unitPrice: 1 }] });
      state.salesOrders.push({ ...retailOrder, id: "BTM26109995", details: { ...retailOrder.details, payment: "Công nợ B2B" } });
      state.salesOrders.push({ ...retailOrder, id: "BTM26109994", items: [retailOrder.items[0], retailOrder.items[0]] });
      state.salesOrders[0].total = 1;
      state.salesOrders[0].status = "Hoàn tất";
      state.salesOrders[0].approvalId = "YC001";
      state.orderEdits.BT26100001 = state.orderEdits.BT26100003;
      localStorage.setItem("baotin-admin-preview-v1", JSON.stringify(state));
      localStorage.setItem("baotin-commerce-v1", JSON.stringify(commerceFixture));
    }, { state, retailOrder, commerceFixture });
    await page.reload();
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("baotin-admin-preview-v1")).salesOrders.length)).toBe(4);
    const parsed = await page.evaluate(() => JSON.parse(localStorage.getItem("baotin-admin-preview-v1")));
    expect(parsed.salesOrders[0].total).toBe(999 * 45000);
    expect(parsed.salesOrders[0].status).toBe("Chờ xác nhận");
    expect(parsed.salesOrders[0].approvalId).toBeUndefined();
    expect(parsed.orderEdits.BT26100001).toBeUndefined();
    await go(page, `/orders?order=${b2bId}`);
    await expect(dialog(page)).toContainText("40.500");
    await go(page, `/orders?order=${creditId}`);
    await expect(dialog(page).getByRole("button", { name: "Xác nhận đơn", exact: true })).toBeDisabled();
    await close(page);
    await page.getByRole("button", { name: "Khôi phục dữ liệu mẫu", exact: true }).click();
    await dialog(page).getByRole("button", { name: "Khôi phục", exact: true }).click();
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("baotin-admin-preview-v1")).salesOrders)).toEqual([]);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("baotin-commerce-v1")))).toEqual(commerceFixture);
    await page.evaluate(() => localStorage.setItem("baotin-admin-preview-v1", JSON.stringify({ orders: {}, customers: {}, approvals: {}, published: {} })));
    await page.reload();
    await expect(page.getByRole("link", { name: "Tạo đơn hộ khách", exact: true })).toBeVisible();
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("baotin-admin-preview-v1")).orderEdits)).toEqual({});
    console.log("PASS sales: validation, shortage, B2B pricing, credit gate, approval lock, seed edit, branch, corrupt and legacy storage, reset isolation");
  } finally { await context.close(); }
  expect(issues).toEqual([]);
  await writeFile(`${directory}/report.json`, JSON.stringify({ base, viewports: 5, issues, passed: true }, null, 2));
} finally { await browser.close(); }

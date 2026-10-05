import { chromium, expect } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const base = process.env.QA_BASE_URL || "http://localhost:3010";
const directory = "/tmp/bao-tin-ui-qa/admin";
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {}) });
const issues = [];
const routes = [["", "Tổng quan vận hành"], ["/orders", "Đơn hàng"], ["/warehouse", "Soạn hàng & giao hàng"], ["/products", "Sản phẩm"], ["/customers", "Khách hàng B2B"], ["/credit", "Công nợ B2B"], ["/accounting", "Thu tiền & đối chiếu"], ["/approvals", "Yêu cầu duyệt"]];

async function go(page, route = "") {
  await page.goto(`${base}/admin${route}`);
  await expect(page.locator("#admin-content")).toHaveAttribute("aria-busy", "false");
}
async function close(page) {
  await page.locator("dialog[open] button[aria-label=\"Đóng\"]").click();
}
function watch(page) { page.on("pageerror", (error) => issues.push(error.message)); }

try {
  for (const [width, height, touch] of [[1440, 1000, false], [1024, 900, false], [768, 1024, true], [390, 844, true], [320, 812, true]]) {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: touch });
    try {
      const page = await context.newPage();
      watch(page);
      for (const [route, heading] of routes) {
        await go(page, route);
        await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
        await expect(page.locator("header[aria-busy], footer")).toHaveCount(0);
        await expect(page.getByText("Dữ liệu mẫu", { exact: true })).toBeVisible();
        await page.evaluate(() => document.fonts.ready);
        expect(await page.locator("h1").evaluate((element) => getComputedStyle(element).fontFamily)).toContain("Inter");
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        if (route === "/products") await page.locator("tbody img").evaluateAll((images) => Promise.all(images.map((image) => image.decode())));
        await page.screenshot({ path: `${directory}/${width}-${route.slice(1) || "overview"}.png`, fullPage: true });
      }
      await page.getByLabel("Chi nhánh", { exact: true }).selectOption("Nha Trang");
      await expect(page.locator("tbody tr")).toHaveCount(1);
      await page.getByLabel("Chi nhánh", { exact: true }).selectOption("Quy Nhơn");
      if (width < 1024) {
        const menu = page.getByRole("button", { name: "Mở menu quản trị" });
        await menu.click();
        await expect(page.locator("dialog[open] nav").getByRole("link")).toHaveCount(8);
        await page.screenshot({ path: `${directory}/${width}-menu.png` });
        await page.keyboard.press("Escape");
        await expect(page.locator("dialog[open]")).toHaveCount(0);
        await expect(menu).toBeFocused();
        await menu.click();
        await page.locator("dialog[open]").getByRole("link", { name: /^Sản phẩm/ }).click();
        await expect(page).toHaveURL(`${base}/admin/products`);
        await expect(page.locator("dialog[open]")).toHaveCount(0);
      }
      await go(page, "/orders");
      await page.getByRole("button", { name: "Xem đơn BT26100003", exact: true }).click();
      await expect(page.locator("dialog[open]").getByRole("button", { name: "Xác nhận đơn", exact: true })).toBeEnabled();
      expect(await page.locator("dialog[open]").evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
      await page.screenshot({ path: `${directory}/${width}-order-detail.png` });
      await close(page);
      console.log(`PASS admin layout ${width}px: 8 routes, font, tables, modal, branch, menu`);
    } finally { await context.close(); }
  }

  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  try {
    const page = await context.newPage();
    watch(page);
    await go(page, "/orders");
    await expect(page.locator("tbody tr")).toHaveCount(9);
    await page.getByLabel("Kỳ báo cáo").selectOption("30");
    await expect(page.locator("tbody tr")).toHaveCount(10);
    await page.getByRole("button", { name: "Trang sau" }).click();
    await expect(page.locator("tbody tr")).toHaveCount(2);
    await page.getByLabel("Chi nhánh", { exact: true }).selectOption("Tuy Hòa");
    await expect(page.locator("tbody tr")).toHaveCount(3);
    await page.getByLabel("Chi nhánh", { exact: true }).selectOption("Quy Nhơn");
    await page.getByLabel("Kỳ báo cáo").selectOption("7");
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Xuất CSV" }).click();
    const file = await download;
    expect(file.suggestedFilename()).toBe("bao-tin-don-hang-mau.csv");
    await file.saveAs(`${directory}/orders.csv`);
    const csv = await readFile(`${directory}/orders.csv`, "utf8");
    expect(csv).toContain('"BT26100001"');
    expect(csv.split("\r\n")).toHaveLength(10);
    await page.getByRole("searchbox").fill("khong co khach nay");
    await expect(page.getByText("Không có dữ liệu phù hợp.", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Xuất CSV" })).toBeDisabled();
    await page.getByRole("searchbox").fill("le ngoc mai");
    await expect(page.locator("tbody tr")).toHaveCount(3);
    await page.getByRole("searchbox").fill("");
    await page.getByLabel("Trạng thái đơn hàng").selectOption("Chờ xác nhận");
    await expect(page.locator("tbody tr")).toHaveCount(3);

    await page.getByRole("button", { name: "Xem đơn BT26100001", exact: true }).click();
    await expect(page.getByRole("button", { name: "Xác nhận đơn", exact: true })).toBeDisabled();
    await page.getByRole("link", { name: "Mở yêu cầu duyệt" }).click();
    await expect(page).toHaveURL(`${base}/admin/approvals?request=YC001`);
    await expect(page.locator("dialog[open]")).toBeVisible();
    await expect(page.getByRole("button", { name: "Duyệt yêu cầu", exact: true })).toBeDisabled();
    await page.getByLabel("Ý kiến xử lý").fill("   ");
    await expect(page.getByRole("button", { name: "Duyệt yêu cầu", exact: true })).toBeDisabled();
    await page.getByLabel("Ý kiến xử lý").fill("Duyệt giá dự án cho đơn mẫu.");
    await page.getByRole("button", { name: "Duyệt yêu cầu", exact: true }).click();
    await expect(page.locator("dialog[open]")).toHaveCount(0);
    await expect(page.locator("tbody tr")).toHaveCount(1);
    await go(page, "/orders?order=BT26100001");
    for (const action of ["Xác nhận đơn", "Bắt đầu soạn", "Hoàn tất soạn hàng", "Bàn giao vận chuyển", "Xác nhận đã giao"]) {
      if (action === "Hoàn tất soạn hàng") for (const checkbox of await page.locator("dialog[open]").getByRole("checkbox").all()) await checkbox.check();
      await page.locator("dialog[open]").getByRole("button", { name: action, exact: true }).click();
    }
    await expect(page.locator("dialog[open]").getByText("Hoàn tất", { exact: true }).first()).toBeVisible();
    await page.reload();
    await expect(page.locator("dialog[open]").getByText("Hoàn tất", { exact: true }).first()).toBeVisible();
    await close(page);

    await go(page, "/approvals?request=YC002");
    await page.getByLabel("Ý kiến xử lý").fill("Từ chối: cần đối soát khoản quá hạn.");
    await page.getByRole("button", { name: "Từ chối", exact: true }).click();
    await page.getByLabel("Trạng thái yêu cầu").selectOption("Từ chối");
    await expect(page.locator("tbody tr")).toHaveCount(1);
    await go(page, "/orders?order=BT26100002");
    await expect(page.getByText("Yêu cầu ngoại lệ đã bị từ chối.", { exact: false })).toBeVisible();
    await expect(page.getByRole("button", { name: "Xác nhận đơn", exact: true })).toBeDisabled();
    await close(page);
    await page.getByRole("button", { name: "Xem đơn BT26100003", exact: true }).click();
    await page.getByRole("button", { name: "Hủy đơn", exact: true }).click();
    await expect(page.getByRole("button", { name: "Xác nhận hủy", exact: true })).toBeDisabled();
    await page.getByLabel("Lý do hủy đơn").fill("Khách đổi lịch thi công.");
    await page.getByRole("button", { name: "Xác nhận hủy", exact: true }).click();
    await expect(page.locator("dialog[open]").getByText("Đã hủy", { exact: true }).first()).toBeVisible();
    await expect(page.locator("dialog[open]").getByRole("button", { name: "Xác nhận đơn", exact: true })).toHaveCount(0);
    await expect(page.locator("dialog[open]").getByText("Khách đổi lịch thi công.", { exact: false }).first()).toBeVisible();
    await close(page);

    await go(page, "/customers?status=Ch%E1%BB%9D%20duy%E1%BB%87t");
    await expect(page.locator("tbody tr")).toHaveCount(1);
    await page.getByRole("button", { name: "Xem khách KH003", exact: true }).click();
    await page.getByRole("button", { name: "Kích hoạt tài khoản" }).click();
    await expect(page.locator("dialog[open]").getByText("Đang hoạt động", { exact: true })).toBeVisible();
    await expect(page.locator("dialog[open] dd").filter({ hasText: /^0\s?₫$/ })).toHaveCount(3);
    await page.getByRole("button", { name: "Tạm ngưng tài khoản" }).click();
    await expect(page.locator("dialog[open]").getByText("Tạm ngưng", { exact: true })).toBeVisible();
    await close(page);
    await go(page, "/credit?status=overdue");
    await expect(page.locator("tbody tr")).toHaveCount(2);
    await page.getByLabel("Tình trạng công nợ").selectOption("overlimit");
    await expect(page.locator("tbody tr")).toHaveCount(1);

    await go(page, "/products");
    await page.getByRole("searchbox").fill("Bản lề giảm chấn Hafele");
    await page.getByRole("button", { name: /^Sửa sản phẩm/ }).first().click();
    const publication = page.getByRole("checkbox", { name: "Đang bán trên website" });
    await expect(publication).not.toBeChecked();
    await publication.check();
    await page.getByRole("button", { name: "Lưu trạng thái" }).click();
    await expect(page.locator("tbody tr").first().getByText("Đang bán", { exact: true })).toBeVisible();
    await page.reload();
    await page.getByRole("button", { name: /^Sửa sản phẩm/ }).first().click();
    await expect(publication).toBeChecked();
    await close(page);
    await page.getByLabel("Danh mục sản phẩm", { exact: true }).selectOption("ray-truot");
    await expect(page.locator("tbody tr")).toHaveCount(5);
    await page.locator("select[aria-label=\"Trạng thái sản phẩm\"]").selectOption("hidden");
    await expect(page.getByText("Không có dữ liệu phù hợp.", { exact: true })).toBeVisible();
    const commerceBeforeReset = await page.evaluate(() => localStorage.getItem("baotin-commerce-v1"));
    await page.getByRole("button", { name: "Khôi phục dữ liệu mẫu", exact: true }).click();
    await page.locator("dialog[open]").getByRole("button", { name: "Hủy", exact: true }).click();
    expect(await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem("baotin-admin-preview-v1")).orders).length)).toBe(2);
    await page.getByRole("button", { name: "Khôi phục dữ liệu mẫu", exact: true }).click();
    await page.locator("dialog[open]").getByRole("button", { name: "Khôi phục", exact: true }).click();
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("baotin-admin-preview-v1")))).toEqual({ orders: {}, customers: {}, approvals: {}, published: {}, warehouse: {}, salesOrders: [], orderEdits: {}, approvalRequests: [], receipts: [], paymentDueDates: {} });
    expect(await page.evaluate(() => localStorage.getItem("baotin-commerce-v1"))).toBe(commerceBeforeReset);
    // Hydration ignores unknown fields rather than replacing trusted fixture totals.
    await page.evaluate(() => localStorage.setItem("baotin-admin-preview-v1", JSON.stringify({ orders: { BT26100003: { status: "Chờ xác nhận", total: 1, customerName: "injected" } } })));
    await go(page, "/orders?order=BT26100003");
    await expect(page.locator("dialog[open]").getByText("injected", { exact: true })).toHaveCount(0);
    await close(page);
    await page.evaluate(() => localStorage.setItem("baotin-admin-preview-v1", "invalid-json"));
    await go(page);
    await expect(page.getByRole("heading", { name: "Tổng quan vận hành", exact: true })).toBeVisible();
    await go(page, "/customers");
    await page.getByRole("button", { name: "Xem khách KH001", exact: true }).click();
    await page.getByRole("button", { name: "Tạm ngưng tài khoản" }).click();
    await close(page);
    await go(page, "/orders?order=BT26100001");
    await expect(page.getByText("Tài khoản B2B chưa được kích hoạt hoặc đang tạm ngưng.", { exact: false })).toBeVisible();
    await expect(page.getByRole("button", { name: "Xác nhận đơn", exact: true })).toBeDisabled();
    await close(page);
    await go(page, "/approvals?request=YC002");
    await page.getByLabel("Ý kiến xử lý").fill("Duyệt ngoại lệ công nợ cho đơn mẫu này.");
    await page.getByRole("button", { name: "Duyệt yêu cầu", exact: true }).click();
    await go(page, "/orders?order=BT26100002");
    await expect(page.getByRole("button", { name: "Xác nhận đơn", exact: true })).toBeEnabled();
    await page.getByRole("button", { name: "Xác nhận đơn", exact: true }).click();
    await expect(page.locator("dialog[open]").getByText("Chờ soạn hàng", { exact: true }).first()).toBeVisible();
    await close(page);
    await page.goto(base);
    await expect(page.locator("header[aria-busy]")).toHaveAttribute("aria-busy", "false");
    await expect(page.getByRole("link", { name: "Quản trị (demo)", exact: true })).toBeVisible();
    await page.getByRole("link", { name: "Quản trị (demo)", exact: true }).click();
    await expect(page).toHaveURL(`${base}/admin`);
    await expect(page.locator("footer, header[aria-busy]")).toHaveCount(0);
    await page.goto(`${base}/account`);
    await expect(page.locator("header[aria-busy]")).toHaveAttribute("aria-busy", "false");
    await expect(page.locator("footer")).toBeVisible();
    console.log("PASS workflows: pagination/search/export, approval gate, pipeline, reject/cancel, customer, credit, publication, persistence/reset, storefront chrome");
  } finally { await context.close(); }

  expect(issues).toEqual([]);
  const report = { passed: true, viewports: 5, routes: 8, isolatedAdminShell: true, orderApprovalWorkflow: true, csv: true, statePersistence: true, responsiveMenuAndTables: true, issues };
  await writeFile(`${directory}/report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} finally { await browser.close(); }

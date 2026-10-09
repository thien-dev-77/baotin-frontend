import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { catalog, categoryCatalog } from "../lib/catalog";
import { adminCustomers, adminOrders } from "../lib/admin-preview";
import { customerGroups } from "../lib/customer-management";

const base = process.env.QA_BASE_URL || "http://127.0.0.1:3010";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname))
  throw new Error("Customer UI QA only runs locally.");
test.setTimeout(45000);
test.use({ viewport: { width: 1440, height: 1000 } });

async function mockCustomers(page: Page, role = "admin") {
  const errors: string[] = [],
    calls: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const rows = structuredClone(adminCustomers).map((row) => ({
    ...row,
    email: "",
    tax: "",
    address: "",
    assignedSalesId: row.id === "KH001" ? "qa-sales" : null,
    pilot: row.id === "KH001",
    notes: "",
    revision: 3,
  }));
  const accounts = new Set(["KH001", "KH002", "KH004"]);
  let gate:
    | {
        method: string;
        path: string;
        status: number;
        count: number;
        payload?: Record<string, unknown>;
        wait: Promise<void>;
        release: () => void;
      }
    | undefined;
  const state = () => ({
    products: catalog,
    categories: categoryCatalog,
    customers: rows,
    orders: adminOrders.map((order) => ({ ...order, revision: 1 })),
    approvals: [],
    warehouse: {},
    receipts: [],
    paymentDueDates: {},
    today: "2026-10-07",
  });
  await page.route("**/api/backend/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.slice("/api/backend".length),
      method = request.method();
    calls.push(`${method} ${path}`);
    const current = gate;
    if (current && current.method === method && current.path === path) {
      current.count++;
      if (method !== "GET") current.payload = request.postDataJSON();
      await current.wait;
      if (current.status >= 400) {
        await route.fulfill({
          status: current.status,
          json: {
            message: "Hồ sơ đã thay đổi. Làm mới dữ liệu trước khi lưu lại.",
          },
        });
        return;
      }
    }
    if (method === "POST" && path === "/admin/customers") {
      const { password: _password, ...payload } = request.postDataJSON();
      rows.push({
        ...payload,
        id: "KH-QA-NEW",
        limit: 0,
        debt: 0,
        overdue: 0,
        revision: 1,
        status: "Chờ duyệt",
      });
      if (_password) accounts.add("KH-QA-NEW");
      await route.fulfill({
        status: 201,
        json: { id: "KH-QA-NEW", revision: 1, accountCreated: !!_password },
      });
      return;
    }
    if (method === "PATCH" && path.startsWith("/admin/customers/")) {
      const row = rows.find((row) => row.id === path.split("/")[3])!;
      const revision = row.revision + 1;
      Object.assign(row, request.postDataJSON(), { revision });
      await route.fulfill({ json: { id: row.id, revision } });
      return;
    }
    if (method === "POST" && path.endsWith("/account")) {
      const row = rows.find((row) => row.id === path.split("/")[3])!;
      accounts.add(row.id);
      row.revision++;
      await route.fulfill({
        status: 201,
        json: { id: row.id, revision: row.revision, accountCreated: true },
      });
      return;
    }
    if (method === "GET" && path === "/admin/customers") {
      const branch = url.searchParams.get("branch");
      await route.fulfill({
        json: {
          items: rows
            .filter((row) => row.branch === branch)
            .map((row) => ({
              ...row,
              account: accounts.has(row.id)
                ? { id: `user-${row.id}`, disabled: false }
                : null,
            })),
          groups: customerGroups,
          assignees: [
            { id: "qa-sales", name: "Sales Quy Nhơn", disabled: false },
          ],
        },
      });
      return;
    }
    const responses: Record<string, unknown> = {
      "/auth/session": {
        user: {
          id: "qa-staff",
          name: "QA Staff",
          email: "qa@example.test",
          role,
          branches: ["Quy Nhơn", "Tuy Hòa"],
          customer: null,
        },
      },
      "/catalog/bootstrap": { products: catalog, categories: categoryCatalog },
      "/orders": [],
      "/account": { favorites: [] },
      "/notifications/count": { unreadCount: 0 },
      "/admin/resources": state(),
    };
    if (method !== "GET" || !(path in responses)) {
      errors.push(`Unexpected ${method} ${path}`);
      await route.fulfill({
        status: 500,
        json: { message: "Unexpected QA request" },
      });
      return;
    }
    await route.fulfill({ json: responses[path] });
  });
  return {
    rows,
    calls,
    delay: (method: string, path: string, status = 200) => {
      let release!: () => void;
      const wait = new Promise<void>((resolve) => {
        release = resolve;
      });
      gate = { method, path, status, count: 0, wait, release };
      return gate;
    },
    check: () => expect(errors).toEqual([]),
    visit: async () => {
      await page.goto(`${base}/admin/customers`);
      await expect(
        page.getByRole("button", { name: "Thêm khách B2B", exact: true }),
      ).toBeEnabled();
    },
  };
}
async function fillNew(page: Page) {
  await page
    .getByRole("button", { name: "Thêm khách B2B", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Thêm khách B2B" });
  await dialog.getByLabel("Tên xưởng / công ty").fill("Xưởng nội thất QA mới");
  await dialog.getByLabel("Người liên hệ").fill("Nguyễn QA");
  await dialog.getByLabel("Số điện thoại").fill("0908000100");
  await dialog.getByLabel("Nhóm khách").selectOption("Xưởng nội thất");
  await dialog.locator('input[name="password"]').fill("QA-strong-password");
  await dialog.locator('input[name="confirm"]').fill("QA-strong-password");
  return dialog;
}

for (const width of [1440, 768, 390, 320]) {
  test(`Phone onboarding is responsive and has a stable loading button at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    const api = await mockCustomers(page);
    await api.visit();
    const dialog = await fillNew(page);
    await dialog.getByLabel("Khách thử nghiệm", { exact: true }).check();
    await dialog.getByLabel("Sales phụ trách").selectOption("qa-sales");
    const gate = api.delay("POST", "/admin/customers", 201);
    const button = dialog.getByRole("button", {
      name: "Lưu hồ sơ",
      exact: true,
    });
    const box = await button.boundingBox();
    try {
      await button.click();
      await expect.poll(() => gate.count).toBe(1);
      await expect(button).toBeDisabled();
      await expect(button.locator("[data-loading-spinner]")).toBeVisible();
      await expect(dialog.getByLabel("Số điện thoại")).toBeDisabled();
      await expect(
        dialog.getByRole("button", { name: "Đóng", exact: true }),
      ).toBeDisabled();
      await page.keyboard.press("Escape");
      await expect(dialog).toBeVisible();
      await dialog
        .locator("form")
        .evaluate((form) =>
          form.dispatchEvent(
            new Event("submit", { bubbles: true, cancelable: true }),
          ),
        );
      expect(gate.count).toBe(1);
      expect(gate.payload?.email).toBe("");
      expect(gate.payload?.pilot).toBe(true);
      expect(gate.payload?.assignedSalesId).toBe("qa-sales");
      const after = await button.boundingBox();
      expect(Math.abs(after!.width - box!.width)).toBeLessThan(2);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBe(true);
      await mkdir("/private/tmp/baotin-customers", { recursive: true });
      await page.screenshot({
        path: `/private/tmp/baotin-customers/create-${width}.png`,
        fullPage: true,
      });
    } finally {
      gate.release();
    }
    await expect(dialog).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: "Xưởng nội thất QA mới", exact: true }),
    ).toBeVisible();
    expect(
      api.calls.filter((call) => call === "GET /auth/session"),
    ).toHaveLength(1);
    api.check();
  });
}
test("Filters select the pilot cohort, group and assigned Sales", async ({
  page,
}) => {
  const api = await mockCustomers(page);
  await api.visit();
  await page.getByLabel("Lọc khách thử nghiệm").selectOption("pilot");
  await expect(
    page.getByRole("button", { name: "Xem khách KH001", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Xem khách KH002", exact: true }),
  ).toHaveCount(0);
  await page.getByLabel("Lọc Sales phụ trách").selectOption("unassigned");
  await expect(
    page.getByRole("button", { name: "Xem khách KH001", exact: true }),
  ).toHaveCount(0);
  await page.getByLabel("Lọc Sales phụ trách").selectOption("qa-sales");
  await page.getByLabel("Lọc nhóm khách").selectOption("Xưởng nội thất");
  await expect(
    page.getByRole("button", { name: "Xem khách KH001", exact: true }),
  ).toBeVisible();
  api.check();
});
test("Conflict preserves the edit draft and never hides the table", async ({
  page,
}) => {
  const api = await mockCustomers(page);
  await api.visit();
  await page
    .getByRole("button", { name: "Sửa khách KH001", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Sửa hồ sơ khách B2B" });
  await dialog
    .getByLabel("Ghi chú chăm sóc")
    .fill("Đã gọi hướng dẫn khách đặt đơn.");
  await expect(dialog.getByLabel("Email đăng nhập")).toHaveAttribute(
    "readonly",
    "",
  );
  const gate = api.delay("PATCH", "/admin/customers/KH001", 409);
  const button = dialog.getByRole("button", { name: "Lưu hồ sơ", exact: true });
  try {
    await button.click();
    await expect.poll(() => gate.count).toBe(1);
    await expect(button).toBeDisabled();
    expect(gate.payload?.revision).toBe(3);
  } finally {
    gate.release();
  }
  await expect(dialog.getByRole("alert")).toContainText("Hồ sơ đã thay đổi");
  await expect(dialog.getByLabel("Ghi chú chăm sóc")).toHaveValue(
    "Đã gọi hướng dẫn khách đặt đơn.",
  );
  await expect(button).toBeEnabled();
  await expect(page.locator("#admin-content table")).toBeVisible();
  api.check();
});
test("Focus keeps an open form without reloading its resources", async ({
  page,
}) => {
  const api = await mockCustomers(page);
  await api.visit();
  await page
    .getByRole("button", { name: "Sửa khách KH001", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Sửa hồ sơ khách B2B" });
  await dialog.getByLabel("Người liên hệ").fill("Liên hệ đang soạn");
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect
    .poll(() => api.calls.filter((call) => call === "GET /admin/resources").length)
    .toBe(1);
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("Người liên hệ")).toHaveValue(
    "Liên hệ đang soạn",
  );
  api.check();
});
test("Delayed metadata refresh retains Sales names and action controls", async ({
  page,
}) => {
  const api = await mockCustomers(page);
  await api.visit();
  const row = page
    .getByRole("row")
    .filter({
      has: page.getByRole("button", { name: "Xem khách KH001", exact: true }),
    });
  await expect(row).toContainText("Sales Quy Nhơn");
  const gate = api.delay("GET", "/admin/customers");
  try {
    await page.getByRole("button", { name: "Làm mới dữ liệu", exact: true }).click();
    await expect.poll(() => gate.count).toBeGreaterThan(0);
    await expect(row).toContainText("Sales Quy Nhơn");
    await expect(
      page.getByRole("button", { name: "Thêm khách B2B", exact: true }),
    ).toBeEnabled();
    await expect(
      page.getByRole("button", { name: "Sửa khách KH001", exact: true }),
    ).toBeEnabled();
  } finally {
    gate.release();
  }
  api.check();
});

test("Editing updates the directory without losing filters or financial balances", async ({
  page,
}) => {
  const api = await mockCustomers(page);
  await api.visit();
  await page.getByLabel("Lọc khách thử nghiệm").selectOption("pilot");
  await page
    .getByRole("button", { name: "Sửa khách KH001", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Sửa hồ sơ khách B2B" });
  await dialog.getByLabel("Tên xưởng / công ty").fill("Xưởng cập nhật QA");
  await dialog.getByRole("button", { name: "Lưu hồ sơ", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Xưởng cập nhật QA", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Lọc khách thử nghiệm")).toHaveValue("pilot");
  expect(api.rows[0].limit).toBe(50000000);
  expect(api.rows[0].debt).toBe(12400000);
  api.check();
});
test("An existing offline customer can receive a phone-only login", async ({
  page,
}) => {
  const api = await mockCustomers(page);
  await api.visit();
  await page
    .getByRole("button", { name: "Xem khách KH003", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Tạo tài khoản", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Tạo tài khoản B2B" });
  await dialog.locator('input[name="password"]').fill("QA-strong-password");
  await dialog.locator('input[name="confirm"]').fill("QA-strong-password");
  const gate = api.delay("POST", "/admin/customers/KH003/account", 201);
  const button = dialog.getByRole("button", {
    name: "Tạo tài khoản",
    exact: true,
  });
  try {
    await button.click();
    await expect.poll(() => gate.count).toBe(1);
    await expect(button).toBeDisabled();
    expect(gate.payload?.revision).toBe(3);
  } finally {
    gate.release();
  }
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Sửa khách KH003", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Xem khách KH003", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Tạo tài khoản", exact: true }),
  ).toHaveCount(0);
  api.check();
});
test("Profile-only creation omits the password and confirmation mismatch sends nothing", async ({
  page,
}) => {
  const api = await mockCustomers(page);
  await api.visit();
  const dialog = await fillNew(page);
  await dialog.locator('input[name="confirm"]').fill("not-the-password");
  await dialog.getByRole("button", { name: "Lưu hồ sơ", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("không khớp");
  expect(
    api.calls.filter((call) => call === "POST /admin/customers"),
  ).toHaveLength(0);
  await dialog.getByLabel("Tạo tài khoản B2B", { exact: true }).uncheck();
  const gate = api.delay("POST", "/admin/customers", 201);
  try {
    await dialog
      .getByRole("button", { name: "Lưu hồ sơ", exact: true })
      .click();
    await expect.poll(() => gate.count).toBe(1);
    expect(gate.payload).not.toHaveProperty("password");
  } finally {
    gate.release();
  }
  await expect(dialog).not.toBeVisible();
  api.check();
});
test("Accountant customer view has no profile mutation controls", async ({
  page,
}) => {
  const api = await mockCustomers(page, "accountant");
  await page.goto(`${base}/admin/customers`);
  await expect(
    page.getByRole("heading", { name: "Khách hàng B2B", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Thêm khách B2B", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Sửa khách KH001", exact: true }),
  ).toHaveCount(0);
  api.check();
});

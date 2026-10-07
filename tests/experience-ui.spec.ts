import { expect, test, type Locator, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { catalog, categoryCatalog } from "../lib/catalog";
import { adminCustomers, adminOrders } from "../lib/admin-preview";
import type { SessionUser } from "../lib/types";

const base = process.env.QA_BASE_URL || "http://127.0.0.1:3010";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname))
  throw new Error("Experience UI QA only runs locally.");
test.setTimeout(60000);
test.use({ viewport: { width: 1440, height: 1000 } });
const staff: SessionUser = {
  id: "qa-admin",
  name: "QA Admin",
  email: "qa@example.test",
  role: "admin",
  branches: ["Quy Nhơn"],
  customer: null,
};
const customer: SessionUser = {
  ...staff,
  id: "qa-b2b",
  role: "b2b",
  customer: {
    id: "KH001",
    name: "QA Customer",
    email: "qa@example.test",
    phone: "0901234567",
    company: "QA Company",
    role: "b2b",
    status: "active",
    creditLimit: 1000000,
    debt: 0,
  },
};
type Gate = {
  count: number;
  payload?: Record<string, unknown>;
  release: () => void;
};

async function mockExperience(page: Page, user = staff) {
  const errors: string[] = [];
  const calls: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const lead = {
    id: "qa-lead",
    branch: "Quy Nhơn",
    revision: 3,
    status: "new",
    assignedTo: null,
    note: "",
    createdAt: "2026-10-07T09:00:00Z",
    data: {
      name: "Khách tư vấn QA",
      phone: "0901234567",
      email: "qa@example.test",
      message: "Cần phụ kiện cho công trình mới.",
    },
  };
  const review = {
    id: "qa-review",
    revision: 2,
    productName: catalog[0].name,
    name: "Khách QA",
    stars: 5,
    text: "Phụ kiện đúng mã, chất lượng tốt.",
    status: "pending",
    createdAt: lead.createdAt,
  };
  const content = {
    id: "qa-banner",
    kind: "banner",
    revision: 4,
    published: true,
    data: {
      slug: "qa-banner",
      title: "Banner QA",
      description: "Phụ kiện nội thất",
      image: catalog[0].image,
      href: "/category/khoa",
      category: "khoa",
      body: "",
      minutes: 5,
      width: 1600,
      height: 700,
      position: 0,
    },
  };
  const order = {
    ...structuredClone(adminOrders[0]),
    id: "BT-QA",
    customerId: "KH001",
    status: "Chờ xác nhận",
    revision: 7,
    items: [{ productId: catalog[0].id, quantity: 2, unitPrice: 10000 }],
    total: 20000,
  };
  const notification = {
    id: "qa-notification",
    type: "order",
    title: "Đơn BT-QA",
    message: "Đã xác nhận đơn hàng",
    href:
      user.role === "b2b"
        ? "/account/orders/BT-QA"
        : "/admin/orders?order=BT-QA",
    createdAt: lead.createdAt,
    readAt: null as string | null,
  };
  const resources: Record<string, unknown> = {
    "/auth/session": { user },
    "/catalog": { products: catalog, categories: categoryCatalog },
    "/orders": [],
    "/account": { favorites: [] },
    "/notifications": {
      items: [notification],
      total: 1,
      pageSize: 20,
      unreadCount: 1,
    },
    "/admin/state": {
      products: catalog.map((product) => ({
        ...product,
        published: true,
        revision: 1,
      })),
      categories: categoryCatalog,
      customers: adminCustomers,
      orders: [order],
      approvals: [],
      warehouse: {},
      receipts: [],
      paymentDueDates: {},
      today: "2026-10-07",
    },
    "/contact/consultations": {
      items: [lead],
      assignees: [{ id: staff.id, name: staff.name }],
    },
    "/admin/content": { items: [content] },
    "/admin/reviews": { items: [review] },
    "/admin/reports": {
      date: "2026-10-07",
      customers: 10,
      activeCustomers: 8,
      orderingCustomers: 7,
      orders: 12,
      selfOrders: 9,
      selfOrderRate: 75,
      confirmationMinutes: 8,
      cancelledOrders: [],
      shortages: 2,
      aging: [
        {
          id: "KH001",
          name: "Khách QA",
          debt: 100000,
          overdue: 100000,
          current: 0,
          days30: 100000,
          days60: 0,
          days90: 0,
          older: 0,
          unknown: 0,
        },
      ],
    },
    "/account/price-requests": { orders: [order], items: [] },
    "/account/frequently-bought": { products: [catalog[0]] },
    "/admin/integrations/kiotviet": {
      configured: true,
      enabled: true,
      missing: [],
      branches: { "Quy Nhơn": 1 },
      links: [],
      runs: [],
      outbox: [],
    },
    "/admin/integrations/kiotviet/reconciliation": {
      polling: false,
      lastAttempt: { at: lead.createdAt, status: "failed" },
      run: {
        at: lead.createdAt,
        status: "completed",
        stock: [
          {
            id: "sku",
            name: catalog[0].name,
            local: 10,
            remote: 12,
            valid: true,
            difference: 2,
          },
        ],
        debt: [],
        statuses: [],
      },
    },
  };
  let delayed:
    | {
        path: string;
        method: string;
        body: unknown;
        status: number;
        wait: Promise<void>;
        gate: Gate;
      }
    | undefined;
  // Every client request is intercepted, including mutations and PDF downloads.
  await page.context().route("**/api/backend/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.slice("/api/backend".length);
    const method = request.method();
    calls.push(`${method} ${path}`);
    if (delayed && delayed.path === path && delayed.method === method) {
      const current = delayed;
      current.gate.count++;
      if (request.postData()) current.gate.payload = request.postDataJSON();
      await current.wait;
      if (typeof current.body === "string" && current.body.startsWith("%PDF-"))
        await route.fulfill({
          status: current.status,
          body: current.body,
          contentType: "application/pdf",
        });
      else await route.fulfill({ status: current.status, json: current.body });
      return;
    }
    if (method === "GET" && path.startsWith("/reviews/")) {
      await route.fulfill({ json: { items: [] } });
      return;
    }
    if (method !== "GET" || !(path in resources)) {
      errors.push(`Unexpected request: ${method} ${path}`);
      await route.fulfill({
        status: 500,
        json: { message: "Unexpected QA request" },
      });
      return;
    }
    await route.fulfill({ json: resources[path] });
  });
  return {
    resources,
    lead,
    review,
    content,
    calls,
    delay: (
      path: string,
      method: string,
      body: unknown = { saved: true },
      status = 200,
    ) => {
      let release!: () => void;
      const wait = new Promise<void>((resolve) => {
        release = resolve;
      });
      const gate: Gate = { count: 0, release };
      delayed = { path, method, body, status, wait, gate };
      return gate;
    },
    visit: async (path: string, title: string) => {
      await page.goto(`${base}${path}`);
      await expect(
        page.getByRole("heading", { name: title, exact: true }),
      ).toBeVisible();
    },
    check: () => expect(errors).toEqual([]),
  };
}

async function loading(button: Locator, gate: Gate) {
  await expect(button).toBeEnabled();
  const before = await button.boundingBox();
  const icon = await button.locator("svg").first().boundingBox();
  expect(icon!.width).toBeGreaterThanOrEqual(14);
  await button.click();
  await expect.poll(() => gate.count).toBe(1);
  await expect(button).toBeDisabled();
  await expect(button).toHaveAttribute("aria-busy", "true");
  await expect(button.locator("[data-loading-spinner]")).toBeVisible();
  const during = await button.boundingBox();
  expect(Math.abs(during!.width - before!.width)).toBeLessThan(1);
  await button.evaluate((element) => (element as HTMLButtonElement).click());
  expect(gate.count).toBe(1);
}

for (const width of [1440, 768, 390, 320]) {
  test(`New admin screens fit and render at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const api = await mockExperience(page);
    await mkdir("/private/tmp/baotin-experience", { recursive: true });
    for (const [path, title, ready] of [
      ["notifications", "Thông báo", "Đơn BT-QA"],
      ["consultations", "Yêu cầu tư vấn", "Khách tư vấn QA"],
      ["content", "Nội dung website", "Banner QA"],
      ["reviews", "Đánh giá sản phẩm", "Phụ kiện đúng mã, chất lượng tốt."],
      ["reports", "Báo cáo vận hành", "Khách QA"],
    ]) {
      await api.visit(`/admin/${path}`, title);
      await expect(
        page
          .locator("#admin-content")
          .getByText(ready, { exact: true })
          .first(),
      ).toBeVisible();
      if (path === "content") {
        const image = page.getByRole("img", { name: "Banner QA", exact: true });
        await expect
          .poll(() =>
            image.evaluate(
              (node: HTMLImageElement) =>
                node.complete && node.naturalWidth > 0,
            ),
          )
          .toBe(true);
      }
      await page.evaluate(async () => {
        await document.fonts.ready;
      });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `/private/tmp/baotin-experience/${path}-${width}.png`,
        fullPage: true,
      });
    }
    api.check();
  });
  test(`B2B inbox and special price request fit at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    const api = await mockExperience(page, customer);
    await api.visit("/account/notifications", "Thông báo");
    await expect(
      page.getByText("Đã xác nhận đơn hàng", { exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    await api.visit("/account/price-requests", "Yêu cầu giá đặc biệt");
    await expect(page.getByLabel("Chọn đơn hàng")).toContainText("BT-QA");
    await page.getByLabel("Chọn đơn hàng").selectOption("BT-QA");
    await page.getByLabel("Lý do đề nghị").fill("Giá cho công trình QA");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    const gate = api.delay("/account/price-requests", "POST", { id: "YC-QA" });
    try {
      await loading(
        page.getByRole("button", { name: "Gửi yêu cầu", exact: true }),
        gate,
      );
      expect(gate.payload?.revision).toBe(7);
    } finally {
      gate.release();
    }
    await expect(
      page
        .getByRole("status")
        .filter({ hasText: "Đã gửi yêu cầu giá đặc biệt." }),
    ).toBeVisible();
    api.check();
  });
}

test("Reading notifications refreshes the badge without checking auth again", async ({
  page,
}) => {
  const api = await mockExperience(page);
  await api.visit("/admin/notifications", "Thông báo");
  const gate = api.delay("/notifications/read", "PATCH", { updated: 1 });
  try {
    await loading(
      page.getByRole("button", { name: "Đọc tất cả", exact: true }),
      gate,
    );
  } finally {
    api.resources["/notifications"] = {
      items: [],
      total: 0,
      pageSize: 20,
      unreadCount: 0,
    };
    gate.release();
  }
  await expect(
    page.getByText("Chưa có thông báo", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Thông báo, 0 chưa đọc" }),
  ).toBeVisible();
  expect(api.calls.filter((call) => call === "GET /auth/session")).toHaveLength(
    1,
  );
  api.check();
});

test("Saving a consultation retains its table through API and reload failures", async ({
  page,
}) => {
  const api = await mockExperience(page);
  await api.visit("/admin/consultations", "Yêu cầu tư vấn");
  await page.getByRole("button", { name: "Xử lý Khách tư vấn QA" }).click();
  await page.getByLabel("Ghi chú xử lý").fill("Đã gọi khách hàng.");
  const gate = api.delay(
    "/contact/consultations/qa-lead",
    "PATCH",
    { message: "Yêu cầu đã thay đổi. Làm mới trước khi lưu." },
    409,
  );
  try {
    await loading(page.getByRole("button", { name: "Lưu cập nhật" }), gate);
    await expect(page.locator("#admin-content table")).toBeVisible();
    expect(gate.payload?.revision).toBe(3);
  } finally {
    gate.release();
  }
  await expect(page.locator("dialog[open]").getByRole("alert")).toContainText(
    "Yêu cầu đã thay đổi",
  );
  await expect(
    page.getByRole("button", { name: "Lưu cập nhật" }),
  ).toBeEnabled();
  api.check();
});

test("CMS saves the revision and keeps the edit dialog locked while pending", async ({
  page,
}) => {
  const api = await mockExperience(page);
  await api.visit("/admin/content", "Nội dung website");
  await page.getByRole("button", { name: "Sửa Banner QA" }).click();
  await page.getByLabel("Tiêu đề").fill("Banner mới QA");
  const gate = api.delay("/admin/content/qa-banner", "PATCH");
  try {
    await loading(
      page.getByRole("button", { name: "Lưu nội dung", exact: true }),
      gate,
    );
    expect(gate.payload?.revision).toBe(4);
    expect(gate.payload?.title).toBe("Banner mới QA");
    await page.keyboard.press("Escape");
    await expect(page.locator("dialog[open]")).toBeVisible();
  } finally {
    gate.release();
  }
  await expect(page.locator("dialog[open]")).toHaveCount(0);
  api.check();
});

test("Review moderation has loading feedback and retains the row during refresh", async ({
  page,
}) => {
  const api = await mockExperience(page);
  await api.visit("/admin/reviews", "Đánh giá sản phẩm");
  const gate = api.delay("/admin/reviews/qa-review", "PATCH");
  try {
    await loading(
      page.getByRole("button", { name: "Duyệt", exact: true }),
      gate,
    );
    expect(gate.payload).toEqual({ revision: 2, status: "published" });
    await expect(
      page.getByText(api.review.text, { exact: true }),
    ).toBeVisible();
  } finally {
    gate.release();
  }
  await expect(
    page.getByRole("button", { name: "Duyệt", exact: true }),
  ).toBeEnabled();
  api.check();
});

test("Debt reminder has loading feedback and server-confirmed success", async ({
  page,
}) => {
  const api = await mockExperience(page);
  await api.visit("/admin/reports", "Báo cáo vận hành");
  const gate = api.delay("/admin/reports/remind", "POST", { sent: true });
  try {
    await loading(
      page.getByRole("button", { name: "Nhắc công nợ Khách QA" }),
      gate,
    );
    expect(gate.payload?.customerId).toBe("KH001");
  } finally {
    gate.release();
  }
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Đã ghi nhận nhắc công nợ hôm nay." }),
  ).toBeVisible();
  api.check();
});

test("A failed Kiot pull retains the last successful comparison", async ({
  page,
}) => {
  const api = await mockExperience(page);
  await api.visit("/admin/integrations", "KiotViet");
  await page.getByRole("tab", { name: "Đối chiếu số dư", exact: true }).click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Lần đối chiếu gần nhất thất bại" }),
  ).toBeVisible();
  const gate = api.delay(
    "/admin/integrations/kiotviet/pull",
    "POST",
    { message: "Không thể lấy bản đối chiếu KiotViet" },
    503,
  );
  try {
    await loading(
      page.getByRole("button", { name: "Lấy số liệu KiotViet" }),
      gate,
    );
    await expect(
      page.getByRole("cell", { name: "12", exact: true }),
    ).toBeVisible();
  } finally {
    gate.release();
  }
  await expect(
    page.getByRole("alert").filter({ hasText: "Không thể lấy bản đối chiếu" }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "12", exact: true }),
  ).toBeVisible();
  api.check();
});

test("PDF downloads use a loading button, private document route and recover from errors", async ({
  page,
}) => {
  const api = await mockExperience(page);
  await api.visit("/admin/orders?order=BT-QA", "Đơn hàng");
  const button = page.getByRole("button", { name: "Tải báo giá", exact: true });
  const gate = api.delay(
    "/admin/orders/BT-QA/document",
    "GET",
    "%PDF-1.4\nQA mock PDF\n%%EOF",
  );
  const downloaded = page.waitForEvent("download");
  try {
    await loading(button, gate);
  } finally {
    gate.release();
  }
  expect((await downloaded).suggestedFilename()).toBe(
    "bao-tin-BT-QA-quote.pdf",
  );
  await expect(button).toBeEnabled();
  const failed = api.delay(
    "/admin/orders/BT-QA/document",
    "GET",
    { message: "Không thể tải tài liệu." },
    503,
  );
  try {
    await loading(button, failed);
  } finally {
    failed.release();
  }
  await expect(
    page.getByRole("status").filter({ hasText: "Không thể tải tài liệu." }),
  ).toBeVisible();
  await expect(button).toBeEnabled();
  api.check();
});

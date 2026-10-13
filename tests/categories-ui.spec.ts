import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { catalog, categoryCatalog } from "../lib/catalog";
import type { AdminCategory } from "../lib/category-management";
import { CATALOG_TEMPLATE_FILENAME, CATALOG_TEMPLATE_URL } from "../lib/catalog-template.mjs";
import { adminReadFixture } from "./admin-read-fixtures";
import { authEventKey } from "../lib/store/auth-slice";

const base = process.env.QA_BASE_URL || "http://127.0.0.1:3010";
if (!["127.0.0.1", "localhost"].includes(new URL(base).hostname))
  throw new Error("Category UI QA only runs locally.");
test.use({ viewport: { width: 1440, height: 1000 } });
test.setTimeout(45000);

async function mockCategories(page: Page, role = "admin", count = categoryCatalog.length) {
  const errors: string[] = [],
    calls: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const rows: AdminCategory[] = Array.from({ length: count }, (_, index) => ({
    ...structuredClone(categoryCatalog[index % categoryCatalog.length]),
    ...(index >= categoryCatalog.length ? { slug: `qa-category-${index}`, name: `Danh mục nhập ${index}` } : {}),
    visible: true,
    sortOrder: index * 10,
    revision: 2,
    productCount: catalog.filter(
      (product) => product.category === categoryCatalog[index % categoryCatalog.length].slug,
    ).length,
  }));
  let gate:
    | {
        path: string;
        method: string;
        status: number;
        count: number;
        wait: Promise<void>;
        release: () => void;
      }
    | undefined;
  await page.route("**/api/backend/**", async (route) => {
    const request = route.request(),
      path = new URL(request.url()).pathname.slice("/api/backend".length),
      method = request.method();
    calls.push(`${method} ${path}`);
    const current = gate;
    if (current && current.path === path && current.method === method) {
      current.count++;
      await current.wait;
      if (current.status >= 400) {
        await route.fulfill({
          status: current.status,
          json: {
            message: "Danh mục đã thay đổi. Làm mới dữ liệu trước khi lưu lại.",
          },
        });
        return;
      }
    }
    const publicRows = () =>
      rows
        .filter((row) => row.visible)
        .sort((a, b) => a.sortOrder - b.sortOrder);
    if (method === "POST" && path === "/media/product-images") {
      await route.fulfill({
        status: 201,
        json: { urls: [categoryCatalog[0].image] },
      });
      return;
    }
    if (method === "POST" && path === "/admin/categories") {
      const row = {
        ...request.postDataJSON(),
        revision: 1,
        productCount: 0,
      } as AdminCategory;
      rows.push(row);
      await route.fulfill({ status: 201, json: { category: row } });
      return;
    }
    if (method === "POST" && path === "/admin/categories/bulk") {
      const input = request.postDataJSON() as { action: "show" | "hide"; categories: { slug: string; revision: number }[] };
      const selected = rows.filter(row => input.categories.some(category => category.slug === row.slug));
      if (selected.length !== input.categories.length || selected.some(row => row.revision !== input.categories.find(category => category.slug === row.slug)?.revision)) {
        await route.fulfill({ status: 409, json: { message: "Danh mục đã thay đổi. Làm mới và chọn lại trước khi cập nhật." } }); return;
      }
      const visible = input.action === "show";
      selected.forEach(row => { row.visible = visible; row.revision++; });
      await route.fulfill({ status: 201, json: { updated: selected.length, visible, categories: selected.map(({ slug, revision }) => ({ slug, revision, visible })) } }); return;
    }
    if (method === "PATCH" && path.startsWith("/admin/categories/")) {
      const row = rows.find(
        (row) => row.slug === decodeURIComponent(path.split("/")[3]),
      )!;
      Object.assign(row, request.postDataJSON(), {
        revision: row.revision + 1,
      });
      await route.fulfill({ json: { category: row } });
      return;
    }
    const responses: Record<string, unknown> = {
      "/auth/session": {
        user: {
          id: "qa-staff",
          name: "QA Staff",
          email: "qa@example.test",
          role,
          branches: ["Quy Nhơn"],
          customer: null,
        },
      },
      "/account": { favorites: [] },
      "/orders": [],
      "/notifications/count": { unreadCount: 0 },
      "/admin/categories": { items: rows },
      "/catalog/bootstrap": { products: catalog, categories: publicRows() },
      "/catalog/selection": { products: catalog.filter(product => new URL(request.url()).searchParams.getAll("ids").includes(product.id)) },
      "/admin/resources": {
        products: catalog,
        categories: rows,
        customers: [],
        orders: [],
        approvals: [],
        warehouse: {},
        receipts: [],
        paymentDueDates: {},
        today: "2026-10-07",
      },
    };
    const read = method === "GET" ? adminReadFixture(new URL(request.url()), responses["/admin/resources"] as Parameters<typeof adminReadFixture>[1]) : undefined;
    if (read) { await route.fulfill({ json: read }); return; }
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
  await page.goto(`${base}/admin/categories`);
  await expect(
    page.getByRole("heading", { name: "Danh mục sản phẩm", exact: true }),
  ).toBeVisible();
  if (role !== "warehouse")
    await expect(
      page.getByRole("region", { name: "Bảng dữ liệu" }),
    ).toBeVisible();
  return {
    rows,
    errors,
    calls,
    hold(path: string, method = "GET", status = 200) {
      let release!: () => void;
      const wait = new Promise<void>((resolve) => {
        release = resolve;
      });
      const current = { path, method, status, count: 0, wait, release };
      gate = current;
      return {
        current,
        release: () => {
          gate = undefined;
          release();
        },
      };
    },
  };
}
const dialog = (page: Page) => page.getByRole("dialog");

test("Category Excel template downloads on mobile without submitting data", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 1000 });
  const api = await mockCategories(page);
  const link = page.getByRole("link", { name: "Tải mẫu Excel", exact: true });
  await expect(link).toHaveAttribute("href", CATALOG_TEMPLATE_URL);
  const downloading = page.waitForEvent("download");
  await link.click();
  const download = await downloading;
  expect(download.suggestedFilename()).toBe(CATALOG_TEMPLATE_FILENAME);
  expect(await download.failure()).toBeNull();
  await expect(page).toHaveURL(`${base}/admin/categories`);
  expect(api.calls.every((call) => call.startsWith("GET "))).toBe(true);
  expect(api.errors).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await mkdir("/private/tmp/baotin-excel-template", { recursive: true });
  await page.screenshot({ path: "/private/tmp/baotin-excel-template/categories-320.png", fullPage: true });
});

test("Add a category with a cover and groups; use it immediately in product forms and navigation", async ({
  page,
}) => {
  const qa = await mockCategories(page);
  await page
    .getByRole("button", { name: "Thêm danh mục", exact: true })
    .click();
  await dialog(page).locator("#category-name").fill("Thiết bị phòng tắm");
  await expect(dialog(page).locator("#category-slug")).toHaveValue(
    "thiet-bi-phong-tam",
  );
  await dialog(page)
    .locator("#category-description")
    .fill("Thiết bị và phụ kiện phòng tắm");
  await dialog(page).getByRole("button", { name: "Thêm nhóm" }).click();
  await dialog(page)
    .getByRole("textbox", { name: "Tên nhóm 1" })
    .fill("Vòi nước");
  await dialog(page)
    .getByLabel("Tải ảnh danh mục")
    .setInputFiles({
      name: "cover.png",
      mimeType: "image/png",
      buffer: Buffer.from("mock-upload"),
    });
  await expect(
    dialog(page).getByRole("img", { name: "Thiết bị phòng tắm" }),
  ).toBeVisible();
  await dialog(page).getByRole("button", { name: "Lưu danh mục" }).click();
  await expect(dialog(page)).not.toBeVisible();
  await expect(
    page.getByRole("region", { name: "Bảng dữ liệu" }),
  ).toContainText("Thiết bị phòng tắm");
  await page.getByRole("link", { name: "Sản phẩm", exact: true }).click();
  await page.getByRole("link", { name: "Thêm sản phẩm", exact: true }).click();
  await page.locator("#product-category").selectOption("thiet-bi-phong-tam");
  await expect(page.locator("#product-subcategory")).toContainText("Vòi nước");
  await page.getByRole("link", { name: "Website bán hàng" }).click();
  await page.getByRole("dialog", { name: "Bỏ thay đổi chưa lưu?" }).getByRole("button", { name: "Bỏ thay đổi", exact: true }).click();
  await expect(page).toHaveURL(base + "/");
  // Mocked client writes do not invalidate the real SSR server's catalog cache.
  await page.evaluate(key => window.dispatchEvent(new StorageEvent("storage", { key, newValue: JSON.stringify({ type: "refresh" }) })), authEventKey);
  await expect(
    page
      .getByRole("navigation", { name: "Danh mục bên cạnh banner" })
      .getByRole("link", { name: "Thiết bị phòng tắm" }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("navigation", { name: "Danh mục sản phẩm", exact: true })
      .getByRole("link", { name: "Thiết bị phòng tắm" }),
  ).toHaveAttribute("href", "/category/thiet-bi-phong-tam");
  await page
    .getByRole("button", { name: "Danh mục sản phẩm", exact: true })
    .click();
  await expect(
    page.getByRole("menuitem", { name: "Thiết bị phòng tắm" }),
  ).toBeVisible();
  expect(qa.errors).toEqual([]);
});

test("Save has a stable spinner, blocks duplicate submits and dismissal, and keeps the table", async ({
  page,
}) => {
  const qa = await mockCategories(page);
  await page
    .getByRole("button", { name: "Sửa danh mục Phụ kiện bếp", exact: true })
    .click();
  await dialog(page).locator("#category-name").fill("Phụ kiện bếp mới");
  const held = qa.hold("/admin/categories/phu-kien-bep", "PATCH");
  const save = dialog(page).getByRole("button", { name: "Lưu danh mục" });
  const width = (await save.boundingBox())!.width;
  await save.click();
  await expect(save).toHaveAttribute("aria-busy", "true");
  await expect(save.locator("[data-loading-spinner]")).toBeVisible();
  expect((await save.boundingBox())!.width).toBeCloseTo(width, 0);
  await expect(
    dialog(page).getByRole("button", { name: "Đóng", exact: true }),
  ).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(dialog(page)).toBeVisible();
  await dialog(page).locator("form").dispatchEvent("submit");
  await expect.poll(() => held.current.count).toBe(1);
  await expect(
    page.getByRole("region", { name: "Bảng dữ liệu" }),
  ).toBeAttached();
  held.release();
  await expect(dialog(page)).not.toBeVisible();
  await expect(
    page.getByRole("region", { name: "Bảng dữ liệu" }),
  ).toContainText("Phụ kiện bếp mới");
  expect(qa.errors).toEqual([]);
});

test("Conflicts preserve the draft and background refresh never unmounts the table or editor", async ({
  page,
}) => {
  const qa = await mockCategories(page);
  await page
    .getByRole("button", { name: "Sửa danh mục Phụ kiện bếp", exact: true })
    .click();
  await expect(dialog(page).locator("#category-slug")).toBeDisabled();
  await dialog(page).locator("#category-description").fill("Nội dung chưa lưu");
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(dialog(page).locator("#category-description")).toHaveValue(
    "Nội dung chưa lưu",
  );
  const held = qa.hold("/admin/categories/phu-kien-bep", "PATCH", 409);
  await dialog(page).getByRole("button", { name: "Lưu danh mục" }).click();
  held.release();
  await expect(dialog(page).getByRole("alert")).toContainText(
    "Danh mục đã thay đổi",
  );
  await expect(dialog(page).locator("#category-description")).toHaveValue(
    "Nội dung chưa lưu",
  );
  await expect(
    page.getByRole("region", { name: "Bảng dữ liệu" }),
  ).toBeAttached();
  expect(qa.errors).toEqual([]);
});

test("Reject duplicate groups and missing covers before sending a mutation", async ({
  page,
}) => {
  const qa = await mockCategories(page);
  await page
    .getByRole("button", { name: "Thêm danh mục", exact: true })
    .click();
  await dialog(page).locator("#category-name").fill("Danh mục mới");
  await dialog(page).getByRole("button", { name: "Lưu danh mục" }).click();
  await expect(dialog(page).getByRole("alert")).toContainText(
    "cần ảnh đại diện",
  );
  for (const name of ["Nhóm mới", "nhóm mới"]) {
    await dialog(page).getByRole("button", { name: "Thêm nhóm" }).click();
    await dialog(page)
      .getByRole("textbox", {
        name: `Tên nhóm ${name === "Nhóm mới" ? 1 : 2}`,
        exact: true,
      })
      .fill(name);
  }
  await dialog(page).getByRole("button", { name: "Lưu danh mục" }).click();
  await expect(dialog(page).getByRole("alert")).toContainText(
    "không được trùng",
  );
  expect(qa.calls.filter((call) => call === "POST /admin/categories")).toEqual(
    [],
  );
});

test("Hiding removes a category from navigation while it remains in admin and the hidden filter", async ({
  page,
}) => {
  const qa = await mockCategories(page);
  await page
    .getByRole("button", { name: "Sửa danh mục Phụ kiện bếp", exact: true })
    .click();
  await dialog(page).getByLabel("Hiện trong danh mục").uncheck();
  await dialog(page).getByRole("button", { name: "Lưu danh mục" }).click();
  await expect(dialog(page)).not.toBeVisible();
  await page.getByLabel("Trạng thái danh mục").selectOption("hidden");
  await expect(
    page.getByRole("region", { name: "Bảng dữ liệu" }),
  ).toContainText("Phụ kiện bếp");
  await expect(
    page.getByRole("region", { name: "Bảng dữ liệu" }),
  ).not.toContainText("LED tủ/kệ");
  await page.getByRole("link", { name: "Website bán hàng" }).click();
  await expect(
    page
      .getByRole("navigation", { name: "Danh mục bên cạnh banner" })
      .getByRole("link", { name: "Phụ kiện bếp", exact: true }),
  ).toHaveCount(0);
  expect(qa.errors).toEqual([]);
});

for (const role of ["sales", "accountant"])
  test(`${role} reads categories without mutation controls`, async ({
    page,
  }) => {
    const qa = await mockCategories(page, role);
    await expect(
      page.getByRole("button", { name: "Thêm danh mục" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: /^Sửa danh mục/ }),
    ).toHaveCount(0);
    await expect(page.getByLabel("Thao tác danh mục hàng loạt", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("checkbox", { name: /^Chọn danh mục/ })).toHaveCount(0);
    expect(qa.errors).toEqual([]);
  });

test("Refresh keeps results and shows loading without replacing the table", async ({
  page,
}) => {
  const qa = await mockCategories(page);
  const held = qa.hold("/admin/categories");
  await page.getByRole("button", { name: "Làm mới", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Làm mới", exact: true }),
  ).toHaveAttribute("aria-busy", "true");
  await expect(
    page.getByRole("region", { name: "Bảng dữ liệu" }),
  ).toBeVisible();
  held.release();
  await expect(
    page.getByRole("button", { name: "Làm mới", exact: true }),
  ).not.toHaveAttribute("aria-busy", "true");
  expect(qa.errors).toEqual([]);
});

test("Desktop and mobile editor remain within the viewport", async ({
  page,
}) => {
  const qa = await mockCategories(page);
  await mkdir("/private/tmp/baotin-categories", { recursive: true });
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await page
      .getByRole("button", { name: "Thêm danh mục", exact: true })
      .click();
    await dialog(page).locator("#category-name").fill("Thiết bị phòng tắm");
    await expect(dialog(page)).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    const rect = (await dialog(page).boundingBox())!;
    expect(rect.x).toBeGreaterThanOrEqual(0);
    expect(rect.x + rect.width).toBeLessThanOrEqual(width + 1);
    await page.screenshot({
      path: `/private/tmp/baotin-categories/editor-${width}.png`,
      fullPage: true,
    });
    await dialog(page)
      .getByRole("button", { name: "Hủy", exact: true })
      .click();
    await page.getByRole("dialog", { name: "Bỏ thay đổi chưa lưu?" }).getByRole("button", { name: "Bỏ thay đổi", exact: true }).click();
  }
  expect(qa.errors).toEqual([]);
});

for (const width of [1440, 768, 390, 320]) {
  test(`Select and show/hide filtered categories across pages at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const qa = await mockCategories(page, "admin", 28);
    const bar = page.getByLabel("Thao tác danh mục hàng loạt", { exact: true });
    const table = page.getByRole("region", { name: "Bảng dữ liệu" });
    await expect(table.locator("tbody tr")).toHaveCount(10);
    await table.getByRole("checkbox", { name: "Chọn tất cả danh mục trên trang", exact: true }).check();
    await expect(bar).toContainText("Đã chọn 10");
    await page.getByRole("button", { name: "Trang 2", exact: true }).click();
    await table.getByRole("checkbox", { name: "Chọn tất cả danh mục trên trang", exact: true }).check();
    await expect(bar).toContainText("Đã chọn 20");
    await bar.getByRole("button", { name: "Chọn tất cả 28", exact: true }).click();
    await expect(bar).toContainText("Đã chọn 28");
    await bar.getByRole("button", { name: "Ẩn danh mục", exact: true }).click();
    const confirmation = page.getByRole("dialog", { name: "Ẩn danh mục hàng loạt", exact: true });
    await expect(confirmation).toContainText("28 danh mục");
    await expect(confirmation).toContainText("Sản phẩm riêng tư vẫn giữ nguyên");
    const held = qa.hold("/admin/categories/bulk", "POST", 201);
    try {
      await confirmation.getByRole("button", { name: "Áp dụng", exact: true }).click();
      await expect(confirmation.getByRole("button", { name: "Áp dụng", exact: true })).toHaveAttribute("aria-busy", "true");
      await expect(table).toBeVisible();
      await expect(table.locator("tbody tr")).toHaveCount(10);
      await expect(page.getByLabel("Trạng thái danh mục", { exact: true })).toBeDisabled();
      await expect(confirmation.getByRole("button", { name: "Áp dụng", exact: true }).locator("[data-loading-spinner]")).toHaveCount(1);
    } finally { held.release(); }
    await expect(confirmation).not.toBeVisible();
    await expect(bar).toContainText("Đã chọn 0");
    expect(qa.calls.filter(call => call === "POST /admin/categories/bulk")).toHaveLength(1);
    await expect.poll(() => qa.rows.every(category => !category.visible)).toBe(true);
    await page.getByLabel("Trạng thái danh mục", { exact: true }).selectOption("hidden");
    await page.getByRole("searchbox").fill("Danh mục nhập");
    await bar.getByRole("button", { name: "Chọn tất cả 20", exact: true }).click();
    await bar.getByRole("button", { name: "Hiển thị", exact: true }).click();
    const show = page.getByRole("dialog", { name: "Hiển thị danh mục hàng loạt", exact: true });
    await show.getByRole("button", { name: "Áp dụng", exact: true }).click();
    await expect(show).not.toBeVisible();
    await expect(table).toContainText("Không có dữ liệu phù hợp.");
    await expect.poll(() => qa.rows.filter(category => category.visible).length).toBe(20);
    expect(qa.calls.some(call => call === "GET /admin/state")).toBe(false);
    expect(qa.calls.filter(call => call.startsWith("PATCH /admin/categories/"))).toEqual([]);
    await page.getByLabel("Trạng thái danh mục", { exact: true }).selectOption("all");
    await page.getByRole("searchbox").fill("");
    await expect(table.locator("tbody tr")).toHaveCount(10);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await mkdir("/private/tmp/baotin-category-bulk", { recursive: true });
    await page.screenshot({ path: `/private/tmp/baotin-category-bulk/list-${width}.png`, fullPage: true });
    expect(qa.errors).toEqual([]);
  });
}

test("Category bulk errors keep selections and changes to filters clear them", async ({ page }) => {
  const qa = await mockCategories(page);
  const bar = page.getByLabel("Thao tác danh mục hàng loạt", { exact: true });
  const checkbox = page.getByRole("checkbox", { name: "Chọn danh mục Phụ kiện bếp", exact: true });
  await checkbox.check();
  const heading = page.getByRole("checkbox", { name: "Chọn tất cả danh mục trên trang", exact: true });
  expect(await heading.evaluate((input: HTMLInputElement) => input.indeterminate)).toBe(true);
  await bar.getByRole("button", { name: "Hiển thị", exact: true }).click();
  const confirmation = page.getByRole("dialog", { name: "Hiển thị danh mục hàng loạt", exact: true });
  const held = qa.hold("/admin/categories/bulk", "POST", 409);
  await confirmation.getByRole("button", { name: "Áp dụng", exact: true }).click();
  held.release();
  await expect(confirmation.getByRole("alert")).toContainText("Danh mục đã thay đổi");
  await expect(confirmation.getByRole("button", { name: "Áp dụng", exact: true })).toBeEnabled();
  await expect(checkbox).toBeChecked();
  await confirmation.getByRole("button", { name: "Hủy", exact: true }).click();
  await expect(bar).toContainText("Đã chọn 1");
  await page.getByRole("searchbox").fill("LED");
  await expect(bar).toContainText("Đã chọn 0");
  await page.getByRole("searchbox").fill("");
  await expect(bar).toContainText("Đã chọn 0");
  expect(qa.errors).toEqual([]);
});

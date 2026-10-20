import { expect, test, type Page } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { mkdir } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { catalog, categoryCatalog } from "../lib/catalog";
import type { ApiAdminState } from "../lib/api-types";
import { adminReadFixture } from "./admin-read-fixtures";

const base = "http://127.0.0.1:3070";
const backend = "http://127.0.0.1:4098";
type AdminProduct = ApiAdminState["products"][number];
type AttachWrite = { groupId: string; products: { id: string; revision: number }[]; targetId: string; targetRevision: number; attributes: { name: string; value: string }[] };
let server: Server, child: ChildProcess, logs = "";
test.describe.configure({ mode: "serial" });
test.setTimeout(60000);
test.beforeAll(async ({ request }) => {
  test.setTimeout(120000);
  server = createServer((incoming, outgoing) => {
    const path = new URL(incoming.url!, backend).pathname;
    const value = path === "/api/catalog/bootstrap" ? { products: [], categories: categoryCatalog }
      : path === "/api/health" ? { status: "ok" } : path === "/api/auth/session" ? { user: null } : [];
    outgoing.writeHead(200, { "Content-Type": "application/json" }); outgoing.end(JSON.stringify(value));
  });
  await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(4098, "127.0.0.1", resolve); });
  child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--webpack", "-H", "127.0.0.1", "-p", "3070"], {
    env: { ...process.env, NEXT_DIST_DIR: ".next-variant-attach-qa", NEXT_PUBLIC_API_MODE: "true", BACKEND_URL: backend, TOKIO_WORKER_THREADS: "1", RAYON_NUM_THREADS: "1" }, stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout?.on("data", data => { logs += data; }); child.stderr?.on("data", data => { logs += data; });
  for (let attempt = 0; attempt < 100; attempt++) {
    if (child.exitCode !== null) throw new Error(logs);
    if (await request.get(`${base}/api/backend/health`, { timeout: 1000 }).then(response => response.ok()).catch(() => false)) return;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(logs);
});
test.afterAll(async () => {
  if (child && child.exitCode === null) { const stopped = once(child, "exit"); child.kill("SIGTERM"); await stopped; }
  if (server?.listening) { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
});

async function mockAttach(page: Page, standalone = false) {
  let products: AdminProduct[] = [
    ...[0, 1].map(index => ({ ...catalog[0], id: `attach-${index}`, slug: `attach-${index}`, code: `GROUP-${index}`, variantGroupId: "attach-0", variantAttributes: [{ name: "Kích thước", value: `${600 + index * 100}mm` }], published: true, revision: index + 7 })),
    ...Array.from({ length: 12 }, (_, index) => ({ ...catalog[0], id: `candidate-${index}`, slug: `candidate-${index}`, code: `CANDIDATE-${String(index + 1).padStart(2, "0")}`, name: `Sản phẩm có sẵn ${index + 1}`, size: "800mm", variantGroupId: undefined, variantAttributes: undefined, published: index !== 11, revision: index + 20 })),
  ];
  if (standalone) {
    products[0] = { ...products[0], variantGroupId: undefined, variantAttributes: undefined };
    products[1] = { ...products[1], variantGroupId: products[1].id };
  }
  let writeError = "", groupError = "", groupedCandidate = false, release: (() => void) | undefined;
  let wait: Promise<void> | undefined;
  const writes: AttachWrite[] = [], searches: URLSearchParams[] = [], errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/_next/image?**", route => route.fulfill({ contentType: "image/png", body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aSu8AAAAASUVORK5CYII=", "base64") }));
  await page.route("**/api/backend/**", async route => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname.slice("/api/backend".length);
    const state: ApiAdminState = { products: products.filter(product => product.id.startsWith("attach-") || product.variantGroupId === "attach-0"), categories: categoryCatalog, orders: [], customers: [], approvals: [], receipts: [], warehouse: {}, paymentDueDates: {}, today: "2026-10-20" };
    if (request.method() === "GET" && /\/admin\/products\/[^/]+\/variants$/.test(path)) {
      const selected = products.find(product => product.id === path.split("/")[3])!;
      const members = selected.variantGroupId ? products.filter(product => product.variantGroupId === selected.variantGroupId) : [selected];
      await route.fulfill({ status: groupError ? 503 : 200, json: groupError ? { message: groupError } : { products: groupedCandidate && selected.id.startsWith("candidate-") ? [selected, products[1]] : members } }); return;
    }
    if (request.method() === "POST" && path.endsWith("/attach-variant")) {
      const body = request.postDataJSON() as AttachWrite; writes.push(body);
      if (wait) await wait;
      if (writeError) { await route.fulfill({ status: 409, json: { message: writeError } }); return; }
      products = products.map(product => product.id === body.targetId ? { ...product, variantGroupId: body.groupId, variantAttributes: body.attributes, revision: product.revision! + 1 }
        : product.id === body.groupId && !product.variantGroupId ? { ...product, variantGroupId: product.id, variantAttributes: [], revision: product.revision! + 1 } : product);
      await route.fulfill({ status: 201, json: { groupId: body.groupId, products } }); return;
    }
    if (request.method() !== "GET") { errors.push(`Unexpected write ${path}`); await route.fulfill({ status: 405, json: {} }); return; }
    if (/^\/admin\/products\/[^/]+\/editor$/.test(path)) {
      await route.fulfill({ json: adminReadFixture(url, state) }); return;
    }
    if (path === "/admin/browse") {
      searches.push(url.searchParams);
      await route.fulfill({ json: adminReadFixture(url, { ...state, products }) }); return;
    }
    const responses: Record<string, unknown> = {
      "/auth/session": { user: { id: "qa-admin", name: "QA Admin", email: "qa@example.test", role: "admin", branches: ["Quy Nhơn"], customer: null } },
      "/admin/resources": state, "/catalog/bootstrap": { products: products.filter(product => product.published), categories: categoryCatalog },
      "/catalog/selection": { products }, "/notifications/count": { unreadCount: 0 }, "/orders": [], "/account": { favorites: [] },
    };
    const response = responses[path];
    if (!response) errors.push(`Unexpected read ${path}`);
    await route.fulfill({ status: response ? 200 : 404, json: response || {} });
  });
  return { writes, errors, searches, products: () => structuredClone(products), writeError: (message: string) => { writeError = message; }, groupError: (message: string) => { groupError = message; }, groupedCandidate: () => { groupedCandidate = true; }, hold: () => { wait = new Promise<void>(resolve => { release = resolve; }); }, release: () => release?.() };
}

for (const width of [1440, 390]) test(`Link an existing private SKU from server-side paginated search at ${width}px`, async ({ page }) => {
  const fixture = await mockAttach(page);
  await page.setViewportSize({ width, height: 1000 });
  await page.goto(`${base}/admin/products/attach-1/edit`);
  await page.getByRole("button", { name: "Liên kết sản phẩm có sẵn", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Liên kết sản phẩm có sẵn", exact: true });
  await expect(dialog.getByRole("radio", { name: "Chọn GROUP-0", exact: true })).toBeDisabled();
  await dialog.getByRole("button", { name: "Trang sau", exact: true }).click();
  await dialog.getByRole("radio", { name: "Chọn CANDIDATE-12", exact: true }).check();
  const value = dialog.getByLabel("Giá trị Kích thước", { exact: false });
  await expect(value).toHaveValue("800mm");
  const confirm = dialog.getByRole("button", { name: "Liên kết vào nhóm", exact: true });
  await value.fill(""); await expect(confirm).toBeDisabled(); await value.fill("850mm");
  await mkdir("/private/tmp/baotin-variant-attach", { recursive: true });
  await page.screenshot({ path: `/private/tmp/baotin-variant-attach/${width}.png` });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  const before = fixture.products(); fixture.hold();
  try {
    await confirm.click();
    await expect.poll(() => fixture.writes.length).toBe(1);
    await expect(confirm).toBeDisabled(); await expect(dialog.getByRole("button", { name: "Hủy", exact: true })).toBeDisabled();
    expect(fixture.writes[0]).toEqual({ groupId: "attach-0", products: before.slice(0, 2).map(({ id, revision }) => ({ id, revision })), targetId: "candidate-11", targetRevision: 31, attributes: [{ name: "Kích thước", value: "850mm" }] });
  } finally { fixture.release(); }
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("list", { name: "Các SKU trong nhóm", exact: true }).getByRole("link", { name: "CANDIDATE-12", exact: true })).toBeVisible();
  expect(fixture.products().find(product => product.id === "candidate-11")?.published).toBe(false);
  expect(fixture.searches.some(query => query.get("page") === "2" && query.get("branch") === "Quy Nhơn" && query.get("status") === "all")).toBe(true);
  expect(fixture.errors).toEqual([]);
});

test("Unsaved edits block linking; cancellation does not write", async ({ page }) => {
  const fixture = await mockAttach(page);
  await page.goto(`${base}/admin/products/attach-0/edit`);
  const open = page.getByRole("button", { name: "Liên kết sản phẩm có sẵn", exact: true });
  await open.click();
  const dialog = page.getByRole("dialog", { name: "Liên kết sản phẩm có sẵn", exact: true });
  await dialog.getByRole("button", { name: "Hủy", exact: true }).click();
  await page.getByLabel("Tên sản phẩm", { exact: false }).fill("Tên chưa lưu");
  await expect(open).toBeDisabled();
  await expect(page.getByText("Lưu các thay đổi trước khi liên kết sản phẩm có sẵn.", { exact: true })).toBeVisible();
  expect(fixture.writes).toHaveLength(0); expect(fixture.errors).toEqual([]);
});

test("Search by SKU finds unloaded products and standalone products can create an empty-schema group", async ({ page }) => {
  const fixture = await mockAttach(page, true);
  await page.goto(`${base}/admin/products/attach-0/edit`);
  await page.getByRole("button", { name: "Liên kết sản phẩm có sẵn", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Liên kết sản phẩm có sẵn", exact: true });
  await dialog.getByRole("searchbox").fill("CANDIDATE-12");
  await dialog.getByRole("radio", { name: "Chọn CANDIDATE-12", exact: true }).check();
  await expect(dialog).toContainText("Khách sẽ chọn theo mã SKU");
  await dialog.getByRole("button", { name: "Liên kết vào nhóm", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(fixture.writes[0].attributes).toEqual([]); expect(fixture.writes[0].products).toEqual([{ id: "attach-0", revision: 7 }]);
  expect(fixture.searches.some(query => query.get("q") === "CANDIDATE-12")).toBe(true);
  expect(fixture.errors).toEqual([]);
});

test("A candidate with its own populated group cannot be linked", async ({ page }) => {
  const fixture = await mockAttach(page); fixture.groupedCandidate();
  await page.goto(`${base}/admin/products/attach-0/edit`);
  await page.getByRole("button", { name: "Liên kết sản phẩm có sẵn", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Liên kết sản phẩm có sẵn", exact: true });
  await dialog.getByRole("radio", { name: "Chọn CANDIDATE-01", exact: true }).check();
  await expect(dialog.getByRole("alert")).toContainText("Tách SKU khỏi nhóm đó trước");
  await expect(dialog.getByRole("button", { name: "Liên kết vào nhóm", exact: true })).toBeDisabled();
  expect(fixture.writes).toHaveLength(0); expect(fixture.errors).toEqual([]);
});

test("Read errors and detailed conflicts require refreshed snapshots before retry", async ({ page }) => {
  const fixture = await mockAttach(page); fixture.groupError("Không thể tải nhóm");
  await page.goto(`${base}/admin/products/attach-0/edit`);
  await page.getByRole("button", { name: "Liên kết sản phẩm có sẵn", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Liên kết sản phẩm có sẵn", exact: true });
  const confirm = dialog.getByRole("button", { name: "Liên kết vào nhóm", exact: true });
  await expect(dialog.getByRole("alert")).toContainText("Không thể tải nhóm"); await expect(confirm).toBeDisabled();
  fixture.groupError(""); fixture.writeError("Tổ hợp thuộc tính bị trùng:\nSKU GROUP-0, CANDIDATE-01 cùng có Kích thước: 600mm.");
  await dialog.getByRole("button", { name: "Tải lại dữ liệu liên kết", exact: true }).click();
  await dialog.getByRole("radio", { name: "Chọn CANDIDATE-01", exact: true }).check();
  await confirm.click();
  await expect(dialog.getByRole("alert")).toContainText("GROUP-0, CANDIDATE-01"); await expect(confirm).toBeDisabled();
  fixture.writeError("");
  await dialog.getByRole("button", { name: "Tải lại dữ liệu liên kết", exact: true }).click();
  await dialog.getByRole("radio", { name: "Chọn CANDIDATE-01", exact: true }).check();
  await confirm.click(); await expect(dialog).toHaveCount(0);
  expect(fixture.writes).toHaveLength(2); expect(fixture.errors).toEqual([]);
});

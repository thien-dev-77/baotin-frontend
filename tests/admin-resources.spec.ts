import { expect, test } from "@playwright/test";
import { AdminResourceCache, emptyAdminState, resourcesChangedBy, resourcesForAdminPage } from "../lib/admin-resources";

test("Admin page dependencies never default to the entire state", () => {
  expect(resourcesForAdminPage("/admin/products")).toEqual(["products", "categories"]);
  expect(resourcesForAdminPage("/admin/orders")).toEqual(["orders"]);
  for (const path of ["/admin/users", "/admin/settings", "/admin/notifications", "/admin/reports", "/admin/categories"]) expect(resourcesForAdminPage(path)).toEqual([]);
  expect(resourcesChangedBy("pick-item")).toEqual(["orders"]);
  expect(resourcesChangedBy("due-date")).toEqual(["orders", "customers"]);
  expect(resourcesChangedBy("advance-order")).toEqual(["orders", "products", "customers"]);
});

test("Resource cache projects only requested groups and isolates branches and users", async () => {
  const cache = new AdminResourceCache("user-a");
  const fixture = { ...emptyAdminState(), today: "2026-10-08" };
  await cache.load("Quy Nhơn", ["products"], async () => fixture, () => undefined);
  expect(cache.loaded("Quy Nhơn")).toEqual(["products"]);
  expect(cache.loaded("Tuy Hòa")).toEqual([]);
  expect(new AdminResourceCache("user-b").loaded("Quy Nhơn")).toEqual([]);
  let reads = 0;
  await cache.load("Quy Nhơn", ["products"], async () => { reads++; return fixture; }, () => undefined);
  expect(reads).toBe(0);
});

test("Overlapping resource reads deduplicate and only fetch missing dependencies", async () => {
  const cache = new AdminResourceCache("user-a");
  let release!: () => void;
  const wait = new Promise<void>(resolve => { release = resolve; });
  const requests: string[][] = [];
  const fetcher = async (_branch: string, resources: readonly string[]) => { requests.push(Array.from(resources)); await wait; return emptyAdminState(); };
  const first = cache.load("Quy Nhơn", ["orders"], fetcher, () => undefined);
  const second = cache.load("Quy Nhơn", ["orders", "products"], fetcher, () => undefined);
  await Promise.resolve();
  expect(requests).toEqual([["orders"], ["products"]]);
  release(); await Promise.all([first, second]);
  expect(cache.pending("Quy Nhơn")).toBe(false);
});

test("Invalidation keeps rows visible but rejects stale responses and retries failed refreshes", async () => {
  const cache = new AdminResourceCache("user-a");
  await cache.load("Quy Nhơn", ["orders"], async () => ({ ...emptyAdminState(), today: "2026-10-08" }), () => undefined);
  cache.invalidate("Quy Nhơn", ["orders"]);
  expect(cache.loaded("Quy Nhơn")).toEqual(["orders"]);
  let release!: () => void;
  const wait = new Promise<void>(resolve => { release = resolve; });
  const older = cache.load("Quy Nhơn", ["orders"], async () => { await wait; return { ...emptyAdminState(), today: "2000-01-01" }; }, () => undefined);
  cache.invalidate("Quy Nhơn", ["orders"]);
  await cache.load("Quy Nhơn", ["orders"], async () => ({ ...emptyAdminState(), today: "2026-10-09" }), () => undefined);
  release(); await older;
  expect(cache.state("Quy Nhơn").today).toBe("2026-10-09");
  cache.invalidate("Quy Nhơn", ["orders"]);
  await expect(cache.load("Quy Nhơn", ["orders"], async () => { throw new Error("offline"); }, () => undefined)).rejects.toThrow("offline");
  expect(cache.loaded("Quy Nhơn")).toEqual(["orders"]);
  await cache.load("Quy Nhơn", ["orders"], async () => emptyAdminState(), () => undefined);
  expect(cache.pending("Quy Nhơn")).toBe(false);
});

test("Malformed resource payloads cannot poison the cache", async () => {
  const cache = new AdminResourceCache("user-a");
  await expect(cache.load("Quy Nhơn", ["orders"], async () => ({}), () => undefined)).rejects.toThrow("Dữ liệu quản trị không hợp lệ");
  expect(cache.loaded("Quy Nhơn")).toEqual([]);
});

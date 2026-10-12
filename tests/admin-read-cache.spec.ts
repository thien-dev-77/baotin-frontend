import { test, expect } from "@playwright/test";
import { AdminReadCache } from "../lib/admin-read-cache";

test("Dedicated admin reads deduplicate, cache for 60 seconds and isolate scopes", async () => {
  const cache = new AdminReadCache("staff-a");
  let release!: () => void;
  let reads = 0;
  const wait = new Promise<void>(resolve => { release = resolve; });
  const fetcher = async () => { reads++; await wait; return { value: 1 }; };
  const first = cache.load("/admin/content?branch=A", fetcher);
  const second = cache.load("/admin/content?branch=A", fetcher);
  release(); await Promise.all([first, second]);
  expect(reads).toBe(1);
  await cache.load("/admin/content?branch=A", fetcher); expect(reads).toBe(1);
  expect(cache.peek("/admin/content?branch=B")).toBeUndefined();
  expect(new AdminReadCache("staff-b").peek("/admin/content?branch=A")).toBeUndefined();
  const clock = Date.now;
  try { Date.now = () => clock() + 60_001; await cache.load("/admin/content?branch=A", fetcher); expect(reads).toBe(2); }
  finally { Date.now = clock; }
});

test("Invalidation refreshes mounted readers only and rejects obsolete cache writes", async () => {
  const cache = new AdminReadCache();
  let release!: () => void;
  const wait = new Promise<void>(resolve => { release = resolve; });
  await cache.load("orders", async () => "first");
  const old = cache.load("orders", async () => { await wait; return "obsolete"; }, true);
  const stop = cache.watch("orders", async () => { await cache.load("orders", async () => "new", true); });
  await cache.refresh(path => path === "orders");
  release(); await old;
  expect(cache.peek("orders")).toBe("new");
  stop(); await cache.refresh(); expect(cache.peek("orders")).toBe("new");
  await expect(cache.load("orders", async () => { throw new Error("offline"); }, true)).rejects.toThrow("offline");
  expect(cache.peek("orders")).toBe("new");
  await cache.load("orders", async () => "recovered"); expect(cache.peek("orders")).toBe("recovered");
});

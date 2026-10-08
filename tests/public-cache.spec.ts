import { expect, test } from "@playwright/test";
import { publicCache, publicCacheTagsForMutation } from "../lib/public-cache-policy";

test("Successful product/category/stock commands immediately expire the public catalog", () => {
  for (const path of [["admin", "commands"], ["admin", "categories", "khoa"], ["admin", "products", "sku"], ["admin", "ledger", "adjust"], ["admin", "integrations", "kiotviet", "apply-prices"], ["orders"]])
    for (const method of ["POST", "PATCH", "PUT", "DELETE"])
      expect(publicCacheTagsForMutation(method, path, 201)).toEqual([publicCache.catalog.tag]);
});

test("CMS mutations expire content independently", () => {
  expect(publicCacheTagsForMutation("POST", ["admin", "content", "initialize"], 201)).toEqual([publicCache.content.tag]);
  expect(publicCacheTagsForMutation("PATCH", ["admin", "content", "entry"], 200)).toEqual([publicCache.content.tag]);
});

test("Reads, errors, quotes and account actions cannot invalidate shared public data", () => {
  for (const status of [400, 401, 403, 409, 500, 502]) expect(publicCacheTagsForMutation("POST", ["admin", "commands"], status)).toEqual([]);
  for (const method of ["GET", "HEAD", "OPTIONS"]) expect(publicCacheTagsForMutation(method, ["admin", "commands"], 200)).toEqual([]);
  for (const path of [["auth", "login"], ["auth", "logout"], ["account", "profile"], ["account", "preferences"], ["orders", "quote"], ["admin", "orders", "quote"], ["admin", "notifications", "read"]])
    expect(publicCacheTagsForMutation("POST", path, 200)).toEqual([]);
  expect(publicCache.catalog.seconds).toBeLessThanOrEqual(15);
});

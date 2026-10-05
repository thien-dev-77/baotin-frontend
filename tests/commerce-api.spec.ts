import { expect, test } from "@playwright/test";
import { api } from "../lib/api-client";
import { readApiSession, readCatalogResponse, retailProducts } from "../lib/commerce-api";
import { catalog, categoryCatalog } from "../lib/catalog";

const originalFetch = globalThis.fetch;
test.afterEach(() => { globalThis.fetch = originalFetch; });

test("A guest session is valid, but null/malformed session responses are rejected", () => {
  expect(readApiSession({ user: null })).toEqual({ user: null });
  for (const response of [null, undefined, {}, { user: undefined }, { user: "guest" }, { user: {} }]) {
    expect(() => readApiSession(response)).toThrow(/phiên đăng nhập/);
  }
  const user = { id: "staff-1", name: "Sales", email: "sales@example.test", role: "sales", branches: ["Quy Nhơn"], customer: null };
  expect(readApiSession({ user }).user).toEqual(user);
});

test("Catalog responses require product/category arrays and preserve empty catalogs", () => {
  expect(readCatalogResponse({ products: catalog, categories: categoryCatalog }).products).toHaveLength(63);
  expect(readCatalogResponse({ products: [], categories: [] })).toEqual({ products: [], categories: [] });
  for (const response of [null, {}, { products: null, categories: [] }, { products: [null], categories: [] }, { products: [], categories: [null] }]) {
    expect(() => readCatalogResponse(response)).toThrow(/danh sách sản phẩm/);
  }
});

test("Public catalog data removes personalized prices without mutating products", () => {
  const personalized = { ...catalog[0], customerPrice: 12345 };
  const [retail] = retailProducts([personalized]);
  expect(retail).toEqual(catalog[0]);
  expect("customerPrice" in retail).toBe(false);
  expect(personalized.customerPrice).toBe(12345);
});

test("HTTP 200 with null, empty or HTML bodies raises an actionable API error", async () => {
  for (const body of ["null", "", "<html>Upstream unavailable</html>"]) {
    globalThis.fetch = async () => new Response(body, { status: 200 });
    await expect(api("/auth/session")).rejects.toThrow(/Phản hồi API không hợp lệ/);
  }
});

test("API accepts guest JSON and array responses, and preserves backend errors", async () => {
  globalThis.fetch = async () => Response.json({ user: null });
  expect(readApiSession(await api("/auth/session"))).toEqual({ user: null });
  globalThis.fetch = async () => Response.json([]);
  await expect(api("/orders")).resolves.toEqual([]);
  globalThis.fetch = async () => Response.json({ message: "Session expired" }, { status: 401 });
  await expect(api("/auth/session")).rejects.toThrow("Session expired");
});

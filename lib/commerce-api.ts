import type { ApiSession, CatalogPageResponse, CatalogResponse } from "@/lib/api-types";
import type { Product } from "@/lib/types";

const isObject = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);

export function readApiSession(value: unknown): ApiSession {
  if (!isObject(value) || !("user" in value)) throw new Error("Phản hồi phiên đăng nhập không hợp lệ. Vui lòng thử lại.");
  if (value.user === null) return { user: null };
  const user = value.user;
  if (!isObject(user) || typeof user.id !== "string" || typeof user.name !== "string" || typeof user.email !== "string" || !["admin", "boss", "sales", "warehouse", "accountant", "b2b"].includes(String(user.role)) || !Array.isArray(user.branches) || (user.customer !== null && !isObject(user.customer))) {
    throw new Error("Phản hồi phiên đăng nhập không hợp lệ. Vui lòng thử lại.");
  }
  return value as ApiSession;
}

export function readCatalogResponse(value: unknown): CatalogResponse {
  if (!isObject(value) || !Array.isArray(value.products) || !Array.isArray(value.categories) || (value.brands !== undefined && (!Array.isArray(value.brands) || value.brands.some(brand => typeof brand !== "string"))) || value.products.some((product) => !isObject(product) || typeof product.id !== "string" || typeof product.slug !== "string") || value.categories.some((category) => !isObject(category) || typeof category.slug !== "string" || !Array.isArray(category.subcategories))) {
    throw new Error("Phản hồi danh sách sản phẩm không hợp lệ. Vui lòng thử lại.");
  }
  return value as CatalogResponse;
}

export function retailProducts(products: Product[]): Product[] {
  return products.map(({ customerPrice, ...retail }) => retail);
}

export function readCatalogPage(value: unknown): CatalogPageResponse {
  readCatalogResponse(value);
  if (!isObject(value) || !Number.isSafeInteger(value.total) || Number(value.total) < 0 ||
    !Number.isSafeInteger(value.page) || Number(value.page) < 1 || !Number.isSafeInteger(value.pageSize) || Number(value.pageSize) < 1 ||
    !Number.isSafeInteger(value.totalPages) || Number(value.totalPages) < 1 || !isObject(value.facets) ||
    ["brand", "material", "color", "size", "origin"].some(field => {
      const items = (value.facets as Record<string, unknown>)[field];
      return !Array.isArray(items) || items.some(item => typeof item !== "string");
    })) {
    throw new Error("Phản hồi trang sản phẩm không hợp lệ. Vui lòng thử lại.");
  }
  return value as CatalogPageResponse;
}

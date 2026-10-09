import "server-only";
import { apiMode } from "@/lib/api-client";
import type { Product } from "@/lib/catalog";
import { catalog, categoryCatalog, findProduct } from "@/lib/catalog";
import type { CatalogPageResponse, CatalogResponse } from "@/lib/api-types";
import { readCatalogPage, readCatalogResponse, retailProducts } from "@/lib/commerce-api";
import { previewCatalogPage } from "./catalog-query";
import type { PublicContent } from "./content-types";
import type { Category } from "./types";
import { publicCache } from "./public-cache-policy";
import { unstable_cache } from "next/cache";
import { cache } from "react";

function backendURL() {
  return (process.env.BACKEND_URL || "http://127.0.0.1:4000").replace(/\/+$/, "");
}

function publicFetchOptions(): RequestInit {
  return { cache: "no-store", credentials: "omit", headers: { Accept: "application/json" }, signal: AbortSignal.timeout(8000) };
}

const cachedCategory = unstable_cache(async (backend: string, slug: string): Promise<Category | null> => {
  const response = await fetch(`${backend}/api/categories/${encodeURIComponent(slug)}`, publicFetchOptions());
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Không thể tải danh mục. Vui lòng thử lại.");
  const category = await response.json();
  if (!category || category.slug !== slug || typeof category.name !== "string" || !Array.isArray(category.subcategories)) throw new Error("Phản hồi danh mục không hợp lệ.");
  return category;
}, ["public-category-v1"], { revalidate: publicCache.catalog.seconds, tags: [publicCache.catalog.tag] });

const cachedContent = unstable_cache(async (backend: string): Promise<PublicContent[]> => {
  const response = await fetch(`${backend}/api/content`, publicFetchOptions());
  if (!response.ok) throw new Error("Không thể tải nội dung website.");
  const data = await response.json();
  if (!Array.isArray(data?.items)) throw new Error("Nội dung website không hợp lệ.");
  return data.items;
}, ["public-content-v1"], { revalidate: publicCache.content.seconds, tags: [publicCache.content.tag] });

// Cache validated retail DTOs only, never an upstream HTML/null response or cookies.
const cachedCatalog = unstable_cache(async (backend: string): Promise<CatalogResponse> => {
  const response = await fetch(`${backend}/api/catalog/bootstrap`, publicFetchOptions());
  if (!response.ok) throw new Error("Không thể tải danh sách sản phẩm. Vui lòng thử lại.");
  const result = readCatalogResponse(await response.json());
  return { ...result, products: retailProducts(result.products) };
}, ["public-catalog-bootstrap-v2"], { revalidate: publicCache.catalog.seconds, tags: [publicCache.catalog.tag] });

const cachedSearch = unstable_cache(async (backend: string, query: string): Promise<CatalogPageResponse> => {
  const response = await fetch(`${backend}/api/catalog/search?${query}`, publicFetchOptions());
  if (!response.ok) throw new Error("Không thể tải danh sách sản phẩm. Vui lòng thử lại.");
  const result = readCatalogPage(await response.json());
  return { ...result, products: retailProducts(result.products) };
}, ["public-catalog-search-v1"], { revalidate: publicCache.catalog.seconds, tags: [publicCache.catalog.tag] });

export async function serverCatalogPage(params: URLSearchParams): Promise<CatalogPageResponse> {
  return apiMode ? cachedSearch(backendURL(), params.toString()) : previewCatalogPage(catalog, categoryCatalog, params);
}

export async function serverCategory(slug: string): Promise<Category | undefined> {
  if (!apiMode) return categoryCatalog.find(category => category.slug === slug);
  return await cachedCategory(backendURL(), slug) || undefined;
}

export async function serverContent(): Promise<PublicContent[] | null> {
  return apiMode ? cachedContent(backendURL()) : null;
}

export const serverCatalog = cache(async (): Promise<CatalogResponse> => {
  return apiMode ? cachedCatalog(backendURL()) : { products: catalog, categories: categoryCatalog };
});

export async function serverProduct(slug: string): Promise<Product | undefined> {
  if (!apiMode) return findProduct(slug);
  const response = await fetch(`${backendURL()}/api/catalog/product/${encodeURIComponent(slug)}`, publicFetchOptions());
  if (response.status === 404) return undefined;
  if (!response.ok) throw new Error("Không thể tải sản phẩm.");
  return response.json();
}

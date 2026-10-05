import "server-only";
import { apiMode } from "@/lib/api-client";
import type { Product } from "@/lib/catalog";
import { catalog, categoryCatalog, findProduct } from "@/lib/catalog";
import type { CatalogResponse } from "@/lib/api-types";
import { readCatalogResponse, retailProducts } from "@/lib/commerce-api";

export async function serverCatalog(): Promise<CatalogResponse> {
  if (!apiMode) return { products: catalog, categories: categoryCatalog };
  const backend = (process.env.BACKEND_URL || "http://127.0.0.1:4000").replace(/\/+$/, "");
  // Only public catalog data crosses into the initial HTML; never forward cookies.
  const response = await fetch(`${backend}/api/catalog`, { cache: "no-store", credentials: "omit", signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error("Không thể tải danh sách sản phẩm. Vui lòng thử lại.");
  const result = readCatalogResponse(await response.json());
  return { ...result, products: retailProducts(result.products) };
}

export async function serverProduct(slug: string): Promise<Product | undefined> {
  if (!apiMode) return findProduct(slug);
  const response = await fetch(`${process.env.BACKEND_URL || "http://127.0.0.1:4000"}/api/catalog/${encodeURIComponent(slug)}`, { cache: "no-store" });
  if (response.status === 404) return undefined;
  if (!response.ok) throw new Error("Không thể tải sản phẩm.");
  return response.json();
}

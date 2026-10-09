import { getCatalogBrands, normalize, priceFor } from "./catalog";
import type { CatalogPageResponse } from "./api-types";
import type { Category, Customer, Product } from "./types";

export type ListingScope = { category?: string; brand?: string; query?: string; promotion?: boolean };
export type ListingSearchParams = Record<string, string | string[] | undefined>;
export const catalogFilterFields = ["category", "brand", "material", "color", "size", "origin", "stock"] as const;
const scalarFields = ["q", "subcategory", "min", "max", "sort", "page"] as const;

export function listingParams(raw: ListingSearchParams, scope: ListingScope = {}) {
  const params = new URLSearchParams();
  for (const field of catalogFilterFields) {
    const value = raw[field];
    for (const item of Array.isArray(value) ? value : value ? [value] : []) params.append(field, item);
  }
  for (const field of scalarFields) if (typeof raw[field] === "string" && raw[field]) params.set(field, raw[field]);
  if (scope.category) { params.delete("category"); params.set("category", scope.category); }
  if (scope.brand) { params.delete("brand"); params.set("brand", scope.brand); }
  if (scope.query !== undefined) params.set("q", scope.query);
  if (scope.promotion) params.set("promotion", "true");
  return params;
}

export function previewCatalogPage(products: Product[], categories: Category[], params: URLSearchParams, customer: Customer | null = null): CatalogPageResponse {
  const terms = normalize(params.get("q") || "").trim().split(/\s+/).filter(Boolean);
  const filtered = products.filter(product => terms.every(term => normalize(`${product.name} ${product.code} ${product.brand} ${product.specification}`).includes(term)) &&
    catalogFilterFields.every(field => {
      const values = params.getAll(field);
      return !values.length || values.includes(field === "stock" ? product.stock > 0 ? "in" : "out" : product[field]);
    }) && (!params.get("subcategory") || product.subcategory === params.get("subcategory")) &&
    (!params.has("min") || priceFor(product, customer) >= Number(params.get("min"))) &&
    (!params.has("max") || priceFor(product, customer) <= Number(params.get("max"))) &&
    (!params.has("promotion") || !!product.oldPrice && product.oldPrice > product.price),
  ).sort((a, b) => params.get("sort") === "low" ? priceFor(a, customer) - priceFor(b, customer) :
    params.get("sort") === "high" ? priceFor(b, customer) - priceFor(a, customer) : Number(b.featured) - Number(a.featured));
  const pageSize = Math.max(1, Math.min(60, Number(params.get("pageSize")) || 12));
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page = Math.min(Math.max(1, Number(params.get("page")) || 1), totalPages);
  const facets = Object.fromEntries((["brand", "material", "color", "size", "origin"] as const).map(field => [field, Array.from(new Set(products.map(product => product[field]).filter(Boolean))).sort()])) as CatalogPageResponse["facets"];
  return { products: filtered.slice((page - 1) * pageSize, page * pageSize), categories, brands: getCatalogBrands(products), total: filtered.length, page, pageSize, totalPages, facets };
}

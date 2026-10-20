import type { AdminBrowseResource } from "./api-types";
import type { Branch } from "./types";

export const ADMIN_PAGE_SIZES = [10, 25, 50] as const;
export const ADMIN_BROWSE_FILTERS = ["status", "category", "subcategory", "brand", "group", "sales", "pilot", "from", "to"] as const;

export function adminBrowsePath(resource: AdminBrowseResource, branch: Branch, search: Pick<URLSearchParams, "get"> = new URLSearchParams()) {
  const params = new URLSearchParams({ branch, resource,
    page: String(Math.max(1, Number.parseInt(search.get("page") || "1", 10) || 1)),
    pageSize: String(ADMIN_PAGE_SIZES.find(size => size === Number(search.get("pageSize"))) || 10) });
  if (resource === "products") params.set("metadata", "false");
  const query = search.get("q");
  if (query) params.set("q", query);
  for (const field of ADMIN_BROWSE_FILTERS) if (search.get(field)) params.set(field, search.get(field)!);
  return `/admin/browse?${params}`;
}

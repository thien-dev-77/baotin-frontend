"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiMode } from "./api-client";
import { useAdmin } from "@/components/admin/admin-provider";
import { useAdminResource } from "@/components/admin/admin-resource";
import type { AdminBrowsePage, AdminBrowseResource } from "./api-types";
import { ADMIN_PAGE_SIZES, adminBrowsePath } from "./admin-browse-query";

export { ADMIN_PAGE_SIZES } from "./admin-browse-query";
const SEARCH_DELAY_MS = 300;

export function readAdminBrowse(value: unknown): AdminBrowsePage {
  if (!value || typeof value !== "object" || !("pagination" in value)) throw new Error("Danh sách quản trị không hợp lệ.");
  const data = value as AdminBrowsePage;
  const page = data.pagination;
  const resource = page?.resource === "warehouse" ? "orders" : page?.resource;
  if (!page || !["products", "orders", "customers", "approvals", "receipts"].includes(resource) || !Number.isSafeInteger(page.total) || page.total < 0 || !Number.isSafeInteger(page.page) || page.page < 1 || !ADMIN_PAGE_SIZES.includes(page.pageSize as 10 | 25 | 50) || page.totalPages !== Math.max(1, Math.ceil(page.total / page.pageSize)) || !Array.isArray(page.ids) || !Array.isArray(data[resource]) || page.ids.length > page.pageSize) throw new Error("Danh sách quản trị không hợp lệ.");
  return data;
}
export function updateAdminQuery(values: Record<string, string | number | undefined>, push = false) {
  const url = new URL(window.location.href);
  for (const [name, value] of Object.entries(values)) {
    if (value === undefined || value === "" || value === "all" || (name === "page" && value === 1)) url.searchParams.delete(name);
    else url.searchParams.set(name, String(value));
  }
  if (push) window.history.pushState(null, "", url);
  else window.history.replaceState(null, "", url);
}
export function useAdminBrowse(resource: AdminBrowseResource) {
  const { branch } = useAdmin();
  const search = useSearchParams();
  const [query, setQuery] = useState(search.get("q") || "");
  const currentQuery = search.get("q") || "";
  useEffect(() => { setQuery(currentQuery); }, [currentQuery]);
  useEffect(() => {
    if (query === currentQuery) return;
    const timer = setTimeout(() => updateAdminQuery({ q: query.trim(), page: 1 }), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [query, currentQuery]);
  const path = adminBrowsePath(resource, branch, search);
  const params = new URLSearchParams(path.split("?")[1]);
  const response = useAdminResource<AdminBrowsePage>(path, apiMode, readAdminBrowse, `${branch}:${resource}`);
  const set = (values: Record<string, string | number | undefined>) => updateAdminQuery({ q: query.trim(), ...values, page: 1 });
  return {
    ...response, query, setQuery, page: Number(params.get("page")), pageSize: Number(params.get("pageSize")),
    filter: search.get("status") || "all", category: search.get("category") || "all",
    subcategory: search.get("subcategory") || "all",
    group: search.get("group") || "", sales: search.get("sales") || "", pilot: search.get("pilot") || "", from: search.get("from") || "", to: search.get("to") || "",
    setPage: (page: number) => updateAdminQuery({ page }, true),
    setFilter: (status: string) => set({ status }),
    set,
  };
}
export type AdminBrowseState = ReturnType<typeof useAdminBrowse>;

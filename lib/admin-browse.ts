"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiMode } from "./api-client";
import { useAdmin } from "@/components/admin/admin-provider";
import { useAdminResource } from "@/components/admin/admin-resource";
import type { AdminBrowsePage, AdminBrowseResource } from "./api-types";

export const ADMIN_PAGE_SIZES = [10, 25, 50] as const;
const SEARCH_DELAY_MS = 300;
const fields = ["status", "category", "group", "sales", "pilot", "from", "to"] as const;

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
  const params = new URLSearchParams({ branch, resource, page: String(Math.max(1, Number.parseInt(search.get("page") || "1", 10) || 1)), pageSize: String(ADMIN_PAGE_SIZES.find(size => size === Number(search.get("pageSize"))) || 10) });
  if (currentQuery) params.set("q", currentQuery);
  for (const field of fields) if (search.get(field)) params.set(field, search.get(field)!);
  const response = useAdminResource<AdminBrowsePage>(`/admin/browse?${params}`, apiMode, readAdminBrowse, `${branch}:${resource}`);
  return {
    ...response, query, setQuery, page: Number(params.get("page")), pageSize: Number(params.get("pageSize")),
    filter: search.get("status") || "all", category: search.get("category") || "all",
    group: search.get("group") || "", sales: search.get("sales") || "", pilot: search.get("pilot") || "", from: search.get("from") || "", to: search.get("to") || "",
    setPage: (page: number) => updateAdminQuery({ page }, true),
    setFilter: (status: string) => updateAdminQuery({ status, page: 1 }),
    set: (values: Record<string, string | number | undefined>) => updateAdminQuery({ ...values, page: 1 }),
  };
}
export type AdminBrowseState = ReturnType<typeof useAdminBrowse>;

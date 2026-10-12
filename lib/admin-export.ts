"use client";

import { useEffect, useRef, useState } from "react";
import { useAdmin } from "@/components/admin/admin-provider";
import { useCommerce } from "@/components/commerce-provider";
import { api } from "./api-client";
import { readAdminBrowse } from "./admin-browse";
import type { AdminBrowsePage, AdminBrowseResource } from "./api-types";

export function useAdminExport(resource: AdminBrowseResource) {
  const { branch } = useAdmin();
  const { notice } = useCommerce();
  const [loading, setLoading] = useState(false);
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => { active.current?.abort(); active.current = null; }, [branch, resource]);
  const run = async (consume: (pages: AdminBrowsePage[]) => void) => {
    if (active.current) return;
    const controller = new AbortController();
    active.current = controller; setLoading(true);
    const params = new URLSearchParams(location.search);
    params.delete("returnTo"); params.delete("order");
    const allowed = ["q", "status", "category", "group", "sales", "pilot", "from", "to"];
    for (const key of Array.from(params.keys())) if (!allowed.includes(key)) params.delete(key);
    params.set("resource", resource); params.set("branch", branch); params.set("pageSize", "50");
    try {
      const pages: AdminBrowsePage[] = [];
      const ids = new Set<string>();
      let totalPages = 1;
      let total = 0;
      for (let page = 1; page <= totalPages; page++) {
        params.set("page", String(page));
        const result = readAdminBrowse(await api<unknown>(`/admin/browse?${params}`, { signal: controller.signal }));
        if (page === 1) { totalPages = result.pagination.totalPages; total = result.pagination.total; }
        if (result.pagination.total !== total || result.pagination.page !== page || result.pagination.ids.some(id => ids.has(id))) throw new Error("Danh sách đã thay đổi trong lúc xuất. Vui lòng thử lại.");
        result.pagination.ids.forEach(id => ids.add(id)); pages.push(result);
      }
      if (ids.size !== total) throw new Error("Danh sách đã thay đổi trong lúc xuất. Vui lòng thử lại.");
      if (!controller.signal.aborted) consume(pages);
    } catch (cause) { if (!controller.signal.aborted) notice(cause instanceof Error ? cause.message : "Không thể xuất danh sách."); }
    finally { if (active.current === controller) { active.current = null; setLoading(false); } }
  };
  return { loading, run };
}

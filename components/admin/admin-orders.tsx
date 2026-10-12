"use client";

import { useState } from "react";
import Link from "next/link";
import { Download, Plus } from "lucide-react";
import { Button } from "@/components/ui";
import { useAdmin } from "@/components/admin/admin-provider";
import { AdminHeading, AdminPagination, AdminSearch, useAdminFilters } from "@/components/admin/admin-ui";
import { AdminOrderTable } from "@/components/admin/admin-order-table";
import { AdminOrderDialog } from "@/components/admin/admin-order-dialog";
import { downloadAdminCsv, orderStages } from "@/lib/admin-preview";
import { normalize } from "@/lib/catalog";
import { apiMode } from "@/lib/api-client";
import { useAdminBrowse, type AdminBrowseState } from "@/lib/admin-browse";
import { AdminReadModel } from "./admin-read-model";
import { ResourceStatus } from "./admin-resource";
import { useAdminExport } from "@/lib/admin-export";

export function AdminOrders({ initialStatus = "all", initialOrder = "" }: { initialStatus?: string; initialOrder?: string }) {
  const browse = useAdminBrowse("orders");
  return <AdminReadModel data={browse.data}><OrderList browse={browse} initialStatus={initialStatus} initialOrder={initialOrder} /></AdminReadModel>;
}
function OrderList({ browse, initialStatus, initialOrder }: { browse: AdminBrowseState; initialStatus: string; initialOrder: string }) {
  const exporting = useAdminExport("orders");
  const { scopedOrders, branch } = useAdmin();
  const previewFilters = useAdminFilters(orderStages.some((status) => status === initialStatus) ? initialStatus : "all");
  const filters = apiMode ? browse : previewFilters;
  const [selected, setSelected] = useState<string | null>(initialOrder || null);
  const orders = apiMode ? scopedOrders : scopedOrders.filter((order) => (filters.filter === "all" || order.status === filters.filter) && normalize(`${order.id} ${order.customerName}`).includes(normalize(filters.query)));
  const count = apiMode ? browse.data?.pagination.total || 0 : orders.length;
  const page = apiMode ? browse.data?.pagination.page || browse.page : Math.min(filters.page, Math.max(1, Math.ceil(orders.length / 10)));
  function exportOrders(items = orders) {
    downloadAdminCsv("bao-tin-don-hang-mau.csv", [["Mã đơn", "Khách hàng", "Chi nhánh", "Ngày", "Kênh", "Giá trị", "Trạng thái"], ...items.map((item) => [item.id, item.customerName, item.branch, item.date, item.channel, item.total, item.status])]);
  }
  return <>
    <AdminHeading title="Đơn hàng" subtitle={`${branch} · ${count} đơn${apiMode && !browse.from && !browse.to ? " · Tất cả thời gian" : ""}`}><div className="flex flex-wrap gap-2"><Button variant="secondary" loading={exporting.loading} onClick={() => apiMode ? void exporting.run(pages => exportOrders(pages.flatMap(page => page.orders || []))) : exportOrders()} disabled={!orders.length}><Download size={16} />Xuất CSV</Button><Link href="/admin/orders/new" className="bt-button-primary"><Plus size={16} />Tạo đơn hộ khách</Link></div></AdminHeading>
    <div className="mb-4 flex flex-wrap items-center gap-3"><AdminSearch value={filters.query} onChange={filters.setQuery} placeholder="Tìm mã đơn, khách hàng..." /><select aria-label="Trạng thái đơn hàng" value={filters.filter} onChange={(event) => filters.setFilter(event.target.value)} className="bt-input !w-auto"><option value="all">Tất cả trạng thái</option>{orderStages.map((item) => <option key={item}>{item}</option>)}</select></div>
    {apiMode && <div className="mb-4 flex flex-wrap items-end gap-3"><label className="text-xs text-text-secondary">Từ ngày<input aria-label="Đơn hàng từ ngày" type="date" value={browse.from} max={browse.to || undefined} onChange={event => browse.set({ from: event.target.value })} className="bt-input mt-1" /></label><label className="text-xs text-text-secondary">Đến ngày<input aria-label="Đơn hàng đến ngày" type="date" value={browse.to} min={browse.from || undefined} onChange={event => browse.set({ to: event.target.value })} className="bt-input mt-1" /></label><Button variant="ghost" onClick={() => browse.set({ from: "", to: "" })}>Tất cả thời gian</Button></div>}
    {apiMode && <ResourceStatus {...browse} />}
    <AdminOrderTable orders={apiMode ? orders : orders.slice((page - 1) * 10, page * 10)} onSelect={setSelected} />
    <AdminPagination count={count} page={page} pageSize={apiMode ? browse.pageSize : 10} onChange={filters.setPage} onPageSize={apiMode ? size => browse.set({ pageSize: size }) : undefined} />
    <AdminOrderDialog id={selected} onClose={() => setSelected(null)} />
  </>;
}

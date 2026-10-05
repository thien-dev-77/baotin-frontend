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

export function AdminOrders({ initialStatus = "all", initialOrder = "" }: { initialStatus?: string; initialOrder?: string }) {
  const { scopedOrders, branch } = useAdmin();
  const filters = useAdminFilters(orderStages.some((status) => status === initialStatus) ? initialStatus : "all");
  const [selected, setSelected] = useState<string | null>(initialOrder || null);
  const orders = scopedOrders.filter((order) => (filters.filter === "all" || order.status === filters.filter) && normalize(`${order.id} ${order.customerName}`).includes(normalize(filters.query)));
  const page = Math.min(filters.page, Math.max(1, Math.ceil(orders.length / 10)));
  function exportOrders() {
    downloadAdminCsv("bao-tin-don-hang-mau.csv", [["Mã đơn", "Khách hàng", "Chi nhánh", "Ngày", "Kênh", "Giá trị", "Trạng thái"], ...orders.map((item) => [item.id, item.customerName, item.branch, item.date, item.channel, item.total, item.status])]);
  }
  return <>
    <AdminHeading title="Đơn hàng" subtitle={`${branch} · ${orders.length} đơn trong kỳ báo cáo`}><div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={exportOrders} disabled={!orders.length}><Download size={16} />Xuất CSV</Button><Link href="/admin/orders/new" className="bt-button-primary"><Plus size={16} />Tạo đơn hộ khách</Link></div></AdminHeading>
    <div className="mb-4 flex flex-wrap items-center gap-3"><AdminSearch value={filters.query} onChange={filters.setQuery} placeholder="Tìm mã đơn, khách hàng..." /><select aria-label="Trạng thái đơn hàng" value={filters.filter} onChange={(event) => filters.setFilter(event.target.value)} className="bt-input !w-auto"><option value="all">Tất cả trạng thái</option>{orderStages.map((item) => <option key={item}>{item}</option>)}</select></div>
    <AdminOrderTable orders={orders.slice((page - 1) * 10, page * 10)} onSelect={setSelected} />
    <AdminPagination count={orders.length} page={page} onChange={filters.setPage} />
    <AdminOrderDialog id={selected} onClose={() => setSelected(null)} />
  </>;
}

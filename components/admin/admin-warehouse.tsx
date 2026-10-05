"use client";

import { useState } from "react";
import { Download, Eye, PackageCheck } from "lucide-react";
import { Button } from "@/components/ui";
import { useAdmin } from "@/components/admin/admin-provider";
import { AdminHeading, AdminPagination, AdminSearch, AdminStatus, AdminTable, useAdminFilters } from "@/components/admin/admin-ui";
import { AdminOrderDialog } from "@/components/admin/admin-order-dialog";
import { adminDate, downloadAdminCsv } from "@/lib/admin-preview";
import { hasShortage, isPicked, warehouseStages } from "@/lib/admin-warehouse";
import { normalize } from "@/lib/catalog";

export function AdminWarehouse({ initialStatus = "all", initialOrder = "" }: { initialStatus?: string; initialOrder?: string }) {
  const { warehouseOrders, warehouse, branch } = useAdmin();
  const filters = useAdminFilters([...warehouseStages, "issues"].some((value) => value === initialStatus) ? initialStatus : "all");
  const [selected, setSelected] = useState<string | null>(initialOrder || null);
  const rows = warehouseOrders.filter((order) => (filters.filter === "all" || (filters.filter === "issues" ? hasShortage(warehouse[order.id]) : order.status === filters.filter)) && normalize(`${order.id} ${order.customerName} ${order.items.map((item) => item.productId).join(" ")}`).includes(normalize(filters.query)));
  const page = Math.min(filters.page, Math.max(1, Math.ceil(rows.length / 10)));
  const modes = [{ value: "all", label: "Tất cả" }, ...warehouseStages.map((status) => ({ value: status, label: status })), { value: "issues", label: "Có báo thiếu" }];
  function exportRows() {
    downloadAdminCsv("bao-tin-hang-doi-kho-mau.csv", [["Mã đơn", "Khách hàng", "Chi nhánh", "Ngày đặt", "Số mã hàng", "Tổng số lượng", "Trạng thái", "Báo thiếu"], ...rows.map((item) => [item.id, item.customerName, item.branch, item.date, item.items.length, item.items.reduce((sum, line) => sum + line.quantity, 0), item.status, hasShortage(warehouse[item.id]) ? "Chưa xử lý" : "Không"])]);
  }
  return <>
    <AdminHeading title="Soạn hàng & giao hàng" subtitle={`${branch} · ${warehouseOrders.length} đơn đã xác nhận, chưa bàn giao`}><Button variant="secondary" onClick={exportRows} disabled={!rows.length}><Download size={16} />Xuất CSV</Button></AdminHeading>
    <dl className="mb-5 grid grid-cols-2 gap-4 border-y border-border bg-white px-4 py-4 sm:grid-cols-4">{[...warehouseStages, "Có báo thiếu"].map((label) => <div key={label}><dt className="text-xs text-text-muted">{label}</dt><dd className={`mt-2 text-2xl font-bold tabular-nums ${label === "Có báo thiếu" ? "text-danger" : "text-primary"}`}>{warehouseOrders.filter((order) => label === "Có báo thiếu" ? hasShortage(warehouse[order.id]) : order.status === label).length}</dd></div>)}</dl>
    <div className="mb-4 flex flex-wrap items-center gap-3"><AdminSearch value={filters.query} onChange={filters.setQuery} placeholder="Tìm mã đơn, khách hàng, mã hàng..." /></div>
    <div role="group" aria-label="Trạng thái soạn hàng" className="mb-4 flex flex-wrap gap-1">{modes.map((mode) => <button type="button" key={mode.value} aria-pressed={filters.filter === mode.value} onClick={() => filters.setFilter(mode.value)} className={`min-h-10 rounded px-3 py-2 text-xs font-medium ${filters.filter === mode.value ? "bg-primary text-white" : "text-text-secondary hover:bg-white"}`}>{mode.label}</button>)}</div>
    <AdminTable headings={["Mã đơn / ngày", "Khách hàng", "Đã kiểm", "Trạng thái", "Báo thiếu", "Thao tác"]} empty={!rows.length}>
      {rows.slice((page - 1) * 10, page * 10).map((order) => {
        const picked = order.items.filter((item) => isPicked(order, warehouse[order.id], item.productId)).length;
        return <tr key={order.id}>
          <td><button type="button" onClick={() => setSelected(order.id)} className="font-semibold text-blue-brand hover:underline">{order.id}</button><span className="mt-1 block text-xs text-text-muted">{adminDate(order.date)}</span></td>
          <td><span className="font-medium text-primary">{order.customerName}</span><span className="mt-1 block text-xs text-text-muted">{order.items.length} mã · {order.items.reduce((sum, item) => sum + item.quantity, 0)} sản phẩm</span></td>
          <td><span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs tabular-nums"><PackageCheck size={16} className={picked === order.items.length ? "text-emerald-600" : "text-text-muted"} />{picked}/{order.items.length} mã</span></td>
          <td><AdminStatus value={order.status} /></td>
          <td>{hasShortage(warehouse[order.id]) ? <AdminStatus value="Thiếu hàng" /> : <span className="text-xs text-text-muted">Không</span>}</td>
          <td><button type="button" onClick={() => setSelected(order.id)} title="Chi tiết soạn hàng" aria-label={`Soạn đơn ${order.id}`} className="bt-icon-button"><Eye size={17} /></button></td>
        </tr>;
      })}
    </AdminTable>
    <AdminPagination count={rows.length} page={page} onChange={filters.setPage} />
    <AdminOrderDialog id={selected} onClose={() => setSelected(null)} warehouseMode />
  </>;
}

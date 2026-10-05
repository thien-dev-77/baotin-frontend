"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Check, Download, Eye, Pause } from "lucide-react";
import { Button, Modal } from "@/components/ui";
import { useAdmin } from "@/components/admin/admin-provider";
import { AdminHeading, AdminPagination, AdminSearch, AdminStatus, AdminTable, useAdminFilters } from "@/components/admin/admin-ui";
import { downloadAdminCsv } from "@/lib/admin-preview";
import { money, normalize } from "@/lib/catalog";

export function AdminCustomers({ credit = false, initialStatus = "all" }: { credit?: boolean; initialStatus?: string }) {
  const { scopedCustomers, customers, orders, branch, setCustomerStatus } = useAdmin();
  const filters = useAdminFilters(initialStatus);
  const [selected, setSelected] = useState<string | null>(null);
  const customer = customers.find((item) => item.id === selected);
  const rows = scopedCustomers.filter((item) => normalize(`${item.id} ${item.name} ${item.contact} ${item.phone}`).includes(normalize(filters.query)) && (filters.filter === "all" || (credit ? filters.filter === "overdue" ? item.overdue > 0 : item.debt > item.limit : item.status === filters.filter)));
  const page = Math.min(filters.page, Math.max(1, Math.ceil(rows.length / 10)));
  const debt = scopedCustomers.reduce((sum, item) => sum + item.debt, 0);
  const overdue = scopedCustomers.reduce((sum, item) => sum + item.overdue, 0);
  function exportRows() {
    downloadAdminCsv(credit ? "bao-tin-cong-no-mau.csv" : "bao-tin-khach-b2b-mau.csv", [["Mã khách", "Tên khách", "Chi nhánh", "Liên hệ", "Điện thoại", "Trạng thái", "Hạn mức", "Công nợ", "Quá hạn"], ...rows.map((item) => [item.id, item.name, item.branch, item.contact, item.phone, item.status, item.limit, item.debt, item.overdue])]);
  }
  return <>
    <AdminHeading title={credit ? "Công nợ B2B" : "Khách hàng B2B"} subtitle={`${branch} · ${scopedCustomers.length} khách hàng`}><Button variant="secondary" onClick={exportRows} disabled={!rows.length}><Download size={16} />Xuất CSV</Button></AdminHeading>
    {credit && <dl className="mb-6 grid gap-4 border-y border-border bg-white px-4 py-5 sm:grid-cols-3"><div><dt className="text-xs text-text-muted">Tổng công nợ</dt><dd className="mt-2 text-xl font-bold tabular-nums text-primary">{money(debt)}</dd></div><div><dt className="text-xs text-text-muted">Khoản quá hạn</dt><dd className="mt-2 text-xl font-bold tabular-nums text-danger">{money(overdue)}</dd></div><div><dt className="text-xs text-text-muted">Khách vượt hạn mức</dt><dd className="mt-2 text-xl font-bold text-primary">{scopedCustomers.filter((item) => item.debt > item.limit).length}</dd></div></dl>}
    <div className="mb-4 flex flex-wrap items-center gap-3"><AdminSearch value={filters.query} onChange={filters.setQuery} placeholder="Tìm mã khách, tên, số điện thoại..." /><select aria-label={credit ? "Tình trạng công nợ" : "Trạng thái khách hàng"} value={filters.filter} onChange={(event) => filters.setFilter(event.target.value)} className="bt-input !w-auto"><option value="all">Tất cả {credit ? "công nợ" : "trạng thái"}</option>{credit ? <><option value="overdue">Có nợ quá hạn</option><option value="overlimit">Vượt hạn mức</option></> : ["Chờ duyệt", "Đang hoạt động", "Tạm ngưng"].map((status) => <option key={status}>{status}</option>)}</select></div>
    <AdminTable headings={credit ? ["Khách hàng", "Hạn mức", "Công nợ", "Quá hạn", "Tình trạng", "Thao tác"] : ["Khách hàng", "Người liên hệ", "Nhóm khách", "Trạng thái", "Thao tác"]} empty={!rows.length}>
      {rows.slice((page - 1) * 10, page * 10).map((item) => <tr key={item.id}>
        <td><button type="button" onClick={() => setSelected(item.id)} className="text-left font-semibold text-primary hover:text-blue-brand">{item.name}</button><span className="mt-1 block text-xs text-text-muted">{item.id}</span></td>
        {credit ? <><td className="whitespace-nowrap tabular-nums">{money(item.limit)}</td><td className="whitespace-nowrap font-semibold tabular-nums text-primary">{money(item.debt)}</td><td className={`whitespace-nowrap tabular-nums ${item.overdue ? "font-medium text-danger" : "text-text-muted"}`}>{money(item.overdue)}</td><td><div className="flex flex-wrap gap-1">{item.overdue > 0 && <AdminStatus value="Quá hạn" />}{item.debt > item.limit && <AdminStatus value="Vượt hạn mức" />}{!item.overdue && item.debt <= item.limit && <AdminStatus value="Trong hạn mức" />}</div></td></> : <><td>{item.contact}<span className="mt-1 block text-xs text-text-muted">{item.phone}</span></td><td>{item.group}</td><td><AdminStatus value={item.status} /></td></>}
        <td><button type="button" onClick={() => setSelected(item.id)} className="bt-icon-button" title="Hồ sơ khách hàng" aria-label={`Xem khách ${item.id}`}><Eye size={17} /></button></td>
      </tr>)}
    </AdminTable>
    <AdminPagination count={rows.length} page={page} onChange={filters.setPage} />
    <Modal open={!!customer} onClose={() => setSelected(null)} title="Hồ sơ khách hàng B2B">
      {customer && <>
        <div className="mb-5"><p className="text-xs text-text-muted">{customer.id} · {customer.branch}</p><h3 className="mb-3 mt-1 text-lg font-semibold text-primary">{customer.name}</h3><AdminStatus value={customer.status} /></div>
        <dl className="grid grid-cols-2 gap-4 border-y border-border py-4 text-sm">{[["Người liên hệ", customer.contact], ["Điện thoại", customer.phone], ["Nhóm khách", customer.group], ["Hạn mức", money(customer.limit)], ["Công nợ", money(customer.debt)], ["Khoản quá hạn", money(customer.overdue)]].map(([label, value]) => <div key={label}><dt className="text-xs text-text-muted">{label}</dt><dd className="mt-1 break-words font-medium text-primary">{value}</dd></div>)}</dl>
        <h3 className="mb-2 mt-5 text-sm font-semibold text-primary">Đơn hàng gần đây</h3>
        <div className="mb-5 divide-y divide-border">{orders.filter((item) => item.customerId === customer.id).slice(0, 4).map((order) => <Link key={order.id} href={`/admin/orders?order=${order.id}`} className="flex items-center justify-between gap-2 py-3 text-xs"><span className="font-medium text-blue-brand">{order.id}</span><span className="tabular-nums">{money(order.total)}</span><ArrowRight size={14} /></Link>)}{!orders.some((item) => item.customerId === customer.id) && <p className="py-3 text-xs text-text-muted">Chưa có đơn hàng.</p>}</div>
        {!credit && <div className="flex justify-end border-t border-border pt-4"><Button variant={customer.status === "Đang hoạt động" ? "secondary" : "primary"} onClick={() => setCustomerStatus(customer.id, customer.status === "Đang hoạt động" ? "Tạm ngưng" : "Đang hoạt động")}>{customer.status === "Đang hoạt động" ? <Pause size={16} /> : <Check size={16} />}{customer.status === "Đang hoạt động" ? "Tạm ngưng tài khoản" : "Kích hoạt tài khoản"}</Button></div>}
      </>}
    </Modal>
  </>;
}

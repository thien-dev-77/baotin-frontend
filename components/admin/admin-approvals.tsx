"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertCircle, Check, Eye, Plus, X } from "lucide-react";
import { Button, Field, Modal } from "@/components/ui";
import { useAdmin } from "@/components/admin/admin-provider";
import { AdminHeading, AdminPagination, AdminSearch, AdminStatus, AdminTable, useAdminFilters } from "@/components/admin/admin-ui";
import { money, normalize } from "@/lib/catalog";
import { approvalDecisionBlocker, approvalRejectionBlocker } from "@/lib/admin-approval";
import { AdminApprovalSnapshot } from "@/components/admin/admin-approval-snapshot";

export function AdminApprovals({ initialRequest = "" }: { initialRequest?: string }) {
  const { scopedApprovals, approvals, customers, orders, products, branch, decideApproval } = useAdmin();
  const filters = useAdminFilters("Chờ duyệt");
  const [selected, setSelected] = useState<string | null>(initialRequest || null);
  const [reason, setReason] = useState("");
  const approval = approvals.find((item) => item.id === selected);
  const customer = customers.find((item) => item.id === approval?.customerId);
  const order = orders.find((item) => item.id === approval?.orderId);
  const blocker = approval?.status === "Chờ duyệt" ? approvalDecisionBlocker(approval, order, customer, approvals) || (approval.branch !== branch ? "Chọn đúng chi nhánh để xử lý yêu cầu." : "") : "";
  const rejectionBlocker = approval ? approvalRejectionBlocker(approval, order, approvals) || (approval.branch !== branch ? "Chọn đúng chi nhánh để xử lý yêu cầu." : "") : "";
  const rows = scopedApprovals.filter((item) => (filters.filter === "all" || item.status === filters.filter) && normalize(`${item.id} ${item.orderId} ${customers.find((customer) => customer.id === item.customerId)?.name} ${item.type}`).includes(normalize(filters.query)));
  const page = Math.min(filters.page, Math.max(1, Math.ceil(rows.length / 10)));
  function openRequest(id: string) { setReason(""); setSelected(id); }
  async function decide(approved: boolean) {
    if (!approval || !reason.trim() || (approved ? blocker : rejectionBlocker)) return;
    const error = await decideApproval(approval.id, approved, reason);
    if (error) return;
    setSelected(null);
    setReason("");
  }
  return <>
    <AdminHeading title="Yêu cầu duyệt" subtitle={`${branch} · Giá đặc biệt và ngoại lệ công nợ`}><Link href="/admin/approvals/new" className="bt-button-primary"><Plus size={16} />Tạo yêu cầu</Link></AdminHeading>
    <div className="mb-4 flex flex-wrap gap-3"><AdminSearch value={filters.query} onChange={filters.setQuery} placeholder="Tìm yêu cầu, mã đơn, khách hàng..." /><select aria-label="Trạng thái yêu cầu" value={filters.filter} onChange={(event) => filters.setFilter(event.target.value)} className="bt-input !w-auto"><option value="all">Tất cả trạng thái</option>{["Chờ duyệt", "Đã duyệt", "Từ chối"].map((status) => <option key={status}>{status}</option>)}</select></div>
    <AdminTable headings={["Yêu cầu", "Khách hàng / đơn hàng", "Người đề nghị", "Trạng thái", "Thao tác"]} empty={!rows.length}>
      {rows.slice((page - 1) * 10, page * 10).map((item) => <tr key={item.id}><td><button type="button" onClick={() => openRequest(item.id)} className="font-semibold text-blue-brand">{item.id}</button><span className="mt-1 block text-xs text-text-muted">{item.type}</span></td><td><span className="font-medium text-primary">{customers.find((customer) => customer.id === item.customerId)?.name}</span><span className="mt-1 block text-xs text-text-muted">{item.orderId}</span></td><td>{item.requestedBy}</td><td><AdminStatus value={item.status} /></td><td><button type="button" className="bt-icon-button" title="Chi tiết yêu cầu" aria-label={`Xem yêu cầu ${item.id}`} onClick={() => openRequest(item.id)}><Eye size={17} /></button></td></tr>)}
    </AdminTable>
    <AdminPagination count={rows.length} page={page} onChange={filters.setPage} />
    <Modal open={!!approval} onClose={() => setSelected(null)} title={`Yêu cầu ${selected || ""}`}>
      {approval && <>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h3 className="text-base font-semibold text-primary">{approval.type}</h3><AdminStatus value={approval.status} /></div>
        <p className="text-sm font-medium text-primary">{customer?.name}</p><p className="mt-1 text-xs text-text-muted">{approval.branch} · {approval.requestedBy}</p>
        <p className="my-4 text-sm leading-6 text-text-secondary">{approval.reason}</p>
        <dl className="grid grid-cols-2 gap-4 border-y border-border py-4 text-sm"><div><dt className="text-xs text-text-muted">Đơn hàng</dt><dd className="mt-1"><Link href={`/admin/orders?order=${approval.orderId}`} className="font-medium text-blue-brand">{approval.orderId}</Link></dd></div><div><dt className="text-xs text-text-muted">Giá trị đơn</dt><dd className="mt-1 font-medium text-primary">{money(order?.total || 0)}</dd></div>{customer && <><div><dt className="text-xs text-text-muted">Công nợ / hạn mức</dt><dd className="mt-1">{money(customer.debt)} / {money(customer.limit)}</dd></div><div><dt className="text-xs text-text-muted">Khoản quá hạn</dt><dd className="mt-1 text-danger">{money(customer.overdue)}</dd></div></>}</dl>
        <AdminApprovalSnapshot approval={approval} products={products} />
        {blocker && <p role="status" className="mt-4 flex gap-2 rounded border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900"><AlertCircle size={16} className="shrink-0" />{blocker}</p>}
        {approval.status === "Chờ duyệt" ? <div className="mt-5"><Field label="Ý kiến xử lý" required><textarea required maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} className="bt-input !h-24 py-2" /></Field><div className="mt-4 flex flex-wrap justify-end gap-2"><Button variant="secondary" disabled={!reason.trim() || !!rejectionBlocker} onClick={() => decide(false)}><X size={16} />Từ chối</Button><Button disabled={!reason.trim() || !!blocker} onClick={() => decide(true)}><Check size={16} />Duyệt yêu cầu</Button></div></div> : <div className="mt-5"><h4 className="text-xs font-medium text-text-muted">Ý kiến xử lý</h4><p className="mt-2 text-sm leading-6">{approval.decisionReason}</p></div>}
      </>}
    </Modal>
  </>;
}

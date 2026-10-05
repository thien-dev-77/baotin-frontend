"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertCircle, ArrowRight, Check, ClipboardPlus, Pencil, X } from "lucide-react";
import { Button, Field, Modal } from "@/components/ui";
import { useAdmin } from "@/components/admin/admin-provider";
import { AdminStatus } from "@/components/admin/admin-ui";
import { AdminOrderItems } from "@/components/admin/admin-order-items";
import { AdminWarehouseIssue } from "@/components/admin/admin-warehouse-issue";
import { AdminOrderHistory } from "@/components/admin/admin-order-history";
import { adminDate, orderBlocker } from "@/lib/admin-preview";
import { isWarehouseOrder, warehouseBlocker } from "@/lib/admin-warehouse";
import { money } from "@/lib/catalog";
import { latestOrderApprovals } from "@/lib/admin-approval";

const nextActions: Record<string, string> = {
  "Chờ xác nhận": "Xác nhận đơn", "Chờ soạn hàng": "Bắt đầu soạn", "Đang soạn": "Hoàn tất soạn hàng",
  "Sẵn sàng giao": "Bàn giao vận chuyển", "Đang giao": "Xác nhận đã giao"
};

export function AdminOrderDialog({ id, onClose, warehouseMode = false }: { id: string | null; onClose: () => void; warehouseMode?: boolean }) {
  const { orders, customers, approvals, products, warehouse, receipts, advanceOrder, cancelOrder } = useAdmin();
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState("");
  useEffect(() => { setCancelling(false); setReason(""); }, [id]);
  const order = orders.find((item) => item.id === id);
  const linked = order ? latestOrderApprovals(order, approvals) : [];
  const blocker = !order ? "" : order.status === "Chờ xác nhận" ? orderBlocker(order, customers, approvals, products) : warehouseBlocker(order, warehouse[order.id]);
  const canCancel = !warehouseMode && order && ["Chờ xác nhận", "Chờ soạn hàng", "Đang soạn", "Sẵn sàng giao"].includes(order.status);
  const hasReceipts = !!order && receipts.some((item) => item.orderId === order.id && item.status !== "Đã hủy");
  const action = order && (!warehouseMode || isWarehouseOrder(order)) ? nextActions[order.status] : undefined;

  return <Modal open={!!order} onClose={onClose} title={`Đơn hàng ${id || ""}`}>
    {order && <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2"><AdminStatus value={order.status} /><span className="text-xs text-text-muted">{adminDate(order.date)} · {order.branch}</span></div>
      <dl className="mb-5 grid grid-cols-2 gap-4 text-sm">
        <div className="col-span-2"><dt className="text-xs text-text-muted">Khách hàng</dt><dd className="mt-1 font-semibold text-primary">{order.customerName}</dd></div>
        <div><dt className="text-xs text-text-muted">Nguồn đơn</dt><dd className="mt-1">{order.source}</dd></div>
        {!warehouseMode && <div><dt className="text-xs text-text-muted">Thanh toán</dt><dd className="mt-1">{order.details?.payment || (order.credit ? "Theo công nợ B2B" : "Thanh toán trước khi giao")}</dd></div>}
        {order.details && <><div><dt className="text-xs text-text-muted">Người nhận</dt><dd className="mt-1 break-words">{order.details.recipient}</dd></div><div><dt className="text-xs text-text-muted">Số điện thoại</dt><dd className="mt-1">{order.details.phone}</dd></div><div className="col-span-2"><dt className="text-xs text-text-muted">Giao hàng</dt><dd className="mt-1 break-words">{order.details.delivery}{order.details.address && ` · ${order.details.address}`}</dd></div>{order.details.note && <div className="col-span-2"><dt className="text-xs text-text-muted">Ghi chú</dt><dd className="mt-1 whitespace-pre-wrap break-words">{order.details.note}</dd></div>}</>}
      </dl>
      <AdminOrderItems order={order} showPrices={!warehouseMode} />
      {!warehouseMode && <div className="flex justify-between gap-2 py-4 text-sm font-semibold text-primary"><span>Tổng giá trị</span><span className="tabular-nums">{money(order.total)}</span></div>}
      {!warehouseMode && !!linked.length && <section aria-label="Ngoại lệ của đơn" className="mb-4 border-y border-border py-3"><h3 className="mb-2 text-xs font-semibold text-primary">Ngoại lệ của đơn</h3><div className="space-y-2">{linked.map((request) => <Link key={request.id} href={`/admin/approvals?request=${request.id}`} onClick={onClose} className="flex flex-wrap items-center justify-between gap-2 text-xs text-blue-brand"><span>{request.id} · {request.type}</span><AdminStatus value={request.status} /></Link>)}</div></section>}
      <AdminWarehouseIssue key={order.id} order={order} />
      {blocker && <div role="status" className="mb-4 flex gap-2 rounded border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900"><AlertCircle size={16} className="mt-0.5 shrink-0" /><div>{blocker}{order.status === "Chờ xác nhận" && order.approvalId && <Link href={`/admin/approvals?request=${order.approvalId}`} onClick={onClose} className="mt-1 flex items-center gap-1 font-semibold underline">Mở yêu cầu duyệt <ArrowRight size={13} /></Link>}</div></div>}
      {order.cancelReason && <p className="mb-4 text-sm leading-6 text-text-secondary"><strong className="text-primary">Lý do hủy: </strong>{order.cancelReason}</p>}
      {canCancel && hasReceipts && <p role="status" className="mb-4 text-xs leading-5 text-text-secondary">Đơn có phiếu thu còn hiệu lực, cần xử lý trước khi hủy. <Link href="/admin/accounting" onClick={onClose} className="font-medium text-blue-brand">Mở phiếu thu</Link></p>}
      {cancelling && canCancel ? <form onSubmit={async (event) => { event.preventDefault(); const error = await cancelOrder(order.id, reason); if (!error) setCancelling(false); }} className="space-y-3 border-t border-border pt-4">
        <Field label="Lý do hủy đơn" required><textarea required maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} className="bt-input !h-24 py-2" /></Field>
        <div className="flex flex-wrap justify-end gap-2"><Button variant="secondary" onClick={() => setCancelling(false)} type="button">Quay lại</Button><Button type="submit" disabled={!reason.trim() || hasReceipts} className="!bg-danger"><X size={16} />Xác nhận hủy</Button></div>
      </form> : <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
        {!warehouseMode && order.status === "Chờ xác nhận" && order.customerId && <Link href={`/admin/approvals/new?order=${order.id}`} onClick={onClose} className="bt-button-secondary"><ClipboardPlus size={16} />Xin duyệt ngoại lệ</Link>}
        {!warehouseMode && order.status === "Chờ xác nhận" && !order.approvalId && <Link href={`/admin/orders/${order.id}/edit`} onClick={onClose} className="bt-button-secondary"><Pencil size={16} />Sửa đơn</Link>}
        {canCancel && <Button variant="secondary" disabled={hasReceipts} onClick={() => setCancelling(true)}><X size={16} />Hủy đơn</Button>}
        {action && <Button disabled={!!blocker} onClick={() => advanceOrder(order.id)}><Check size={16} />{action}</Button>}
        {!action && <Button variant="secondary" onClick={onClose}>Đóng</Button>}
      </div>}
      <AdminOrderHistory id={order.id} />
    </>}
  </Modal>;
}

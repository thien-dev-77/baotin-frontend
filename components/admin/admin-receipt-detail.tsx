"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCheck, XCircle } from "lucide-react";
import { Button, Field } from "@/components/ui";
import { useAdmin } from "@/components/admin/admin-provider";
import { AdminStatus } from "@/components/admin/admin-ui";
import { adminDate } from "@/lib/admin-preview";
import type { Receipt } from "@/lib/admin-accounting";
import { money } from "@/lib/catalog";

function eventTime(value: string) { return new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "short" }).format(new Date(value)); }

export function AdminReceiptDetail({ receipt, onClose }: { receipt: Receipt; onClose: () => void }) {
  const { reconcileReceipt, voidReceipt } = useAdmin();
  const [amount, setAmount] = useState(receipt.amount);
  const [reference, setReference] = useState(receipt.reference);
  const [note, setNote] = useState("");
  const [cancel, setCancel] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  return <>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><strong className="text-primary">{receipt.id}</strong><AdminStatus value={receipt.status} /></div>
    <dl className="grid grid-cols-2 gap-4 border-y border-border py-4 text-sm">{[["Đơn hàng", <Link key="order" href={`/admin/orders?order=${receipt.orderId}`} className="text-blue-brand">{receipt.orderId}</Link>], ["Số tiền", money(receipt.amount)], ["Hình thức", receipt.method], ["Ngày thu", adminDate(receipt.date)], ["Mã giao dịch / chứng từ", receipt.reference], ["Ghi chú", receipt.note || "—"]].map(([label, value]) => <div key={String(label)}><dt className="text-xs text-text-muted">{label}</dt><dd className="mt-1 break-words font-medium text-primary">{value}</dd></div>)}</dl>
    <p className="mt-3 text-xs text-text-muted">Lập phiếu: {eventTime(receipt.createdAt)}</p>
    {receipt.reconciliation && <section aria-label="Kết quả đối chiếu" className="mt-5 border-l-2 border-emerald-500 pl-3 text-sm"><h3 className="font-semibold text-primary">Đã đối chiếu</h3><p className="mt-1 break-words text-text-secondary">{receipt.reconciliation.reference} · {money(receipt.reconciliation.amount)}</p><p className="mt-1 break-words text-text-secondary">{receipt.reconciliation.note}</p><p className="mt-2 text-xs text-text-muted">{eventTime(receipt.reconciliation.at)}</p></section>}
    {receipt.cancellation && <div className="mt-4"><p className="break-words text-sm text-danger">Lý do hủy: {receipt.cancellation.reason}</p><p className="mt-2 text-xs text-text-muted">{eventTime(receipt.cancellation.at)}</p></div>}
    {receipt.status === "Chờ đối chiếu" && !cancel && <form className="mt-5 space-y-4" onSubmit={async (event) => { event.preventDefault(); const result = await reconcileReceipt(receipt.id, amount, reference, note); if (result) setError(result); else onClose(); }}>
      <h3 className="text-sm font-semibold text-primary">Đối chiếu chứng từ</h3>
      <Field label="Số tiền thực nhận (VND)" required><input type="number" className="bt-input" required min={1} step={1} value={amount || ""} onChange={(event) => { setAmount(Number(event.target.value)); setError(""); }} /></Field>
      {amount !== receipt.amount && <p role="status" className="text-sm text-danger">Chênh lệch: {money(amount - receipt.amount)}</p>}
      <Field label="Mã đối chiếu" required><input className="bt-input" required maxLength={100} value={reference} onChange={(event) => { setReference(event.target.value); setError(""); }} /></Field>
      <Field label="Kết quả kiểm tra" required><textarea className="bt-input !h-auto" rows={2} maxLength={500} required value={note} onChange={(event) => { setNote(event.target.value); setError(""); }} /></Field>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <div className="flex justify-end"><Button type="submit" disabled={!note.trim() || !reference.trim()}><CheckCheck size={16} />Xác nhận đối chiếu</Button></div>
    </form>}
    {cancel && <form className="mt-5 space-y-4" onSubmit={async (event) => { event.preventDefault(); const result = await voidReceipt(receipt.id, reason); if (result) setError(result); else onClose(); }}><Field label="Lý do hủy phiếu" required><textarea className="bt-input !h-auto" required maxLength={500} rows={3} value={reason} onChange={(event) => setReason(event.target.value)} /></Field>{error && <p role="alert" className="text-sm text-danger">{error}</p>}<div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="secondary" onClick={() => { setCancel(false); setError(""); }}>Quay lại</Button><Button type="submit" disabled={!reason.trim()}><XCircle size={16} />Xác nhận hủy phiếu</Button></div></form>}
    {receipt.status !== "Đã hủy" && !cancel && <div className="mt-5 border-t border-border pt-4"><Button variant="ghost" className="!text-danger" onClick={() => { setCancel(true); setError(""); }}><XCircle size={16} />Hủy phiếu thu</Button></div>}
  </>;
}

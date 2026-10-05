"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { Button, Field } from "@/components/ui";
import { useAdmin } from "@/components/admin/admin-provider";
import { paymentSummary, receiptMethods, type ReceiptDraft } from "@/lib/admin-accounting";
import { type AdminOrder } from "@/lib/admin-preview";
import { money } from "@/lib/catalog";

export function AdminReceiptForm({ order, onSave }: { order: AdminOrder; onSave: () => void }) {
  const { receipts, createReceipt, today } = useAdmin();
  const summary = paymentSummary(order, receipts);
  const [draft, setDraft] = useState<ReceiptDraft>({ orderId: order.id, amount: summary.available, method: "Chuyển khoản", date: today, reference: "", note: "" });
  const [error, setError] = useState("");
  const change = (patch: Partial<ReceiptDraft>) => { setDraft((value) => ({ ...value, ...patch })); setError(""); };
  return <form onSubmit={async (event) => { event.preventDefault(); const result = await createReceipt(draft); if (result.error) setError(result.error); else onSave(); }}>
    <p className="mb-1 text-xs text-text-muted">{order.id} · {order.branch}</p><h3 className="mb-5 text-base font-semibold text-primary">{order.customerName}</h3>
    <dl className="mb-5 grid grid-cols-2 gap-3 border-y border-border py-4 text-sm"><div><dt className="text-xs text-text-muted">Còn phải thu</dt><dd className="mt-1 font-semibold tabular-nums">{money(summary.remaining)}</dd></div><div><dt className="text-xs text-text-muted">Chờ đối chiếu</dt><dd className="mt-1 tabular-nums">{money(summary.pending)}</dd></div></dl>
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Số tiền thu (VND)" required><input type="number" className="bt-input" min={1} max={summary.available} step={1} required value={draft.amount || ""} onChange={(event) => change({ amount: Number(event.target.value) })} /></Field>
      <Field label="Ngày thu" required><input type="date" className="bt-input" min={order.date} max={today} required value={draft.date} onChange={(event) => change({ date: event.target.value })} /></Field>
      <Field label="Hình thức thu" required><select className="bt-input" value={draft.method} onChange={(event) => change({ method: event.target.value as ReceiptDraft["method"] })}>{receiptMethods.map((method) => <option key={method}>{method}</option>)}</select></Field>
      <Field label="Mã giao dịch / chứng từ" required><input className="bt-input" required maxLength={100} value={draft.reference} onChange={(event) => change({ reference: event.target.value })} /></Field>
      <div className="sm:col-span-2"><Field label="Ghi chú"><textarea className="bt-input !h-auto" rows={3} maxLength={500} value={draft.note} onChange={(event) => change({ note: event.target.value })} /></Field></div>
    </div>
    {error && <p role="alert" className="mt-4 text-sm text-danger">{error}</p>}
    <div className="mt-5 flex justify-end border-t border-border pt-4"><Button type="submit" disabled={summary.available <= 0}><Save size={16} />Lập phiếu thu</Button></div>
  </form>;
}

"use client";

import { useState } from "react";
import { AlertTriangle, Check, Send } from "lucide-react";
import { Button, Field } from "@/components/ui";
import { useAdmin } from "@/components/admin/admin-provider";
import { type AdminOrder } from "@/lib/admin-preview";
import { hasShortage, isPicked, isWarehouseOrder, warehouseTime } from "@/lib/admin-warehouse";

export function AdminWarehouseIssue({ order }: { order: AdminOrder }) {
  const { warehouse, reportShortage, resolveShortage } = useAdmin();
  const record = warehouse[order.id];
  const issue = record?.issue;
  const active = hasShortage(record);
  const [reporting, setReporting] = useState(false);
  const [productId, setProductId] = useState(order.items[0].productId);
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [resolution, setResolution] = useState("");
  const line = order.items.find((item) => item.productId === productId)!;
  const valid = Number.isInteger(quantity) && quantity >= 1 && quantity <= line.quantity && !!note.trim();

  if (!isWarehouseOrder(order)) return null;
  return <div className="mb-4 mt-4">
    {issue && <div className={`rounded border p-3 text-xs leading-5 ${active ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`} role="status">
      <div className="flex items-start gap-2"><AlertTriangle size={16} className="mt-0.5 shrink-0" /><div className="min-w-0"><strong>{active ? "Báo thiếu hàng" : "Đã xử lý báo thiếu"}</strong><p className="mt-1 break-words">{issue.productId} · Thiếu {issue.quantity}</p><p className="break-words">{issue.note}</p><p className="mt-1 opacity-80">{warehouseTime(issue.reportedAt)}</p>{issue.resolution && <p className="mt-2 break-words">Xử lý: {issue.resolution}</p>}</div></div>
    </div>}
    {active && issue ? <form className="mt-4 space-y-3" onSubmit={async (event) => { event.preventDefault(); const error = await resolveShortage(order.id, resolution); if (!error) setResolution(""); }}>
      <Field label="Kết quả xử lý thiếu hàng" required><textarea required maxLength={500} value={resolution} onChange={(event) => setResolution(event.target.value)} className="bt-input !h-20 py-2" /></Field>
      <div className="flex justify-end"><Button type="submit" variant="secondary" disabled={!resolution.trim() || !isPicked(order, record, issue.productId)}><Check size={16} />Xác nhận đã đủ hàng</Button></div>
    </form> : reporting ? <form className="space-y-3" onSubmit={async (event) => { event.preventDefault(); if (!valid) return; const error = await reportShortage(order.id, productId, quantity, note); if (!error) { setReporting(false); setNote(""); } }}>
      <h3 className="text-sm font-semibold text-primary">Báo thiếu hàng</h3>
      <Field label="Mã hàng thiếu" required><select value={productId} onChange={(event) => { setProductId(event.target.value); setQuantity(1); }} className="bt-input">{order.items.map((item) => <option key={item.productId} value={item.productId}>{item.productId}</option>)}</select></Field>
      <Field label="Số lượng thiếu" required><input type="number" min={1} max={line.quantity} step={1} required value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} className="bt-input" /></Field>
      <Field label="Ghi chú thiếu hàng" required><textarea required maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} className="bt-input !h-20 py-2" /></Field>
      <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setReporting(false)}>Quay lại</Button><Button type="submit" disabled={!valid}><Send size={16} />Gửi báo thiếu</Button></div>
    </form> : <Button variant="ghost" onClick={() => { setQuantity(1); setProductId(order.items[0].productId); setReporting(true); }}><AlertTriangle size={16} />Báo thiếu hàng</Button>}
  </div>;
}

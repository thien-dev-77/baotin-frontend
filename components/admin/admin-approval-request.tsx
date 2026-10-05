"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertCircle, ArrowLeft, ArrowRight, Send } from "lucide-react";
import { Button, Field, Tabs } from "@/components/ui";
import { AdminHeading } from "@/components/admin/admin-ui";
import { useAdmin } from "@/components/admin/admin-provider";
import { approvalRequestBlocker, approvalTypes, latestOrderApprovals, type ApprovalType } from "@/lib/admin-approval";
import { money } from "@/lib/catalog";

export function AdminApprovalRequest({ initialOrder = "", initialType = "" }: { initialOrder?: string; initialType?: string }) {
  const { branch } = useAdmin();
  return <ApprovalRequestForm key={`${branch}-${initialOrder}-${initialType}`} initialOrder={initialOrder} initialType={initialType} />;
}

function ApprovalRequestForm({ initialOrder, initialType }: { initialOrder: string; initialType: string }) {
  const router = useRouter();
  const { orders, customers, approvals, products, branch, createApproval } = useAdmin();
  const choices = orders.filter((item) => item.branch === branch && item.customerId && item.status === "Chờ xác nhận");
  const [orderId, setOrderId] = useState(choices.some((item) => item.id === initialOrder) ? initialOrder : "");
  const [type, setType] = useState<ApprovalType>(initialType === "credit" ? "Công nợ" : "Giá đặc biệt");
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const order = choices.find((item) => item.id === orderId);
  const customer = customers.find((item) => item.id === order?.customerId);
  const requested = order?.items.reduce((sum, item) => sum + item.quantity * (prices[item.productId] ?? item.unitPrice), 0) || 0;
  const blocker = approvalRequestBlocker(order, customer, type, approvals);
  const existing = order ? latestOrderApprovals(order, approvals).find((item) => item.type === type) : undefined;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!order || saving) return;
    const result = await createApproval(order.id, { type, reason, prices: Object.fromEntries(order.items.map((item) => [item.productId, prices[item.productId] ?? item.unitPrice])) });
    if (result.error) { setError(result.error); return; }
    setSaving(true);
    router.push(`/admin/approvals?request=${result.id}`);
  }

  return <>
    <AdminHeading title="Tạo yêu cầu duyệt" subtitle={`${branch} · Inside Sales`}><Link href="/admin/approvals" className="bt-button-secondary"><ArrowLeft size={16} />Về yêu cầu duyệt</Link></AdminHeading>
    <form onSubmit={submit} className="grid min-w-0 bg-white xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 px-4 sm:px-5">
        <section className="border-b border-border py-5" aria-labelledby="request-order-title">
          <h2 id="request-order-title" className="mb-4 text-base font-semibold text-primary">Đơn hàng</h2>
          <Field label="Đơn B2B chờ xác nhận" required><select required value={orderId} className="bt-input" onChange={(event) => { setOrderId(event.target.value); setPrices({}); setError(""); }}><option value="">Chọn đơn hàng</option>{choices.map((item) => <option key={item.id} value={item.id}>{item.id} · {item.customerName}</option>)}</select></Field>
          {!choices.length && <div className="mt-3 text-sm text-text-secondary">Chưa có đơn B2B chờ xác nhận. <Link href="/admin/orders/new" className="font-medium text-blue-brand">Tạo đơn hộ khách <ArrowRight size={14} className="inline" /></Link></div>}
          {order && customer && <dl className="mt-4 grid gap-3 text-xs text-text-secondary sm:grid-cols-2"><div><dt>Khách hàng</dt><dd className="mt-1 text-sm font-medium text-primary">{customer.name}</dd></div><div><dt>Nguồn đơn</dt><dd className="mt-1 text-sm text-primary">{order.source}</dd></div></dl>}
        </section>
        <section className="py-5" aria-labelledby="request-detail-title">
          <h2 id="request-detail-title" className="mb-3 text-base font-semibold text-primary">Nội dung đề nghị</h2>
          <Tabs options={[...approvalTypes]} value={type} onChange={(value) => { setType(value as ApprovalType); setError(""); }} />
          {order && type === "Giá đặc biệt" && <ul className="divide-y divide-border">{order.items.map((line) => {
            const product = products.find((item) => item.id === line.productId)!;
            return <li key={line.productId} className="grid grid-cols-[44px_minmax(0,1fr)] gap-3 py-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={product.image} alt={product.name} width={44} height={44} className="h-11 w-11 rounded object-contain" />
              <div className="min-w-0"><p className="text-sm font-medium leading-5 text-primary">{product.name}</p><p className="mt-1 text-xs text-text-muted">{product.code} · {line.quantity} {product.unit}</p></div>
              <div className="col-span-2 grid grid-cols-2 items-end gap-3 sm:col-start-2"><div><p className="mb-1.5 text-xs text-text-secondary">Giá hiện tại</p><p className="flex min-h-10 items-center text-sm font-semibold tabular-nums text-primary">{money(line.unitPrice)}/{product.unit}</p></div><Field label="Giá đề nghị (VNĐ)"><input aria-label={`Giá đề nghị ${product.code}`} type="number" inputMode="numeric" min={1} max={line.unitPrice} step={1} required disabled={!!blocker} value={prices[line.productId] ?? line.unitPrice} onChange={(event) => { setPrices((state) => ({ ...state, [line.productId]: Number(event.target.value) })); setError(""); }} className="bt-input tabular-nums" /></Field></div>
            </li>;
          })}</ul>}
          {order && customer && type === "Công nợ" && <dl className="mt-5 grid grid-cols-2 gap-4 border-b border-border pb-5 text-sm">{[["Hạn mức hiện tại", customer.limit], ["Công nợ hiện tại", customer.debt], ["Khoản quá hạn", customer.overdue], ["Giá trị đơn đề nghị", order.total], ["Công nợ + đơn này", customer.debt + order.total], ["Phần vượt hạn mức", Math.max(0, customer.debt + order.total - customer.limit)]].map(([label, value]) => <div key={label}><dt className="text-xs leading-5 text-text-secondary">{label}</dt><dd className="mt-1 break-words font-semibold tabular-nums text-primary">{money(Number(value))}</dd></div>)}</dl>}
          <div className="mt-5"><Field label="Lý do đề nghị" required><textarea required maxLength={500} disabled={!!blocker} value={reason} onChange={(event) => { setReason(event.target.value); setError(""); }} className="bt-input !h-28 py-2" /></Field></div>
        </section>
      </div>
      <aside aria-label="Tổng kết yêu cầu" className="min-w-0 border-t border-border bg-section/50 p-4 sm:p-5 xl:border-l xl:border-t-0"><div className="xl:sticky xl:top-5">
        <h2 className="text-base font-semibold text-primary">Tổng kết yêu cầu</h2>
        <dl className="mt-5 space-y-4 text-sm"><div className="flex flex-wrap justify-between gap-2"><dt className="text-text-secondary">Loại yêu cầu</dt><dd className="font-medium text-primary">{type}</dd></div><div className="flex flex-wrap justify-between gap-2"><dt className="text-text-secondary">Giá trị đơn hiện tại</dt><dd className="tabular-nums text-primary">{money(order?.total || 0)}</dd></div>{type === "Giá đặc biệt" && <><div className="flex flex-wrap justify-between gap-2 border-t border-border pt-4 font-semibold text-primary"><dt>Giá trị đề nghị</dt><dd className="tabular-nums">{money(requested)}</dd></div><div className="flex flex-wrap justify-between gap-2 text-xs text-text-secondary"><dt>Chênh lệch</dt><dd className="tabular-nums">{money((order?.total || 0) - requested)}</dd></div></>}</dl>
        <p className="mt-4 text-xs leading-5 text-text-secondary">{type === "Giá đặc biệt" ? "Giá đề nghị chỉ áp dụng cho đơn này, chưa gồm phí vận chuyển và thuế." : "Ngoại lệ chỉ áp dụng cho đơn này, không tăng hạn mức công nợ của khách."}</p>
        {blocker && <div role="status" className="mt-5 flex gap-2 border-l-2 border-amber-400 bg-amber-50 p-3 text-xs leading-5 text-amber-900"><AlertCircle size={16} className="mt-0.5 shrink-0" /><div>{blocker}{existing && <Link className="mt-2 block font-medium underline" href={`/admin/approvals?request=${existing.id}`}>Mở yêu cầu {existing.id}</Link>}</div></div>}
        {error && <p role="alert" className="mt-4 text-sm leading-5 text-danger">{error}</p>}
        <Button type="submit" disabled={!!blocker || saving} className="mt-5 w-full"><Send size={16} />{saving ? "Đang gửi..." : "Gửi yêu cầu duyệt"}</Button>
      </div></aside>
    </form>
  </>;
}

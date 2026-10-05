"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { AlertCircle, ArrowLeft, Check, Plus, Trash2 } from "lucide-react";
import { Button, Field, QuantityStepper } from "@/components/ui";
import { useAdmin } from "@/components/admin/admin-provider";
import { AdminHeading, AdminStatus } from "@/components/admin/admin-ui";
import { AdminSalesProducts } from "@/components/admin/admin-sales-products";
import { orderBlocker, previewDate, type AdminOrder } from "@/lib/admin-preview";
import { blankSalesDraft, draftItems, salesDeliveries, salesPayments, salesSources, type SalesDetails } from "@/lib/admin-sales";
import { money } from "@/lib/catalog";

export function AdminSalesOrder({ id }: { id?: string }) {
  const { orders, branch } = useAdmin();
  const order = orders.find((item) => item.id === id);
  if (id && (!order || order.branch !== branch || order.status !== "Chờ xác nhận" || order.approvalId)) return <>
    <AdminHeading title="Không thể sửa đơn" /><p role="status" className="mb-5 text-sm text-text-secondary">Chỉ sửa đơn chờ xác nhận tại chi nhánh đang chọn, chưa gắn yêu cầu duyệt.</p><Link href="/admin/orders" className="bt-button-secondary"><ArrowLeft size={16} />Về đơn hàng</Link>
  </>;
  return <SalesOrderForm key={`${branch}-${id || "new"}`} order={order} />;
}

function SalesOrderForm({ order }: { order?: AdminOrder }) {
  const router = useRouter();
  const { customers, scopedCustomers, branch, products, approvals, saveSalesOrder } = useAdmin();
  const [draft, setDraft] = useState(() => {
    const data = blankSalesDraft(order);
    const customer = customers.find((item) => item.id === order?.customerId);
    if (customer && !order?.details) data.details = { ...data.details, recipient: customer.contact, phone: customer.phone };
    return data;
  });
  const [picker, setPicker] = useState(false);
  const pickerTrigger = useRef<HTMLButtonElement>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const customer = customers.find((item) => item.id === draft.customerId);
  const items = draftItems(draft, customer, products, order);
  const total = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const credit = draft.details.payment === "Công nợ B2B";
  const candidate: AdminOrder = { id: order?.id || "", branch, date: previewDate, source: draft.source, customerId: customer?.id || null, customerName: customer?.name || draft.details.recipient, channel: customer ? "B2B" : "B2C", items, total, credit, status: "Chờ xác nhận" };
  const blocker = items.length ? orderBlocker(candidate, customers, approvals, products) : "";
  function detail<K extends keyof SalesDetails>(key: K, value: SalesDetails[K]) {
    setDraft((state) => ({ ...state, details: { ...state.details, [key]: value } }));
    setError("");
  }
  function selectCustomer(id: string) {
    const selected = customers.find((item) => item.id === id);
    setDraft((state) => ({ ...state, customerId: id, details: { ...state.details, recipient: selected?.contact || "", phone: selected?.phone || "", payment: "Chuyển khoản", delivery: !selected && !["Giao nội thành", "Nhận tại cửa hàng"].includes(state.details.delivery) ? "Nhận tại cửa hàng" : state.details.delivery } }));
    setError("");
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    const result = await saveSalesOrder(draft, order?.id, reason);
    if (result.error) { setError(result.error); return; }
    setSaving(true);
    router.push(`/admin/orders?order=${result.id}`);
  }
  return <>
    <AdminHeading title={order ? `Sửa đơn ${order.id}` : "Tạo đơn hộ khách"} subtitle={`${branch} · Inside Sales`}><Link href="/admin/orders" className="bt-button-secondary"><ArrowLeft size={16} />Về đơn hàng</Link></AdminHeading>
    <form onSubmit={submit} className="grid min-w-0 bg-white xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 px-4 sm:px-5">
        <section aria-labelledby="sales-customer" className="border-b border-border py-5">
          <h2 id="sales-customer" className="mb-4 text-base font-semibold text-primary">Khách hàng & nguồn đơn</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Khách hàng"><select aria-label="Khách hàng" disabled={!!order} value={draft.customerId} onChange={(event) => selectCustomer(event.target.value)} className="bt-input"><option value="">Khách lẻ B2C</option>{scopedCustomers.map((item) => <option key={item.id} value={item.id} disabled={item.status !== "Đang hoạt động"}>{item.name}{item.status !== "Đang hoạt động" ? ` (${item.status})` : ""}</option>)}</select></Field>
            <Field label="Nguồn đơn"><select aria-label="Nguồn đơn" value={draft.source} disabled={!!order} onChange={(event) => setDraft((state) => ({ ...state, source: event.target.value }))} className="bt-input">{order && !salesSources.some((source) => source === order.source) && <option>{order.source}</option>}{salesSources.map((item) => <option key={item}>{item}</option>)}</select></Field>
          </div>
          {customer && <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-text-secondary"><span>{customer.id} · {customer.group}</span><AdminStatus value={customer.status} /></div>}
        </section>
        <section aria-labelledby="sales-items" className="border-b border-border py-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 id="sales-items" className="text-base font-semibold text-primary">Sản phẩm ({items.length})</h2><button ref={pickerTrigger} type="button" className="bt-button-secondary" onClick={() => setPicker(true)}><Plus size={16} />Thêm sản phẩm</button></div>
          {!items.length && <p className="py-6 text-center text-sm text-text-muted">Chưa có sản phẩm trong đơn.</p>}
          <ul className="divide-y divide-border">{items.map((line) => {
            const product = products.find((item) => item.id === line.productId)!;
            return <li key={line.productId} className="flex flex-wrap items-center gap-3 py-4" aria-label={`Dòng sản phẩm ${product.code}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={product.image} alt={product.name} width={56} height={56} className="h-14 w-14 shrink-0 rounded object-contain" />
              <div className="min-w-0 flex-1"><p className="text-sm font-medium leading-5 text-primary">{product.name}</p><p className="mt-1 text-xs text-text-muted">{product.code} · Tồn {product.stock} {product.unit}</p><p className="mt-1 text-xs text-text-secondary">{money(line.unitPrice)}/{product.unit}</p></div>
              <div className="flex w-full items-center justify-end gap-3 sm:w-auto sm:flex-wrap"><QuantityStepper label={`Số lượng ${product.code}`} value={line.quantity} onChange={(quantity) => setDraft((state) => ({ ...state, items: state.items.map((item) => item.productId === line.productId ? { ...item, quantity } : item) }))} /><span className="min-w-[88px] text-right text-sm font-semibold tabular-nums text-primary">{money(line.quantity * line.unitPrice)}</span><button type="button" aria-label={`Xóa ${product.code}`} title={`Xóa ${product.code}`} className="bt-icon-button shrink-0 hover:!text-danger" onClick={() => setDraft((state) => ({ ...state, items: state.items.filter((item) => item.productId !== line.productId) }))}><Trash2 size={17} /></button></div>
            </li>;
          })}</ul>
        </section>
        <section aria-labelledby="sales-delivery" className="py-5">
          <h2 id="sales-delivery" className="mb-4 text-base font-semibold text-primary">Giao hàng & thanh toán</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Người nhận" required><input required maxLength={100} value={draft.details.recipient} onChange={(event) => detail("recipient", event.target.value)} className="bt-input" autoComplete="name" /></Field>
            <Field label="Số điện thoại" required><input required type="tel" maxLength={25} value={draft.details.phone} onChange={(event) => detail("phone", event.target.value)} className="bt-input" autoComplete="tel" /></Field>
            <Field label="Hình thức giao hàng"><select value={draft.details.delivery} onChange={(event) => detail("delivery", event.target.value as SalesDetails["delivery"])} className="bt-input">{salesDeliveries.map((item) => <option key={item} disabled={!customer && !["Giao nội thành", "Nhận tại cửa hàng"].includes(item)}>{item}</option>)}</select></Field>
            <Field label="Thanh toán"><select value={draft.details.payment} onChange={(event) => detail("payment", event.target.value as SalesDetails["payment"])} className="bt-input">{salesPayments.map((item) => <option key={item} disabled={item === "Công nợ B2B" && (!customer || customer.limit <= 0)}>{item}</option>)}</select></Field>
            <div className="sm:col-span-2"><Field label="Địa chỉ / điểm nhận hàng" required={draft.details.delivery !== "Nhận tại cửa hàng"}><input required={draft.details.delivery !== "Nhận tại cửa hàng"} maxLength={300} value={draft.details.address} onChange={(event) => detail("address", event.target.value)} className="bt-input" autoComplete="street-address" /></Field></div>
            <div className="sm:col-span-2"><Field label="Ghi chú đơn hàng"><textarea maxLength={500} value={draft.details.note} onChange={(event) => detail("note", event.target.value)} className="bt-input !h-20 py-2" /></Field></div>
            {order && <div className="sm:col-span-2"><Field label="Lý do sửa đơn" required><textarea required maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} className="bt-input !h-20 py-2" /></Field></div>}
          </div>
        </section>
      </div>
      <aside aria-label="Tổng kết đơn hàng" className="min-w-0 border-t border-border bg-section/50 p-4 sm:p-5 xl:border-l xl:border-t-0">
        <div className="xl:sticky xl:top-5"><h2 className="text-base font-semibold text-primary">Tổng kết đơn hàng</h2><dl className="mt-5 space-y-3 text-sm"><div className="flex justify-between gap-3"><dt className="text-text-secondary">Số mã hàng</dt><dd>{items.length}</dd></div><div className="flex justify-between gap-3"><dt className="text-text-secondary">Số lượng</dt><dd>{items.reduce((sum, item) => sum + item.quantity, 0)}</dd></div><div className="flex flex-wrap justify-between gap-2 border-t border-border pt-4 font-semibold text-primary"><dt>Tiền hàng</dt><dd className="tabular-nums">{money(total)}</dd></div></dl>
          <p className="mt-3 text-xs leading-5 text-text-secondary">Phí vận chuyển và thuế chưa được tính. Giá và tồn kho là dữ liệu mẫu.</p>
          {customer && <dl className="mt-5 space-y-2 border-t border-border pt-4 text-xs text-text-secondary"><div className="flex justify-between gap-2"><dt>Hạn mức</dt><dd className="tabular-nums">{money(customer.limit)}</dd></div><div className="flex justify-between gap-2"><dt>Công nợ hiện tại</dt><dd className="tabular-nums">{money(customer.debt)}</dd></div><div className="flex justify-between gap-2"><dt>Quá hạn</dt><dd className="tabular-nums">{money(customer.overdue)}</dd></div></dl>}
          {blocker && <div role="status" className="mt-5 flex gap-2 border-l-2 border-amber-400 bg-amber-50 p-3 text-xs leading-5 text-amber-900"><AlertCircle size={16} className="mt-0.5 shrink-0" /><div>{blocker}<p className="mt-1">Đơn có thể lưu chờ xử lý, chưa được chuyển kho.</p></div></div>}
          {error && <p role="alert" className="mt-4 text-sm leading-5 text-danger">{error}</p>}
          <div className="mt-5"><AdminStatus value="Chờ xác nhận" /></div><Button type="submit" disabled={saving} className="mt-3 w-full"><Check size={16} />{saving ? "Đang lưu..." : order ? "Lưu thay đổi" : "Tạo đơn chờ xác nhận"}</Button>
        </div>
      </aside>
    </form>
    <AdminSalesProducts open={picker} onClose={() => { setPicker(false); requestAnimationFrame(() => pickerTrigger.current?.focus()); }} products={products} customer={customer} selected={items.map((item) => item.productId)} onAdd={(productId) => setDraft((state) => ({ ...state, items: [...state.items, { productId, quantity: 1 }] }))} />
  </>;
}

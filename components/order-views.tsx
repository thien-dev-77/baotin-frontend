"use client";
import { findProduct, money, mockOrders, Order, OrderStatus } from "@/lib/catalog";
import { useCommerce } from "@/components/commerce-provider";
import { CommerceLoading, OrderTotals } from "@/components/checkout-flow";
import { Breadcrumb, Button, EmptyState, PageHeading, Tabs } from "@/components/ui";
import { Check, ClipboardList, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiMode } from "@/lib/api-client";

export function useCustomerOrders() {
  const { customer, orders } = useCommerce();
  if (apiMode) return orders;
  return customer ? [...orders.filter((order) => order.customerId === customer.id), ...(customer.status === "active" ? mockOrders(customer.id) : [])] : orders.filter((order) => !order.customerId);
}
export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const color = status === "Đã giao" ? "bg-green-50 text-success" : status === "Đã hủy" ? "bg-red-50 text-danger" : status === "Chờ xác nhận" ? "bg-amber-50 text-amber-700" : "bg-section-blue text-blue-brand";
  return <span className={`inline-flex whitespace-nowrap rounded px-2 py-1 text-xs font-medium ${color}`}>{status}</span>;
}
const dateLabel = (date: string) => new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(date));
export function OrdersTable({ orders }: { orders: Order[] }) {
  return <><div className="hidden overflow-x-auto rounded-lg border border-border md:block"><table className="bt-table"><thead><tr><th>Mã đơn</th><th>Ngày</th><th>Tổng tiền</th><th>Trạng thái</th><th /></tr></thead><tbody>{orders.map((order) => <tr key={order.id}><td className="font-semibold text-primary">{order.id}</td><td className="whitespace-nowrap">{dateLabel(order.date)}</td><td className="whitespace-nowrap font-semibold">{money(order.total)}</td><td><OrderStatusBadge status={order.status} /></td><td><Link href={`/account/orders/${order.id}`} className="text-blue-brand">Xem</Link></td></tr>)}</tbody></table></div><div className="space-y-3 md:hidden">{orders.map((order) => <Link href={`/account/orders/${order.id}`} key={order.id} className="block rounded-lg border border-border p-4"><div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm text-primary">{order.id}</strong><OrderStatusBadge status={order.status} /></div><div className="mt-3 flex items-center justify-between text-sm"><span className="text-text-secondary">{dateLabel(order.date)}</span><strong>{money(order.total)}</strong></div><p className="mt-2 text-xs text-blue-brand">Xem chi tiết →</p></Link>)}</div></>;
}
export function OrderHistory() {
  const orders = useCustomerOrders(); const [tab, setTab] = useState("Tất cả"); const [query, setQuery] = useState("");
  const filtered = orders.filter((o) => (tab === "Tất cả" || o.status === tab) && o.id.toLowerCase().includes(query.toLowerCase()));
  return <section><PageHeading title="Đơn hàng" description="Theo dõi trạng thái và đặt lại đơn hàng." /><div className="mb-4 max-w-sm"><input aria-label="Tìm mã đơn hàng" placeholder="Tìm theo mã đơn hàng..." className="bt-input" value={query} onChange={(e) => setQuery(e.target.value)} /></div><Tabs value={tab} onChange={setTab} options={["Tất cả", "Chờ xác nhận", "Đang xử lý", "Đang giao", "Đã giao", "Đã hủy"]} /><div className="mt-4">{filtered.length ? <OrdersTable orders={filtered} /> : <EmptyState icon={<ClipboardList size={35} />} title="Chưa có đơn hàng phù hợp" href="/search" action="Mua hàng" />}</div></section>;
}
export function OrderDetailView({ id, standalone = false }: { id: string; standalone?: boolean }) {
  const orders = useCustomerOrders(); const { ready, add, orders: localOrders } = useCommerce(); const router = useRouter();
  const order = (standalone ? localOrders.filter((o) => !o.customerId) : orders).find((o) => o.id === id);
  if (!ready) return <CommerceLoading />;
  if (!order) return <EmptyState title="Không tìm thấy đơn hàng" href="/account/orders" action="Về danh sách đơn hàng" />;
  const index = order.status === "Chờ xác nhận" ? 0 : order.status === "Đang xử lý" ? 2 : order.status === "Đang giao" ? 3 : order.status === "Đã giao" ? 4 : -1;
  const content = <><PageHeading title={`Đơn hàng ${order.id}`} description={`Ngày đặt: ${dateLabel(order.date)}`}><OrderStatusBadge status={order.status} /></PageHeading><div className="mb-6 border-y border-border py-5"><ol className="grid gap-4 sm:grid-cols-5">{["Tiếp nhận đơn", "Inside Sales xác nhận", "Kho soạn hàng", "Đang giao", "Đã giao"].map((step, i) => <li key={step} className="relative flex items-center gap-3 sm:flex-col sm:text-center"><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${i <= index ? "bg-blue-brand text-white" : "bg-section text-text-muted"}`}>{i < index ? <Check size={15} /> : i + 1}</span><span className={`text-xs ${i <= index ? "font-semibold text-primary" : "text-text-muted"}`}>{step}</span></li>)}</ol></div>{order.b2b && <p className="mb-5 rounded-md bg-section-blue p-3 text-sm text-primary">{order.status === "Chờ xác nhận" ? "Đang chờ Inside Sales xác nhận giá, tồn kho và công nợ trước khi kho soạn hàng." : order.status === "Đã hủy" ? "Đơn hàng đã hủy." : "Inside Sales đã xác nhận đơn hàng."}</p>}<div className="mb-6 grid gap-5 sm:grid-cols-2"><section><h2 className="text-base font-semibold text-primary">Thông tin người nhận</h2><p className="mt-2 text-sm leading-7 text-text-secondary">{order.customer.name}<br />{order.customer.phone}<br />{order.customer.address}, {order.customer.ward}, {order.customer.district}, {order.customer.city}</p></section><section><h2 className="text-base font-semibold text-primary">Giao hàng & thanh toán</h2><p className="mt-2 text-sm leading-7 text-text-secondary">{order.delivery}<br />{order.payment}<br />{order.note || "Không có ghi chú."}</p></section></div><div className="divide-y divide-border border-y border-border">{order.items.map((item) => { const p = findProduct(item.productId); return p && <div key={item.productId} className="flex items-center gap-3 py-4"><img alt="" src={p.image} className="h-16 w-16 shrink-0 rounded bg-section object-contain" /><div className="min-w-0 flex-1"><Link href={`/products/${p.slug}`} className="text-sm font-semibold text-primary">{p.name}</Link><p className="mt-1 text-xs text-text-muted">Mã: {p.code} · SL: {item.quantity}</p></div><strong className="text-sm">{money(item.unitPrice * item.quantity)}</strong></div>; })}</div><div className="ml-auto mt-6 max-w-sm"><OrderTotals subtotal={order.subtotal} shipping={order.shipping} discount={order.discount} total={order.total} /></div><div className="mt-6 flex flex-wrap justify-between gap-3"><Link href="/account/orders" className="bt-button-secondary">Về danh sách đơn hàng</Link><Button onClick={() => { order.items.forEach((item) => { const p = findProduct(item.productId); if (p) add(p, item.quantity); }); router.push("/cart"); }}><RefreshCw size={16} />Đặt lại đơn này</Button></div></>;
  return standalone ? <main className="bt-container bt-page"><Breadcrumb items={[{ label: "Chi tiết đơn hàng" }]} />{content}</main> : <section>{content}</section>;
}

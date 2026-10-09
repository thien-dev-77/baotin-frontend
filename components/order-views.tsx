"use client";

import Image from "next/image";
import { money, mockOrders, Order, OrderStatus } from "@/lib/catalog";
import { useCommerce } from "@/components/commerce-provider";
import { CommerceLoading, OrderTotals } from "@/components/checkout-flow";
import { Breadcrumb, Button, EmptyState, PageHeading, Tabs } from "@/components/ui";
import { Check, ClipboardList, Package, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "@bprogress/next/app";
import { useState } from "react";
import { apiMode } from "@/lib/api-client";
import { OrderDocumentButtons } from "./order-document-buttons";
import { useProductSelection } from "@/lib/use-product-selection";
import { ResourceStatus } from "./admin/admin-resource";

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
  const orders = useCustomerOrders();
  const { ready, products, loadProducts, add, notice, orders: localOrders } = useCommerce();
  const router = useRouter();
  const order = (standalone ? localOrders.filter((o) => !o.customerId) : orders).find((o) => o.id === id);
  const selection = useProductSelection(order?.items.map(line => line.productId) || []);
  const [reordering, setReordering] = useState(false);
  if (!ready) return <CommerceLoading />;
  if (!order) return <EmptyState title="Không tìm thấy đơn hàng" href="/account/orders" action="Về danh sách đơn hàng" />;
  const index = order.status === "Chờ xác nhận" ? 0 : order.status === "Đang xử lý" ? 2 : order.status === "Đang giao" ? 3 : order.status === "Đã giao" ? 4 : -1;
  const productById = new Map(products.map(product => [product.id, product]));
  const lines = order.items.map(item => ({ ...item, product: productById.get(item.productId) }));
  const available = lines.filter(line => line.product && line.product.stock > 0);
  const unavailableCount = lines.length - available.length;
  const reorder = async () => {
    setReordering(true);
    try {
      const current = new Map((await loadProducts(order.items.map(line => line.productId))).map(product => [product.id, product]));
      let added = 0;
      for (const line of order.items) {
        const product = current.get(line.productId);
        if (product && product.stock > 0) { add(product, line.quantity); added++; }
      }
      const skipped = order.items.length - added;
      notice(added ? `Đã cập nhật giỏ hàng theo giá và tồn kho hiện tại.${skipped ? ` ${skipped} sản phẩm chưa thể mua lại và không được thêm.` : ""}` : "Các sản phẩm trong đơn hiện chưa thể mua lại.");
      if (added) router.push("/cart");
    } catch (error) { notice(error instanceof Error ? error.message : "Không thể đặt lại đơn."); }
    finally { setReordering(false); }
  };
  const content = (
    <>
      <PageHeading title={`Đơn hàng ${order.id}`} description={`Ngày đặt: ${dateLabel(order.date)}`}><OrderStatusBadge status={order.status} /></PageHeading>
      <div className="mb-6 border-y border-border py-5">
        <ol className="grid gap-4 sm:grid-cols-5">
          {["Tiếp nhận đơn", "Inside Sales xác nhận", "Kho soạn hàng", "Đang giao", "Đã giao"].map((step, i) => (
            <li key={step} className="relative flex items-center gap-3 sm:flex-col sm:text-center">
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${i <= index ? "bg-blue-brand text-white" : "bg-section text-text-muted"}`}>{i < index ? <Check size={15} /> : i + 1}</span>
              <span className={`text-xs ${i <= index ? "font-semibold text-primary" : "text-text-muted"}`}>{step}</span>
            </li>
          ))}
        </ol>
      </div>
      {order.b2b && <p className="mb-5 rounded-md bg-section-blue p-3 text-sm text-primary">{order.status === "Chờ xác nhận" ? "Đang chờ Inside Sales xác nhận giá, tồn kho và công nợ trước khi kho soạn hàng." : order.status === "Đã hủy" ? "Đơn hàng đã hủy." : "Inside Sales đã xác nhận đơn hàng."}</p>}
      <div className="mb-6 grid gap-5 sm:grid-cols-2">
        <section>
          <h2 className="text-base font-semibold text-primary">Thông tin người nhận</h2>
          <p className="mt-2 text-sm leading-7 text-text-secondary">{order.customer.name}<br />{order.customer.phone}<br />{order.customer.address}, {order.customer.ward}, {order.customer.district}, {order.customer.city}</p>
        </section>
        <section>
          <h2 className="text-base font-semibold text-primary">Giao hàng & thanh toán</h2>
          <p className="mt-2 text-sm leading-7 text-text-secondary">{order.delivery}<br />{order.payment}<br />{order.note || "Không có ghi chú."}</p>
        </section>
      </div>
      <ResourceStatus {...selection} />
      <section aria-label="Sản phẩm trong đơn hàng" className="divide-y divide-border border-y border-border">
        {lines.map(({ product, ...line }) => {
          const display = line.snapshot || product;
          return (
          <div key={line.productId} className="flex items-center gap-3 py-4">
            {display?.image ? <Image alt="" src={display.image} className="h-16 w-16 shrink-0 rounded bg-section object-contain" quality={85} width={64} height={64} sizes="64px" data-image-src={display.image} /> : <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded bg-section text-text-muted"><Package size={24} aria-hidden="true" /></span>}
            <div className="min-w-0 flex-1">
              {product ? <Link href={`/products/${product.slug}`} className="break-words text-sm font-semibold text-primary">{display?.name}</Link> : <p className="break-words text-sm font-semibold text-primary">{display?.name || `Sản phẩm ${line.productId}`}</p>}
              <p className="mt-1 break-words text-xs text-text-muted">Mã: {display?.code || line.productId} · SL: {line.quantity} {display?.unit}</p>
              {(!product || !product.stock) && <p className="mt-1 text-xs text-text-secondary">Hiện chưa thể mua lại.</p>}
            </div>
            <strong className="max-w-[40%] break-words text-right text-sm">{money(line.unitPrice * line.quantity)}</strong>
          </div>
        ); })}
      </section>
      {!selection.loading && !selection.error && unavailableCount > 0 && <p role="status" className="mt-3 text-sm text-text-secondary">{unavailableCount} sản phẩm không có trong danh mục hiện tại hoặc đã hết hàng. Các dòng này vẫn được giữ trong đơn cũ.</p>}
      <div className="ml-auto mt-6 max-w-sm"><OrderTotals subtotal={order.subtotal} shipping={order.shipping} discount={order.discount} total={order.total} /></div>
      <div className="mt-6 flex flex-wrap justify-between gap-3">
        <Link href="/account/orders" className="bt-button-secondary">Về danh sách đơn hàng</Link>
        <Button loading={reordering || selection.loading} disabled={!available.length || !!selection.error} onClick={() => void reorder()}><RefreshCw size={16} />Đặt lại đơn này</Button>
      </div>
    </>
  );
  return standalone ? <main className="bt-container bt-page"><Breadcrumb items={[{ label: "Chi tiết đơn hàng" }]} /><OrderDocumentButtons id={order.id} />{content}</main> : <section><OrderDocumentButtons id={order.id} />{content}</section>;
}

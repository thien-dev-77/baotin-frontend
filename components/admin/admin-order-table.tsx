"use client";

import { Eye } from "lucide-react";
import { AdminStatus, AdminTable } from "@/components/admin/admin-ui";
import { adminDate, type AdminOrder } from "@/lib/admin-preview";
import { money } from "@/lib/catalog";

export function AdminOrderTable({ orders, onSelect }: { orders: AdminOrder[]; onSelect: (id: string) => void }) {
  return <AdminTable headings={["Mã đơn / ngày", "Khách hàng", "Kênh", "Giá trị", "Trạng thái", "Thao tác"]} empty={!orders.length}>
    {orders.map((order) => <tr key={order.id}>
      <td><button type="button" onClick={() => onSelect(order.id)} className="font-semibold text-blue-brand hover:underline">{order.id}</button><span className="mt-1 block text-xs text-text-muted">{adminDate(order.date)}</span></td>
      <td><span className="font-medium text-primary">{order.customerName}</span><span className="mt-1 block text-xs text-text-muted">{order.items.reduce((sum, item) => sum + item.quantity, 0)} sản phẩm · {order.source}</span></td>
      <td><AdminStatus value={order.channel} /></td>
      <td className="whitespace-nowrap font-semibold tabular-nums text-primary">{money(order.total)}</td>
      <td><AdminStatus value={order.status} /></td>
      <td><button type="button" onClick={() => onSelect(order.id)} title="Chi tiết đơn hàng" aria-label={`Xem đơn ${order.id}`} className="bt-icon-button"><Eye size={17} /></button></td>
    </tr>)}
  </AdminTable>;
}

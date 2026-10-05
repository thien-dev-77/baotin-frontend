"use client";

import Link from "next/link";
import { useAdmin } from "@/components/admin/admin-provider";
import { type AdminOrder } from "@/lib/admin-preview";
import { hasShortage, isPicked, isWarehouseOrder } from "@/lib/admin-warehouse";
import { money } from "@/lib/catalog";

export function AdminOrderItems({ order, showPrices = true }: { order: AdminOrder; showPrices?: boolean }) {
  const { products, warehouse, setPicked } = useAdmin();
  const record = warehouse[order.id];
  const picking = isWarehouseOrder(order);
  const editable = order.status === "Đang soạn" || (picking && hasShortage(record));

  return <ul className="divide-y divide-border border-y border-border">
    {order.items.map((line) => {
      const product = products.find((item) => item.id === line.productId);
      return <li key={line.productId} className="flex items-start gap-3 py-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={product?.image} alt={product?.name || line.productId} width={56} height={56} className="h-14 w-14 shrink-0 rounded border border-border object-cover" />
        <div className="min-w-0 flex-1">
          <Link href={`/products/${product?.slug}`} className="text-sm font-medium text-primary hover:text-blue-brand">{product?.name || line.productId}</Link>
          <p className="mt-1 break-words text-xs text-text-muted">{line.productId} · Tồn mẫu: {product?.stock || 0}</p>
          <p className="mt-1 text-xs">{showPrices ? `${line.quantity} × ${money(line.unitPrice)}` : `Cần soạn: ${line.quantity} ${product?.unit || "sản phẩm"}`}</p>
          {picking && <label className="mt-2 flex items-center gap-2 text-xs font-medium text-primary"><input type="checkbox" aria-label={`Đã soạn ${line.productId}`} checked={isPicked(order, record, line.productId)} disabled={!editable} onChange={(event) => setPicked(order.id, line.productId, event.target.checked)} className="h-4 w-4 shrink-0 accent-blue-brand" />Đã kiểm đủ {line.quantity} {product?.unit || "sản phẩm"}</label>}
        </div>
        {showPrices && <span className="shrink-0 text-xs font-semibold tabular-nums text-primary">{money(line.quantity * line.unitPrice)}</span>}
      </li>;
    })}
  </ul>;
}

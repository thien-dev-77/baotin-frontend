"use client";

import type { AdminApproval } from "@/lib/admin-preview";
import { money, type Product } from "@/lib/catalog";

export function AdminApprovalSnapshot({ approval, products }: { approval: AdminApproval; products: Product[] }) {
  const snapshot = approval.snapshot;
  if (!snapshot) return null;
  return <section aria-label="Dữ liệu đề nghị" className="mt-5 border-b border-border pb-5">
    <h3 className="mb-3 text-sm font-semibold text-primary">{snapshot.kind === "price" ? "Giá đề nghị theo SKU" : "Ngoại lệ công nợ cho đơn"}</h3>
    {snapshot.kind === "price" ? <>
      <ul className="divide-y divide-border">{snapshot.lines.map((line) => {
        const product = products.find((item) => item.id === line.productId);
        return <li key={line.productId} className="py-3"><div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {product && <img src={product.image} alt={product.name} width={40} height={40} className="h-10 w-10 shrink-0 rounded object-contain" />}
          <div className="min-w-0"><p className="text-sm font-medium leading-5 text-primary">{product?.name || line.productId}</p><p className="mt-1 text-xs text-text-muted">{product?.code || line.productId} · {line.quantity} {product?.unit}</p></div></div>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-xs text-text-secondary">Giá hiện tại</dt><dd className="mt-1 tabular-nums">{money(line.unitPrice)}</dd></div><div><dt className="text-xs text-text-secondary">Giá đề nghị</dt><dd className="mt-1 font-semibold tabular-nums text-blue-brand">{money(line.requestedPrice)}</dd></div></dl>
        </li>;
      })}</ul><dl className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-4 text-sm"><div><dt className="text-xs text-text-secondary">Giá trị ban đầu</dt><dd className="mt-1 tabular-nums">{money(snapshot.total)}</dd></div><div><dt className="text-xs text-text-secondary">Giá trị đề nghị</dt><dd className="mt-1 font-semibold tabular-nums text-blue-brand">{money(snapshot.requestedTotal)}</dd></div></dl>
    </> : <dl className="grid grid-cols-2 gap-4 text-sm">{[["Giá trị đề nghị", snapshot.amount], ["Hạn mức tại lúc gửi", snapshot.limit], ["Công nợ tại lúc gửi", snapshot.debt], ["Khoản quá hạn", snapshot.overdue], ["Công nợ + đơn này", snapshot.debt + snapshot.amount], ["Phần vượt hạn mức", Math.max(0, snapshot.debt + snapshot.amount - snapshot.limit)]].map(([label, value]) => <div key={label}><dt className="text-xs leading-5 text-text-secondary">{label}</dt><dd className="mt-1 break-words font-semibold tabular-nums text-primary">{money(Number(value))}</dd></div>)}</dl>}
  </section>;
}

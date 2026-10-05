"use client";

import { useState } from "react";
import { Check, Plus } from "lucide-react";
import { Button, Modal } from "@/components/ui";
import { AdminPagination, AdminSearch } from "@/components/admin/admin-ui";
import { categoryCatalog, money, normalize, type Product } from "@/lib/catalog";
import { salesUnitPrice } from "@/lib/admin-sales";
import type { AdminCustomer } from "@/lib/admin-preview";

export function AdminSalesProducts({ open, onClose, products, customer, selected, onAdd }: { open: boolean; onClose: () => void; products: Product[]; customer?: AdminCustomer; selected: string[]; onAdd: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(1);
  const rows = products.filter((item) => (category === "all" || item.category === category) && normalize(`${item.name} ${item.code} ${item.brand}`).includes(normalize(query)));
  const current = Math.min(page, Math.max(1, Math.ceil(rows.length / 10)));
  return <Modal open={open} onClose={onClose} title="Thêm sản phẩm">
    <div onKeyDownCapture={(event) => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onClose(); } }}>
    <div className="mb-3 flex flex-wrap gap-2"><AdminSearch value={query} onChange={(value) => { setQuery(value); setPage(1); }} placeholder="Tìm tên, SKU, thương hiệu..." /><select aria-label="Danh mục chọn sản phẩm" className="bt-input" value={category} onChange={(event) => { setCategory(event.target.value); setPage(1); }}><option value="all">Tất cả danh mục</option>{categoryCatalog.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}</select></div>
    <ul className="divide-y divide-border">
      {rows.slice((current - 1) * 10, current * 10).map((product) => <li key={product.id} className="flex items-center gap-3 py-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={product.image} alt={product.name} width={48} height={48} className="h-12 w-12 shrink-0 rounded object-contain" />
        <div className="min-w-0 flex-1"><p className="text-sm font-medium leading-5 text-primary">{product.name}</p><p className="mt-1 text-xs text-text-muted">{product.code} · Tồn {product.stock} {product.unit}</p><p className="mt-1 text-xs font-semibold text-blue-brand">{money(salesUnitPrice(product, customer))}/{product.unit}</p></div>
        <button type="button" className="bt-icon-button shrink-0 !border !border-border" aria-label={`Thêm ${product.code}`} title={selected.includes(product.id) ? "Đã thêm" : `Thêm ${product.code}`} disabled={selected.includes(product.id)} onClick={() => onAdd(product.id)}>{selected.includes(product.id) ? <Check size={18} /> : <Plus size={18} />}</button>
      </li>)}
    </ul>
    {!rows.length && <p className="py-10 text-center text-sm text-text-muted">Không tìm thấy sản phẩm.</p>}
    <AdminPagination count={rows.length} page={current} onChange={setPage} />
    <div className="mt-4 flex justify-end border-t border-border pt-4"><Button onClick={onClose}><Check size={16} />Xong ({selected.length})</Button></div>
    </div>
  </Modal>;
}

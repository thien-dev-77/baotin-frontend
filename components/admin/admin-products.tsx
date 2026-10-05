"use client";

import Link from "next/link";
import { useState } from "react";
import { Download, ExternalLink, Pencil, Save } from "lucide-react";
import { Button, Modal } from "@/components/ui";
import { useAdmin } from "@/components/admin/admin-provider";
import { AdminHeading, AdminPagination, AdminSearch, AdminStatus, AdminTable, useAdminFilters } from "@/components/admin/admin-ui";
import { downloadAdminCsv } from "@/lib/admin-preview";
import { categoryCatalog, money, normalize, type Product } from "@/lib/catalog";
import { apiMode } from "@/lib/api-client";
import { ProductImageUpload } from "./product-image-upload";

function ProductEditor({ product, onSave }: { product: Product & { published: boolean }; onSave: (value: boolean) => Promise<void> }) {
  const [published, setPublished] = useState(product.published);
  return <form onSubmit={async (event) => { event.preventDefault(); await onSave(published); }}>
    <div className="mb-5 flex items-start gap-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={product.image} alt={product.name} width={96} height={96} className="h-24 w-24 shrink-0 rounded-md border border-border object-cover" />
      <div className="min-w-0"><p className="text-xs text-text-muted">{product.code} · {product.brand}</p><h3 className="mt-1 text-base font-semibold text-primary">{product.name}</h3><p className="mt-2 text-sm font-medium text-blue-brand">{money(product.price)}/{product.unit}</p></div>
    </div>
    {apiMode && <ProductImageUpload productId={product.id} />}
    <dl className="mb-5 grid grid-cols-2 gap-4 border-y border-border py-4 text-sm"><div><dt className="text-xs text-text-muted">Danh mục</dt><dd className="mt-1">{categoryCatalog.find((item) => item.slug === product.category)?.name}</dd></div><div><dt className="text-xs text-text-muted">Tồn kho mẫu</dt><dd className="mt-1">{product.stock} {product.unit}</dd></div><div className="col-span-2"><dt className="text-xs text-text-muted">Quy cách</dt><dd className="mt-1">{product.specification}</dd></div></dl>
    <label className="flex items-center gap-3 text-sm font-medium text-primary"><input type="checkbox" checked={published} onChange={(event) => setPublished(event.target.checked)} className="h-4 w-4 accent-blue-brand" />Đang bán trên website</label>
    <div className="mt-6 flex flex-wrap justify-between gap-3 border-t border-border pt-4"><Link href={`/products/${product.slug}`} className="bt-button-secondary"><ExternalLink size={16} />Xem sản phẩm</Link><Button type="submit" disabled={published === product.published}><Save size={16} />Lưu trạng thái</Button></div>
  </form>;
}

export function AdminProducts() {
  const { products, setPublished } = useAdmin();
  const filters = useAdminFilters();
  const [category, setCategory] = useState("all");
  const [selected, setSelected] = useState<string | null>(null);
  const product = products.find((item) => item.id === selected);
  const rows = products.filter((item) => normalize(`${item.name} ${item.code} ${item.brand}`).includes(normalize(filters.query)) && (category === "all" || item.category === category) && (filters.filter === "all" || (filters.filter === "published" ? item.published : !item.published)));
  const page = Math.min(filters.page, Math.max(1, Math.ceil(rows.length / 10)));
  function exportRows() {
    downloadAdminCsv("bao-tin-san-pham-mau.csv", [["Mã hàng", "Tên sản phẩm", "Thương hiệu", "Giá bán lẻ", "Tồn kho mẫu", "Trạng thái"], ...rows.map((item) => [item.code, item.name, item.brand, item.price, item.stock, item.published ? "Đang bán" : "Đang ẩn"])]);
  }
  return <>
    <AdminHeading title="Sản phẩm" subtitle={`Danh mục website · ${products.length} sản phẩm`}><Button variant="secondary" onClick={exportRows} disabled={!rows.length}><Download size={16} />Xuất CSV</Button></AdminHeading>
    <div className="mb-4 flex flex-wrap gap-3"><AdminSearch value={filters.query} onChange={filters.setQuery} placeholder="Tìm sản phẩm, mã hàng, thương hiệu..." /><select aria-label="Danh mục sản phẩm" value={category} onChange={(event) => { setCategory(event.target.value); filters.setPage(1); }} className="bt-input !w-auto"><option value="all">Tất cả danh mục</option>{categoryCatalog.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}</select><select aria-label="Trạng thái sản phẩm" value={filters.filter} onChange={(event) => filters.setFilter(event.target.value)} className="bt-input !w-auto"><option value="all">Tất cả trạng thái</option><option value="published">Đang bán</option><option value="hidden">Đang ẩn</option></select></div>
    <AdminTable headings={["Sản phẩm", "Danh mục", "Giá bán lẻ", "Tồn mẫu", "Trạng thái", "Thao tác"]} empty={!rows.length}>
      {rows.slice((page - 1) * 10, page * 10).map((item) => <tr key={item.id}>
        <td><div className="flex min-w-[240px] items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.image} alt={item.name} width={44} height={44} className="h-11 w-11 shrink-0 rounded border border-border object-cover" loading="lazy" />
          <div><button type="button" onClick={() => setSelected(item.id)} className="text-left font-medium text-primary hover:text-blue-brand">{item.name}</button><span className="mt-1 block text-xs text-text-muted">{item.code} · {item.brand}</span></div>
        </div></td>
        <td>{categoryCatalog.find((category) => category.slug === item.category)?.name}</td><td className="whitespace-nowrap tabular-nums">{money(item.price)}<span className="ml-1 text-xs text-text-muted">/{item.unit}</span></td><td><span className={item.stock === 0 ? "font-semibold text-danger" : "tabular-nums"}>{item.stock}</span></td><td><AdminStatus value={item.published ? "Đang bán" : "Đang ẩn"} /></td><td><button type="button" title="Trạng thái sản phẩm" aria-label={`Sửa sản phẩm ${item.code}`} className="bt-icon-button" onClick={() => setSelected(item.id)}><Pencil size={16} /></button></td>
      </tr>)}
    </AdminTable>
    <AdminPagination count={rows.length} page={page} onChange={filters.setPage} />
    <Modal open={!!product} onClose={() => setSelected(null)} title="Trạng thái sản phẩm">{product && <ProductEditor key={product.id} product={product} onSave={async (value) => { const error = await setPublished(product.id, value); if (!error) setSelected(null); }} />}</Modal>
  </>;
}

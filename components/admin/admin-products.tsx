"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Download, FolderTree, ImageIcon, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui";
import { useCommerce } from "@/components/commerce-provider";
import { useAdmin } from "./admin-provider";
import { AdminHeading, AdminPagination, AdminSearch, AdminStatus, AdminTable, useAdminFilters } from "./admin-ui";
import { downloadAdminCsv } from "@/lib/admin-preview";
import { categoryCatalog, money, normalize } from "@/lib/catalog";
import { apiMode } from "@/lib/api-client";

export function AdminProducts() {
  const { products, categories: apiCategories } = useAdmin();
  const { sessionUser } = useCommerce();
  const canEdit = !apiMode || ["admin", "boss", "sales"].includes(sessionUser?.role || "");
  const categories = apiCategories || categoryCatalog;
  const filters = useAdminFilters();
  const [category, setCategory] = useState("all");
  const rows = products.filter(item => normalize(`${item.name} ${item.code} ${item.brand}`).includes(normalize(filters.query)) && (category === "all" || item.category === category) && (filters.filter === "all" || (filters.filter === "published" ? item.published : !item.published)));
  const page = Math.min(filters.page, Math.max(1, Math.ceil(rows.length / 10)));
  const exportRows = () => downloadAdminCsv("bao-tin-san-pham.csv", [["Mã hàng", "Tên sản phẩm", "Thương hiệu", "Giá bán lẻ", "Tồn khả dụng", "Hiển thị"], ...rows.map(item => [item.code, item.name, item.brand, item.price, item.stock, item.published ? "Công khai" : "Riêng tư"])]);
  return <>
    <AdminHeading title="Sản phẩm" subtitle={`Danh mục website · ${products.length} sản phẩm`}>
      <div className="flex flex-wrap gap-2"><Link href="/admin/categories" className="bt-button-secondary"><FolderTree size={16} />Danh mục</Link><Button variant="secondary" onClick={exportRows} disabled={!rows.length}><Download size={16} />Xuất CSV</Button>{canEdit && <Link href="/admin/products/new" className="bt-button-primary"><Plus size={17} />Thêm sản phẩm</Link>}</div>
    </AdminHeading>
    <div className="mb-4 flex flex-wrap gap-3">
      <AdminSearch value={filters.query} onChange={filters.setQuery} placeholder="Tìm sản phẩm, mã hàng, thương hiệu..." />
      <select aria-label="Danh mục sản phẩm" value={category} onChange={event => { setCategory(event.target.value); filters.setPage(1); }} className="bt-input !w-auto max-w-full"><option value="all">Tất cả danh mục</option>{categories.map(item => <option key={item.slug} value={item.slug}>{item.name}</option>)}</select>
      <select aria-label="Trạng thái sản phẩm" value={filters.filter} onChange={event => filters.setFilter(event.target.value)} className="bt-input !w-auto max-w-full"><option value="all">Tất cả trạng thái</option><option value="published">Công khai</option><option value="hidden">Riêng tư</option></select>
    </div>
    <AdminTable headings={["Sản phẩm", "Danh mục", "Giá bán lẻ", "Tồn khả dụng", "Hiển thị", "Thao tác"]} empty={!rows.length}>
      {rows.slice((page - 1) * 10, page * 10).map(item => <tr key={item.id}>
        <td><div className="flex min-w-[240px] items-center gap-3">
          {item.image ? <Image src={item.image} alt={item.name} width={44} height={44} className="h-11 w-11 shrink-0 rounded border border-border object-cover" loading="lazy" quality={85} sizes="44px" data-image-src={item.image} /> : <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded border border-border bg-section text-text-muted"><ImageIcon size={18} /></span>}
          <div>{canEdit ? <Link href={`/admin/products/${encodeURIComponent(item.id)}/edit`} className="font-medium text-primary hover:text-blue-brand">{item.name}</Link> : <span className="font-medium text-primary">{item.name}</span>}<span className="mt-1 block text-xs text-text-muted">{item.code} · {item.brand}</span></div>
        </div></td>
        <td>{categories.find(category => category.slug === item.category)?.name}</td>
        <td className="whitespace-nowrap tabular-nums">{money(item.price)}<span className="ml-1 text-xs text-text-muted">/{item.unit}</span></td>
        <td><span className={item.stock === 0 ? "font-semibold text-danger" : "tabular-nums"}>{item.stock}</span></td>
        <td><AdminStatus value={item.published ? "Công khai" : "Riêng tư"} /></td>
        <td>{canEdit && <Link href={`/admin/products/${encodeURIComponent(item.id)}/edit`} title="Sửa sản phẩm" aria-label={`Sửa sản phẩm ${item.code}`} className="bt-icon-button"><Pencil size={16} /></Link>}</td>
      </tr>)}
    </AdminTable>
    <AdminPagination count={rows.length} page={page} onChange={filters.setPage} />
  </>;
}

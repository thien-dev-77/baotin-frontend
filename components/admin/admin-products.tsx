"use client";

import { ProductImage as Image } from "@/components/product-image";
import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Download, FolderTree, ImageIcon, Pencil, Plus, X } from "lucide-react";
import { Button, Field } from "@/components/ui";
import { useCommerce } from "@/components/commerce-provider";
import { useAdmin } from "./admin-provider";
import { AdminHeading, AdminPagination, AdminSearch, AdminStatus, AdminTable, useAdminFilters } from "./admin-ui";
import { downloadAdminCsv } from "@/lib/admin-preview";
import { categoryCatalog, getCatalogBrands, money, normalize } from "@/lib/catalog";
import { categoryDescendants, categoryLabel } from "@/lib/category-tree";
import { api, apiMode } from "@/lib/api-client";
import { CatalogTemplateDownload } from "./catalog-template-download";
import { useAdminBrowse, type AdminBrowseState } from "@/lib/admin-browse";
import { AdminReadModel } from "./admin-read-model";
import { ResourceStatus } from "./admin-resource";
import { useAdminExport } from "@/lib/admin-export";
import { productPrices, formatDiscount } from "@/lib/product-pricing";
import { ProductBulkActions, ProductSelectionCheckbox, MAX_BULK_PRODUCTS, type SelectedProduct } from "./product-bulk-actions";

export function AdminProducts() {
  const browse = useAdminBrowse("products");
  return <AdminReadModel data={browse.data}><ProductsList browse={browse} /></AdminReadModel>;
}
function ProductsList({ browse }: { browse: AdminBrowseState }) {
  const { products, categories: apiCategories, branch, readCache } = useAdmin();
  const { sessionUser, notice, reloadCatalog } = useCommerce();
  const search = useSearchParams().toString();
  const returnTo = encodeURIComponent(`/admin/products${search ? `?${search}` : ""}`);
  const exporting = useAdminExport("products");
  const canEdit = !apiMode || ["admin", "boss", "sales"].includes(sessionUser?.role || "");
  const showPrices = !apiMode || sessionUser?.role !== "warehouse";
  const categories = apiCategories || categoryCatalog;
  const previewFilters = useAdminFilters();
  const [previewCategory, setPreviewCategory] = useState("all");
  const [previewSubcategory, setPreviewSubcategory] = useState("all");
  const [previewBrand, setPreviewBrand] = useState("all");
  const [bulkBusy, setBulkBusy] = useState(false);
  const selectionBusy = bulkBusy || browse.loading || browse.query.trim() !== (new URLSearchParams(search).get("q") || "");
  const selectionScope = JSON.stringify([sessionUser?.id, branch, browse.query, browse.category, browse.subcategory, browse.brand, browse.filter]);
  const [selection, setSelection] = useState<{ scope: string; items: SelectedProduct[] }>({ scope: selectionScope, items: [] });
  const selected = selection.scope === selectionScope ? selection.items : [];
  const select = (items: SelectedProduct[]) => setSelection({ scope: selectionScope, items });
  const filters = apiMode ? browse : previewFilters;
  const category = apiMode ? browse.category : previewCategory;
  const subcategory = apiMode ? browse.subcategory : previewSubcategory;
  const brand = apiMode ? browse.brand : previewBrand;
  const brands = apiMode ? browse.data?.brands || [] : getCatalogBrands(products);
  const setCategory = (value: string) => {
    if (apiMode) { browse.set({ category: value, subcategory: undefined }); return; }
    setPreviewCategory(value); setPreviewSubcategory("all"); previewFilters.setPage(1);
  };
  const categoryScope = new Set(categoryDescendants(categories, category));
  const subcategories = Array.from(new Set(categories.filter(item => category === "all" || categoryScope.has(item.slug)).flatMap(item => item.subcategories))).sort((left, right) => left.localeCompare(right, "vi"));
  const rows = apiMode ? products : products.filter(item => normalize(`${item.name} ${item.code} ${item.alternateCode || ""} ${item.brand}`).includes(normalize(filters.query)) && (category === "all" || categoryScope.has(item.category)) && (subcategory === "all" || item.subcategory === subcategory) && (brand === "all" || item.brand.trim().normalize("NFC").toLocaleLowerCase("vi") === brand.trim().normalize("NFC").toLocaleLowerCase("vi")) && (filters.filter === "all" || (filters.filter === "published" ? item.published : !item.published)));
  const clearFilters = () => {
    if (apiMode) { browse.setQuery(""); browse.set({ q: undefined, category: undefined, subcategory: undefined, brand: undefined, status: undefined }); return; }
    previewFilters.setQuery(""); previewFilters.setFilter("all"); previewFilters.setPage(1); setPreviewCategory("all"); setPreviewSubcategory("all"); setPreviewBrand("all");
  };
  const count = apiMode ? browse.data?.pagination.total || 0 : rows.length;
  const page = apiMode ? browse.data?.pagination.page || browse.page : Math.min(filters.page, Math.max(1, Math.ceil(rows.length / 10)));
  const visibleRows = apiMode ? rows : rows.slice((page - 1) * 10, page * 10);
  const selectedIds = new Set(selected.map(item => item.id));
  const checkedCount = visibleRows.filter(item => selectedIds.has(item.id)).length;
  const toggle = (item: typeof rows[number]) => {
    if (selectedIds.has(item.id)) { select(selected.filter(row => row.id !== item.id)); return; }
    if (selected.length >= MAX_BULK_PRODUCTS || !item.revision) return;
    select([...selected, { id: item.id, code: item.code, revision: item.revision }]);
  };
  const togglePage = () => {
    if (checkedCount === visibleRows.length) { const ids = new Set(visibleRows.map(row => row.id)); select(selected.filter(item => !ids.has(item.id))); return; }
    select([...selected, ...visibleRows.filter(item => !selectedIds.has(item.id) && item.revision).map(item => ({ id: item.id, code: item.code, revision: item.revision! }))].slice(0, MAX_BULK_PRODUCTS));
  };
  const selectAll = async () => {
    const params = new URLSearchParams(search);
    params.set("branch", branch); params.set("resource", "products"); params.delete("page"); params.delete("pageSize");
    const result = await api<{ products: SelectedProduct[]; count: number }>(`/admin/products/selection?${params}`);
    if (!Array.isArray(result.products) || result.products.length > MAX_BULK_PRODUCTS || result.products.some(item => !item.id || !item.code || !Number.isSafeInteger(item.revision) || item.revision < 1)) throw new Error("Danh sách lựa chọn không hợp lệ. Hãy làm mới và thử lại.");
    select(result.products);
  };
  const exportRows = (items = rows) => downloadAdminCsv("bao-tin-san-pham.csv", [["Mã hàng", "Tên sản phẩm", "Thương hiệu", ...(showPrices ? ["Giá niêm yết (VNĐ)", "Chiết khấu B2C (%)", "Giá sau CK B2C (VNĐ)", "Chiết khấu B2B (%)", "Giá sau CK B2B (VNĐ)"] : []), "Tồn khả dụng", "Hiển thị"], ...items.map(item => {
    const prices = productPrices(item);
    return [item.code, item.name, item.brand, ...(showPrices ? [prices.listPrice, prices.b2cDiscount, prices.b2cPrice, prices.b2bDiscount ?? "", prices.b2bPrice ?? ""] : []), item.stock, item.published ? "Công khai" : "Riêng tư"];
  })]);
  return <>
    <AdminHeading title="Sản phẩm" subtitle={`Danh mục website · ${count} sản phẩm`}>
      <div className="flex flex-wrap gap-2"><Link href="/admin/categories" className="bt-button-secondary"><FolderTree size={16} />Danh mục</Link><CatalogTemplateDownload /><Button variant="secondary" loading={exporting.loading} onClick={() => apiMode ? void exporting.run(pages => exportRows(pages.flatMap(page => page.products || []))) : exportRows()} disabled={!rows.length}><Download size={16} />Xuất CSV</Button>{canEdit && <Link href={`/admin/products/new?returnTo=${returnTo}`} className="bt-button-primary"><Plus size={17} />Thêm sản phẩm</Link>}</div>
    </AdminHeading>
    <fieldset disabled={bulkBusy} className="mb-4 flex min-w-0 flex-wrap items-end gap-3 rounded-md border border-border bg-white p-4">
      <legend className="px-2 text-sm font-semibold text-primary">Tìm kiếm & lọc sản phẩm</legend>
      <AdminSearch value={filters.query} onChange={filters.setQuery} placeholder="Tìm sản phẩm, mã hàng, thương hiệu..." />
      <Field label="Thương hiệu" htmlFor="admin-products-brand"><select id="admin-products-brand" aria-label="Thương hiệu sản phẩm" value={brand} disabled={apiMode && !browse.data && browse.loading} onChange={event => { if (apiMode) browse.set({ brand: event.target.value }); else { setPreviewBrand(event.target.value); previewFilters.setPage(1); } }} className="bt-input !w-auto max-w-full"><option value="all">Tất cả thương hiệu</option>{brand !== "all" && !brands.includes(brand) && <option value={brand}>{brand}</option>}{brands.map(name => <option key={name} value={name}>{name}</option>)}</select></Field>
      <Field label="Danh mục" htmlFor="admin-products-category"><select id="admin-products-category" aria-label="Danh mục sản phẩm" value={category} onChange={event => setCategory(event.target.value)} className="bt-input !w-auto max-w-full"><option value="all">Tất cả danh mục</option>{categories.map(item => <option key={item.slug} value={item.slug}>{categoryLabel(categories, item.slug) || item.name}</option>)}</select></Field>
      <Field label="Nhóm sản phẩm" htmlFor="admin-products-subcategory"><select id="admin-products-subcategory" aria-label="Nhóm sản phẩm" value={subcategory} onChange={event => { if (apiMode) browse.set({ subcategory: event.target.value }); else { setPreviewSubcategory(event.target.value); previewFilters.setPage(1); } }} className="bt-input !w-auto max-w-full"><option value="all">Tất cả nhóm</option>{subcategories.map(name => <option key={name} value={name}>{name}</option>)}</select></Field>
      <Field label="Hiển thị" htmlFor="admin-products-status"><select id="admin-products-status" aria-label="Trạng thái sản phẩm" value={filters.filter} onChange={event => filters.setFilter(event.target.value)} className="bt-input !w-auto max-w-full"><option value="all">Tất cả trạng thái</option><option value="published">Công khai</option><option value="hidden">Riêng tư</option></select></Field>
      {(filters.query || brand !== "all" || category !== "all" || subcategory !== "all" || filters.filter !== "all") && <Button variant="secondary" type="button" onClick={clearFilters}><X size={16} />Xóa bộ lọc</Button>}
    </fieldset>
    {apiMode && <ResourceStatus {...browse} />}
    {canEdit && apiMode && <ProductBulkActions selected={selected} total={count} busy={selectionBusy} setBusy={setBulkBusy} clear={() => select([])} selectAll={selectAll} onUpdated={async result => {
      const message = result.action === "publish" ? result.updated > 0 ? `Đã công khai ${result.updated} sản phẩm.` : "Chưa công khai sản phẩm nào." : `Đã cập nhật ${result.updated} sản phẩm.`;
      notice(`${message}${result.skipped?.length ? ` Bỏ qua ${result.skipped.length} sản phẩm cần bổ sung.` : ""}${result.hiddenCategories.length ? ` ${result.hiddenCategories.length} danh mục vẫn đang ẩn.` : ""}`);
      if (!result.updated) return;
      if (readCache) await readCache.refresh(path => path.startsWith("/admin/products") || path.startsWith("/admin/dashboard") || path.startsWith("/admin/browse?") && new URLSearchParams(path.split("?")[1]).get("resource") === "products");
      else await browse.reload();
      void reloadCatalog().catch(() => notice("Đã lưu sản phẩm. Chưa thể làm mới catalog, hãy thử lại."));
    }} />}
    <AdminTable className={`bt-admin-products-table${canEdit && apiMode ? " bt-admin-products-selectable" : ""}`} headings={[...(canEdit && apiMode ? [<ProductSelectionCheckbox key="selection" aria-label="Chọn tất cả sản phẩm trên trang" checked={Boolean(visibleRows.length && checkedCount === visibleRows.length)} mixed={checkedCount > 0 && checkedCount < visibleRows.length} disabled={selectionBusy || !visibleRows.length} onChange={togglePage} />] : []), "Sản phẩm", "Danh mục", ...(showPrices ? ["Giá niêm yết (VNĐ)", "Chiết khấu B2C (%)", "Giá sau CK B2C (VNĐ)", "Chiết khấu B2B (%)", "Giá sau CK B2B (VNĐ)"] : []), "Tồn khả dụng", "Hiển thị", "Thao tác"]} empty={!rows.length} loading={apiMode && !browse.data && browse.loading}>
      {visibleRows.map(item => {
        const prices = productPrices(item);
        return <tr key={item.id}>
        {canEdit && apiMode && <td className="!w-12"><ProductSelectionCheckbox aria-label={`Chọn sản phẩm ${item.code}`} checked={selectedIds.has(item.id)} disabled={selectionBusy || !item.revision || !selectedIds.has(item.id) && selected.length >= MAX_BULK_PRODUCTS} onChange={() => toggle(item)} /></td>}
        <td><div className="flex min-w-[240px] items-center gap-3">
          {item.image ? <Image src={item.image} alt={item.name} width={44} height={44} className="h-11 w-11 shrink-0 rounded border border-border object-cover" loading="lazy" quality={85} sizes="44px" data-image-src={item.image} /> : <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded border border-border bg-section text-text-muted"><ImageIcon size={18} /></span>}
          <div>{canEdit ? <Link href={`/admin/products/${encodeURIComponent(item.id)}/edit?returnTo=${returnTo}`} prefetch={false} className="font-medium text-primary hover:text-primary hover:underline decoration-brand underline-offset-4">{item.name}</Link> : <span className="font-medium text-primary">{item.name}</span>}<span className="mt-1 block text-xs text-text-muted">{item.code} · {item.brand}</span></div>
        </div></td>
        <td>{categories.find(category => category.slug === item.category)?.name}</td>
        {showPrices && <>
          <td className="whitespace-nowrap tabular-nums">{money(prices.listPrice)}{!prices.configured && <span className="mt-1 block text-[11px] text-text-muted">Giá trước giảm</span>}</td>
          <td className="tabular-nums">{formatDiscount(prices.b2cDiscount)}</td>
          <td className="whitespace-nowrap font-medium tabular-nums text-primary">{money(prices.b2cPrice)}<span className="ml-1 text-xs font-normal text-text-muted">/{item.unit}</span></td>
          <td className="tabular-nums">{prices.b2bDiscount === undefined ? <span className="text-xs text-text-muted">Chưa cấu hình</span> : formatDiscount(prices.b2bDiscount)}</td>
          <td className="whitespace-nowrap tabular-nums">{prices.b2bPrice === undefined ? <span className="text-xs text-text-muted">Theo bảng giá</span> : <>{money(prices.b2bPrice)}<span className="mt-1 block text-[11px] text-text-muted">Giá mặc định</span></>}</td>
        </>}
        <td><span className={item.stock === 0 ? "font-semibold text-danger" : "tabular-nums"}>{item.stock}</span></td>
        <td><AdminStatus value={item.published ? "Công khai" : "Riêng tư"} /></td>
        <td>{canEdit && <Link href={`/admin/products/${encodeURIComponent(item.id)}/edit?returnTo=${returnTo}`} prefetch={false} title="Sửa sản phẩm" aria-label={`Sửa sản phẩm ${item.code}`} className="bt-icon-button"><Pencil size={16} /></Link>}</td>
      </tr>;
      })}
    </AdminTable>
    <AdminPagination count={count} page={page} pageSize={apiMode ? browse.pageSize : 10} onChange={filters.setPage} onPageSize={apiMode ? size => browse.set({ pageSize: size }) : undefined} />
  </>;
}

"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "@bprogress/next/app";
import { useOptimistic, useState, useTransition } from "react";
import { Grid2X2, List, LoaderCircle, SlidersHorizontal } from "lucide-react";
import { type Category, normalize, slugify } from "@/lib/catalog";
import { apiMode } from "@/lib/api-client";
import type { CatalogPageResponse } from "@/lib/api-types";
import { previewCatalogPage } from "@/lib/catalog-query";
import { readCatalogPage } from "@/lib/commerce-api";
import { useApiResource } from "@/lib/use-api-resource";
import { useCommerce } from "./commerce-provider";
import { ProductGrid } from "./product-card";
import { SearchBox } from "./search-box";
import { PromotionCard } from "./promotion-card";
import { Breadcrumb, Button, EmptyState, Modal, PageHeading, Tabs } from "./ui";
import { ResourceStatus } from "./admin/admin-resource";

type Props = { category?: Category; query?: string; brand?: string; promotion?: boolean; queryString: string; initialPage?: CatalogPageResponse; initialError?: string };

export function CatalogListing({ category, query, brand, promotion = false, queryString, initialPage, initialError = "" }: Props) {
  const { customer, ready, products, categories, brands } = useCommerce();
  const [optimisticQuery, setOptimisticQuery] = useOptimistic(queryString);
  const params = new URLSearchParams(optimisticQuery);
  const apiParams = new URLSearchParams(queryString);
  apiParams.delete("tab");
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [drawer, setDrawer] = useState(false);
  const [list, setList] = useState(false);
  const [expanded, setExpanded] = useState<string[]>([]);
  const resource = useApiResource<CatalogPageResponse>(`/catalog/search?${apiParams}`, apiMode && ready && customer?.status === "active", undefined, readCatalogPage);
  const result = apiMode ? resource.data || initialPage : previewCatalogPage(products, categories, params, customer);
  const busy = pending || resource.loading;
  const isSearch = query !== undefined;
  const [tab, setTab] = useState("Tất cả");
  const title = category?.name || brand || (promotion ? "Khuyến mãi" : isSearch ? query ? `Kết quả tìm kiếm cho: ${query}` : "Tìm kiếm sản phẩm" : "Tất cả sản phẩm");
  const terms = normalize(query || "").trim().split(/\s+/).filter(Boolean);
  const matchedCategories = categories.filter(item => terms.every(term => normalize(item.name).includes(term)));
  const matchedBrands = brands.filter(name => terms.every(term => normalize(name).includes(term)));
  const selected = (field: string) => params.getAll(field);
  const filterFields = ["category", "brand", "material", "color", "size", "origin", "stock", "subcategory", "min", "max"];
  const count = filterFields.reduce((sum, field) => sum + ((field === "category" && category || field === "brand" && brand) ? 0 : selected(field).length), 0);
  const navigate = (next: URLSearchParams) => startTransition(() => {
    setOptimisticQuery(next.toString());
    router.push(`${pathname}?${next}`, { scroll: false });
  });
  const change = (field: string, values: string[]) => {
    const next = new URLSearchParams(queryString);
    next.delete(field);
    values.filter(Boolean).forEach(value => next.append(field, value));
    if (field !== "page") next.delete("page");
    navigate(next);
  };
  const reset = () => {
    const next = new URLSearchParams(queryString);
    for (const field of [...filterFields, "page"]) {
      if (field === "category" && category || field === "brand" && brand) continue;
      next.delete(field);
    }
    navigate(next);
  };
  const groups = [
    ...(!category ? [{ key: "category", title: "Danh mục", options: categories.map(item => ({ value: item.slug, label: item.name })) }] : []),
    ...(!brand ? [{ key: "brand", title: "Thương hiệu", options: (result?.facets.brand || brands).map(value => ({ value, label: value })) }] : []),
    ...([["material", "Chất liệu"], ["color", "Màu sắc"], ["size", "Kích thước"], ["origin", "Xuất xứ"]] as const).map(([key, title]) => ({ key, title, options: (result?.facets[key] || []).map(value => ({ value, label: value })) })),
    { key: "stock", title: "Tình trạng", options: [{ value: "in", label: "Còn hàng" }, { value: "out", label: "Hết hàng" }] },
  ];
  const filterPanel = <fieldset disabled={busy} className="min-w-0 space-y-4">
    <div className="flex items-center justify-between"><h2 className="text-sm font-semibold text-primary">Bộ lọc{count > 0 && ` (${count})`}</h2>{count > 0 && <button type="button" onClick={reset} className="text-xs text-blue-brand">Xóa tất cả</button>}</div>
    <details open className="border-b border-border pb-4"><summary className="text-sm font-semibold text-primary">Khoảng giá</summary><div className="mt-3 grid grid-cols-2 gap-2">{[["min", "Từ", "0đ"], ["max", "Đến", "Tối đa"]].map(([field, label, placeholder]) =>
      <label key={field} className="text-xs text-text-secondary">{label}<input key={queryString + field} aria-label={`Giá ${label.toLowerCase()}`} min="0" type="number" defaultValue={params.get(field) || ""} placeholder={placeholder} className="bt-input mt-1 !px-2 !text-xs" onBlur={event => { if (event.target.value !== (params.get(field) || "")) change(field, [event.target.value]); }} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); event.currentTarget.blur(); } }} /></label>)}</div></details>
    {groups.map(group => <details key={group.key} open className="border-b border-border pb-4 last:border-0"><summary className="text-sm font-semibold text-primary">{group.title}</summary><div className="mt-3 space-y-2">{group.options.slice(0, expanded.includes(group.key) ? undefined : 4).map(option =>
      <label key={option.value} className="flex items-center gap-2 text-xs text-text-secondary"><input type="checkbox" className="h-3.5 w-3.5 accent-blue-brand" checked={selected(group.key).includes(option.value)} onChange={() => change(group.key, selected(group.key).includes(option.value) ? selected(group.key).filter(value => value !== option.value) : [...selected(group.key), option.value])} />{option.label}</label>)}
      {group.options.length > 4 && <button type="button" className="text-xs font-medium text-blue-brand" onClick={() => setExpanded(previous => previous.includes(group.key) ? previous.filter(key => key !== group.key) : [...previous, group.key])}>{expanded.includes(group.key) ? "Thu gọn" : "Xem thêm"}</button>}</div></details>)}
  </fieldset>;
  return <main className="bt-container bt-page">
    <Breadcrumb items={[{ label: title }]} /><PageHeading title={title} description={category?.description || (brand ? `Phụ kiện ${brand} chính hãng cho công trình và ngôi nhà Việt.` : promotion ? "Ưu đãi dành cho phụ kiện nội thất được chọn lọc." : undefined)}><span className="text-sm text-text-muted">{result?.total || 0} sản phẩm</span></PageHeading>
    {category && <div className="scrollbar-hide mb-6 flex gap-2 overflow-x-auto">{category.subcategories.map(sub => <button key={sub} disabled={busy} aria-pressed={params.get("subcategory") === sub} onClick={() => change("subcategory", params.get("subcategory") === sub ? [] : [sub])} className={`flex h-14 shrink-0 items-center gap-2 rounded-lg border px-3 text-xs font-medium ${params.get("subcategory") === sub ? "border-blue-brand bg-section-blue text-blue-brand" : "border-border bg-white text-primary"}`}><Image src={category.image} alt="" className="h-9 w-9 rounded object-contain" quality={85} width={36} height={36} sizes="36px" data-image-src={category.image} />{sub}</button>)}</div>}
    {brand && <div className="mb-6 flex min-h-[120px] flex-wrap items-center gap-5 border-y border-border bg-section-blue p-5"><strong className="break-words text-2xl font-bold text-primary">{brand.toUpperCase()}</strong><p className="max-w-xl text-sm leading-6 text-text-secondary">Bản lề, ray trượt và phụ kiện đồng bộ. Lựa chọn sản phẩm theo mã hàng, kích thước và nhu cầu công trình.</p></div>}
    {promotion && <div className="relative mb-6 flex h-[200px] items-center overflow-hidden bg-section-blue"><Image alt="Phụ kiện tủ bếp đang có ưu đãi" src="/images/catalog/kitchen-banner.png" className="absolute inset-0 h-full w-full object-cover" quality={85} fill sizes="100vw" /><div className="absolute inset-0 bg-white/80" /><div className="relative px-6"><span className="text-xs font-semibold text-danger">ƯU ĐÃI THÁNG 10</span><h2 className="mt-2 text-xl font-bold text-primary">Phụ kiện đồng bộ, giá tốt hơn</h2><p className="mt-2 text-sm text-text-secondary">Ưu đãi cho sản phẩm được chọn.</p></div></div>}
    {promotion && <fieldset disabled={busy} className="mb-6 grid gap-3 md:grid-cols-3">{categories.filter(item => ["phu-kien-bep", "ban-le", "led-tu-ke"].includes(item.slug)).map(item => <PromotionCard key={item.slug} title={`Ưu đãi ${item.name.toLowerCase()}`} image={item.image} description="Xem phụ kiện đang có giá ưu đãi." selected={selected("category").includes(item.slug)} onSelect={() => change("category", selected("category").includes(item.slug) ? [] : [item.slug])} />)}</fieldset>}
    {isSearch && <div className="mb-5"><div className="mb-3 max-w-2xl"><SearchBox key={query} initialValue={query} large /></div><Tabs value={tab} onChange={setTab} options={["Tất cả", "Sản phẩm", "Danh mục", "Thương hiệu"]} /></div>}
    {isSearch && tab === "Danh mục" ? <div className="grid gap-3 sm:grid-cols-3">{matchedCategories.map(item => <Link className="bt-card flex items-center gap-3 p-3" href={`/category/${item.slug}`} key={item.slug}><Image src={item.image} alt="" className="h-20 w-20 rounded object-contain" quality={85} width={80} height={80} sizes="80px" /><strong>{item.name}</strong></Link>)}{!matchedCategories.length && <EmptyState title="Không tìm thấy danh mục" />}</div> :
      isSearch && tab === "Thương hiệu" ? <div className="grid gap-3 sm:grid-cols-3">{matchedBrands.map(name => <Link key={name} href={`/brand/${slugify(name)}`} className="bt-card break-words p-6 text-lg font-bold text-primary">{name}</Link>)}{!matchedBrands.length && <EmptyState title="Không tìm thấy thương hiệu" />}</div> :
      <div className="grid gap-5 lg:grid-cols-[235px_minmax(0,1fr)]"><aside className="hidden self-start border-r border-border pr-5 lg:block">{filterPanel}</aside><section className="min-w-0" aria-label="Kết quả sản phẩm" aria-busy={busy}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3"><span className="text-sm text-text-secondary">{isSearch ? "Tìm thấy " : ""}<strong className="text-primary">{result?.total || 0}</strong> sản phẩm</span><div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setDrawer(true)} className="bt-button-secondary !h-9 !min-h-9 !px-2 !text-xs lg:hidden"><SlidersHorizontal size={15} />Bộ lọc{count ? ` (${count})` : ""}</button>
          <select disabled={busy} aria-label="Sắp xếp sản phẩm" className="bt-input !h-9 !w-auto !px-2 !text-xs" value={params.get("sort") || "popular"} onChange={event => change("sort", [event.target.value])}><option value="popular">Phổ biến</option><option value="low">Giá thấp → cao</option><option value="high">Giá cao → thấp</option><option value="new">Mới nhất</option></select>
          <div className="hidden items-center sm:flex"><button className={`bt-icon-button ${!list ? "bg-section-blue" : ""}`} aria-label="Dạng lưới" aria-pressed={!list} title="Dạng lưới" onClick={() => setList(false)}><Grid2X2 size={18} /></button><button className={`bt-icon-button ${list ? "bg-section-blue" : ""}`} aria-label="Dạng danh sách" aria-pressed={list} title="Dạng danh sách" onClick={() => setList(true)}><List size={18} /></button></div>
        </div></div>
        <div className="flex min-h-7 items-center gap-2 text-xs text-text-secondary" role="status">{busy && <><LoaderCircle className="animate-spin" size={14} />Đang cập nhật sản phẩm…</>}</div>
        {(initialError || resource.error) && <ResourceStatus error={resource.error || initialError} loading={false} reload={async () => { if (resource.error) await resource.reload(); else router.refresh(); }} />}
        {count > 0 && <button className="mb-3 text-xs text-blue-brand" disabled={busy} onClick={reset}>Xóa bộ lọc</button>}
        {result?.products.length ? <><ProductGrid list={list} products={result.products} /><nav aria-label="Phân trang sản phẩm" className="mt-6 flex flex-wrap items-center justify-center gap-2"><Button variant="secondary" disabled={busy || result.page <= 1} onClick={() => change("page", [String(result.page - 1)])}>Trước</Button><span className="px-2 text-sm tabular-nums">Trang {result.page} / {result.totalPages}</span><Button variant="secondary" disabled={busy || result.page >= result.totalPages} onClick={() => change("page", [String(result.page + 1)])}>Sau</Button></nav></> :
          !busy && !initialError && !resource.error && <EmptyState title="Không tìm thấy sản phẩm phù hợp" description="Thử một mã hàng khác hoặc điều chỉnh bộ lọc." href="/search" action="Xem tất cả sản phẩm" />}
      </section></div>}
    <Modal open={drawer} onClose={() => setDrawer(false)} title="Lọc sản phẩm" sheet>{filterPanel}<Button className="sticky bottom-0 mt-5 w-full" loading={busy} onClick={() => setDrawer(false)}>Xem {result?.total || 0} sản phẩm</Button></Modal>
  </main>;
}

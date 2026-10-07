"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ArrowLeft, ExternalLink, Globe, LockKeyhole, RefreshCw, Save } from "lucide-react";
import { api, apiMode } from "@/lib/api-client";
import { categoryCatalog, slugify } from "@/lib/catalog";
import type { ApiAdminState } from "@/lib/api-types";
import { useCommerce } from "@/components/commerce-provider";
import { Button, EmptyState, Field } from "@/components/ui";
import { useAdmin } from "./admin-provider";
import { AdminHeading } from "./admin-ui";
import { ProductImageUpload } from "./product-image-upload";

type AdminProduct = ApiAdminState["products"][number];

export function ProductEditorPage({ id }: { id?: string }) {
  const { products, reset: reload } = useAdmin();
  const { sessionUser } = useCommerce();
  const [version, setVersion] = useState(0);
  const product = id ? products.find(item => item.id === id) : undefined;
  if (apiMode && !["admin", "boss", "sales"].includes(sessionUser?.role || "")) return <p role="alert" className="text-sm text-danger">Tài khoản không có quyền quản lý sản phẩm.</p>;
  if (id && !product) return <EmptyState title="Không tìm thấy sản phẩm" href="/admin/products" action="Về danh sách" />;
  return <ProductEditor key={`${id || "new"}-${version}`} product={product} onReload={async () => { await reload(); setVersion(value => value + 1); }} />;
}

function ProductEditor({ product: currentProduct, onReload }: { product?: AdminProduct; onReload: () => Promise<void> }) {
  const [product] = useState(currentProduct);
  const { categories: apiCategories, reset: reload, refreshing } = useAdmin();
  const { notice, reloadCatalog } = useCommerce();
  const router = useRouter();
  const [category, setCategory] = useState(product?.category || "");
  const [subcategory, setSubcategory] = useState(product?.subcategory || "");
  const [slug, setSlug] = useState(product?.slug || "");
  const customSlug = useRef(Boolean(product));
  const [images, setImages] = useState<string[]>(product?.gallery || []);
  const [published, setPublished] = useState(product?.published || false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const categories = apiCategories || categoryCatalog;
  const stale = product && currentProduct?.revision !== product.revision;
  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy || uploading || !apiMode) return;
    const form = new FormData(event.currentTarget);
    const text = (name: string) => String(form.get(name) || "").trim();
    const payload = {
      name: text("name"), code: text("code"), slug: slug.trim(), category, subcategory,
      brand: text("brand"), unit: text("unit"), price: Number(text("price")),
      ...(text("oldPrice") ? { oldPrice: Number(text("oldPrice")) } : {}),
      specification: text("specification"), material: text("material"), size: text("size"), color: text("color"), origin: text("origin"),
      description: text("description"), gallery: images, featured: form.has("featured"), published,
      ...(product ? { revision: product.revision } : {})
    };
    if (published && (!images.length || !payload.specification || payload.price <= 0)) {
      setError("Sản phẩm công khai cần ít nhất một ảnh, thông số và giá bán lớn hơn 0."); return;
    }
    setBusy(true); setError("");
    try {
      await api(product ? `/admin/products/${encodeURIComponent(product.id)}` : "/admin/products", { method: product ? "PATCH" : "POST", body: JSON.stringify(payload) });
      await reload();
      await reloadCatalog().catch(cause => notice(cause instanceof Error ? cause.message : "Không thể tải catalog."));
      notice(product ? "Đã lưu sản phẩm." : "Đã thêm sản phẩm.");
      router.push("/admin/products"); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể lưu sản phẩm."); await reload(); }
    finally { setBusy(false); }
  };
  return <>
    <Link href="/admin/products" className="mb-4 inline-flex items-center gap-2 text-sm text-text-secondary hover:text-blue-brand"><ArrowLeft size={16} />Sản phẩm</Link>
    <AdminHeading title={product ? "Sửa sản phẩm" : "Thêm sản phẩm"} subtitle={product?.code} />
    <form onSubmit={save} className="min-w-0">
      {error && <p role="alert" className="mb-5 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-danger">{error}</p>}
      {stale && <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Sản phẩm đã được cập nhật ở phiên khác.<Button type="button" variant="secondary" loading={refreshing} disabled={busy || uploading} onClick={() => void onReload()}><RefreshCw size={16} />Tải lại sản phẩm</Button></div>}
      {!apiMode && <p role="alert" className="mb-5 text-sm text-text-secondary">Chưa kết nối API. Không thể lưu sản phẩm.</p>}
      <div className="grid min-w-0 gap-8 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0 space-y-7">
          <section className="border-b border-border pb-7">
            <h2 className="mb-4 text-base font-semibold text-primary">Thông tin sản phẩm</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2"><Field label="Tên sản phẩm" required><input className="bt-input" name="name" required minLength={2} maxLength={200} defaultValue={product?.name} onChange={event => { if (!customSlug.current) setSlug(slugify(event.target.value)); }} /></Field></div>
              <Field label="Mã hàng" required><input className="bt-input" name="code" required maxLength={80} defaultValue={product?.code} /></Field>
              <Field label="Thương hiệu" required><input className="bt-input" name="brand" required maxLength={80} defaultValue={product?.brand} /></Field>
              <Field label="Danh mục" required htmlFor="product-category"><select id="product-category" className="bt-input" required value={category} onChange={event => { setCategory(event.target.value); setSubcategory(""); }}><option value="">Chọn danh mục</option>{categories.map(item => <option key={item.slug} value={item.slug}>{item.name}</option>)}</select></Field>
              <Field label="Nhóm sản phẩm" htmlFor="product-subcategory"><select id="product-subcategory" className="bt-input" value={subcategory} onChange={event => setSubcategory(event.target.value)} disabled={!category}><option value="">Không chọn</option>{categories.find(item => item.slug === category)?.subcategories.map(item => <option key={item}>{item}</option>)}</select></Field>
              <Field label="Đơn vị tính" required><input className="bt-input" name="unit" required maxLength={30} defaultValue={product?.unit || "cái"} /></Field>
              <Field label="Đường dẫn" required><input className="bt-input" required maxLength={200} pattern="[a-z0-9]+(-[a-z0-9]+)*" value={slug} onChange={event => { customSlug.current = true; setSlug(event.target.value); }} /></Field>
            </div>
          </section>
          <section className="border-b border-border pb-7">
            <h2 className="mb-4 text-base font-semibold text-primary">Giá bán</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Giá bán lẻ (đ)" required><input className="bt-input" type="number" name="price" required min={published ? 1 : 0} max={999999999999} step={1} defaultValue={product?.price || 0} /></Field>
              <Field label="Giá trước giảm (đ)"><input className="bt-input" type="number" name="oldPrice" min={0} max={999999999999} step={1} defaultValue={product?.oldPrice} /></Field>
            </div>
          </section>
          <section className="border-b border-border pb-7">
            <h2 className="mb-4 text-base font-semibold text-primary">Nội dung & thông số</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2"><Field label="Mô tả sản phẩm" htmlFor="product-description"><textarea id="product-description" name="description" rows={6} maxLength={10000} className="bt-input !h-auto py-3" defaultValue={product?.description} /></Field></div>
              <div className="sm:col-span-2"><Field label="Thông số kỹ thuật" required={published} htmlFor="product-specification"><textarea id="product-specification" name="specification" required={published} rows={3} maxLength={500} className="bt-input !h-auto py-3" defaultValue={product?.specification} /></Field></div>
              {[{ name: "material", label: "Chất liệu" }, { name: "size", label: "Kích thước" }, { name: "color", label: "Màu sắc" }, { name: "origin", label: "Xuất xứ" }].map(({ name, label }) => <Field key={name} label={label}><input name={name} className="bt-input" maxLength={100} defaultValue={product?.[name as "material" | "size" | "color" | "origin"]} /></Field>)}
            </div>
          </section>
          <section className="pb-5"><ProductImageUpload images={images} onChange={setImages} busy={busy || uploading} uploading={uploading} onBusyChange={setUploading} /></section>
        </div>
        <aside className="min-w-0 space-y-6 xl:sticky xl:top-20 xl:self-start">
          <section className="border-b border-border pb-5">
            <h2 className="mb-4 text-base font-semibold text-primary">Hiển thị</h2>
            <fieldset className="space-y-2"><legend className="sr-only">Chế độ hiển thị</legend>
              {[{ value: false, label: "Riêng tư", Icon: LockKeyhole }, { value: true, label: "Công khai", Icon: Globe }].map(({ value, label, Icon }) => <label key={label} className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-md border px-3 text-sm ${published === value ? "border-blue-brand bg-section-blue text-primary" : "border-border text-text-secondary"}`}><input type="radio" name="visibility" checked={published === value} onChange={() => setPublished(value)} className="accent-blue-brand" /><Icon size={17} /><span>{label}</span></label>)}
            </fieldset>
            <label className="mt-5 flex items-center gap-2 text-sm text-primary"><input type="checkbox" name="featured" defaultChecked={product?.featured} className="h-4 w-4 accent-blue-brand" />Sản phẩm nổi bật</label>
          </section>
          {product && <section className="border-b border-border pb-5"><h2 className="mb-2 text-base font-semibold text-primary">Tồn khả dụng</h2><p className="text-sm text-text-secondary">{currentProduct?.stock || 0} {product.unit}</p><Link href="/admin/ledger" className="mt-3 inline-flex text-sm font-medium text-blue-brand">Sổ tồn kho</Link></section>}
          <Button type="submit" loading={busy} disabled={uploading || !apiMode || Boolean(stale)} className="w-full"><Save size={17} />Lưu sản phẩm</Button>
          {product?.published && <Link href={`/products/${product.slug}`} target="_blank" rel="noopener noreferrer" className="bt-button-secondary w-full"><ExternalLink size={16} />Xem sản phẩm</Link>}
          <Link href="/admin/products" className="bt-button-ghost w-full">Hủy</Link>
        </aside>
      </div>
    </form>
  </>;
}

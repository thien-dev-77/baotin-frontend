"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { ArrowLeft, ExternalLink, Eye, FileText, Globe, ListChecks, LockKeyhole, Package, RefreshCw, Save, Warehouse } from "lucide-react";
import { api, apiMode } from "@/lib/api-client";
import { categoryCatalog, slugify } from "@/lib/catalog";
import { categoryLabel } from "@/lib/category-tree";
import type { ApiAdminState } from "@/lib/api-types";
import { useCommerce } from "@/components/commerce-provider";
import { Button, EmptyState, Field, Tabs } from "@/components/ui";
import { useAdmin } from "./admin-provider";
import { AdminHeading } from "./admin-ui";
import { ProductImageUpload } from "./product-image-upload";
import { useUnsavedForm } from "@/lib/unsaved-form";
import { discountedPrice, productPrices, MAX_PRODUCT_PRICE, MAX_PRODUCT_DISCOUNT } from "@/lib/product-pricing";
import { ProductPricingFields, type ProductPricingDraft } from "./product-pricing-fields";
import { ProductVariantFields } from "./product-variant-fields";
import { ProductVariantCopy } from "./product-variant-copy";
import { ProductVariantDetach } from "./product-variant-detach";
import { variantDimension } from "@/lib/product-variants";
import { PRODUCT_SPECIFICATION_MAX_LENGTH, PRODUCT_TECHNICAL_DETAILS_MAX_LENGTH } from "@/lib/product-content";
import { ProductFormSection } from "./product-form-section";
const RichTextEditor = dynamic(() => import("./rich-text-editor").then(module => module.RichTextEditor), {
  ssr: false,
  loading: () => <p role="status" className="py-3 text-sm text-text-secondary">Đang tải trình soạn thảo...</p>,
});

type AdminProduct = ApiAdminState["products"][number];
const PRODUCT_EDITOR_TABS = { basic: "Thông tin cơ bản", content: "Nội dung chi tiết", media: "Hình ảnh" };

export function ProductEditorPage({ id }: { id?: string }) {
  const { products, reset: reload, loadedResources } = useAdmin();
  const { sessionUser } = useCommerce();
  const [version, setVersion] = useState(0);
  const variantOf = useSearchParams().get("variantOf");
  const template = !id && variantOf ? products.find(item => item.id === variantOf) : undefined;
  const product = id ? products.find(item => item.id === id) : undefined;
  if (apiMode && !["admin", "boss", "sales"].includes(sessionUser?.role || "")) return <p role="alert" className="text-sm text-danger">Tài khoản không có quyền quản lý sản phẩm.</p>;
  if (id && !product && !loadedResources?.includes("products")) return <p role="status" className="text-sm text-text-secondary">Đang tải sản phẩm...</p>;
  if (variantOf && !template && !loadedResources?.includes("products")) return <p role="status" className="text-sm text-text-secondary">Đang tải sản phẩm gốc...</p>;
  if (variantOf && !template) return <EmptyState title="Không tìm thấy sản phẩm gốc" href="/admin/products" action="Về danh sách" />;
  if (template && !template.variantGroupId) return <EmptyState title="Sản phẩm gốc chưa có thuộc tính biến thể" href={`/admin/products/${encodeURIComponent(template.id)}/edit`} action="Sửa sản phẩm gốc" />;
  if (id && !product) return <EmptyState title="Không tìm thấy sản phẩm" href="/admin/products" action="Về danh sách" />;
  return <ProductEditor key={`${id || variantOf || "new"}-${version}`} product={product} template={template} onReload={async () => { await reload(); setVersion(value => value + 1); }} />;
}

function ProductEditor({ product: currentProduct, template, onReload }: { product?: AdminProduct; template?: AdminProduct; onReload: () => Promise<void> }) {
  const [product] = useState(currentProduct);
  const source = product || template;
  const { products, categories: apiCategories, reset: reload, refreshing } = useAdmin();
  const { notice, reloadCatalog } = useCommerce();
  const router = useRouter();
  const returnTo = useSearchParams().get("returnTo");
  const listUrl = returnTo === "/admin/products" || returnTo?.startsWith("/admin/products?") ? returnTo : "/admin/products";
  const formRef = useRef<HTMLFormElement>(null);
  const [category, setCategory] = useState(source?.category || "");
  const [subcategory, setSubcategory] = useState(source?.subcategory || "");
  const [slug, setSlug] = useState(product?.slug || "");
  const customSlug = useRef(Boolean(product));
  const [images, setImages] = useState<string[]>(source?.gallery || []);
  const [published, setPublished] = useState(product?.published || false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const initialPrices = productPrices(source || { price: 0 });
  const [variantAttributes, setVariantAttributes] = useState(() => product?.variantAttributes || template?.variantAttributes?.map(attribute => ({ name: attribute.name, value: "" })) || []);
  const [variantLabel, setVariantLabel] = useState(product?.variantLabel || "");
  const variantGroupId = product?.variantGroupId || template?.variantGroupId || template?.id;
  const siblings = variantGroupId ? products.filter(item => item.variantGroupId === variantGroupId) : [];
  const [detachId, setDetachId] = useState<string>();
  const detachTarget = siblings.find(item => item.id === detachId);
  const [pricing, setPricing] = useState<ProductPricingDraft>(() => ({ listPrice: String(initialPrices.listPrice), b2cDiscount: String(Math.min(MAX_PRODUCT_DISCOUNT, initialPrices.b2cDiscount)), b2bDiscount: String(initialPrices.b2bDiscount ?? 0) }));
  const [pricingEdited, setPricingEdited] = useState(!product || initialPrices.configured);
  const [activeTab, setActiveTab] = useState(PRODUCT_EDITOR_TABS.basic);
  const [contentVisited, setContentVisited] = useState(false);
  // Keep list/search content short and plain; technicalDetails stores the full formatted content.
  const [specification, setSpecification] = useState(source?.specification || "");
  const [richDescription, setRichDescription] = useState(source?.description || "");
  const [richTechnicalDetails, setRichTechnicalDetails] = useState(source?.technicalDetails || source?.specification || "");
  const [richUsageGuide, setRichUsageGuide] = useState(source?.usageGuide || "");
  const [richShortDescription, setRichShortDescription] = useState(source?.shortDescription || "");
  const listPrice = Number(pricing.listPrice), b2cDiscount = Number(pricing.b2cDiscount), b2bDiscount = Number(pricing.b2bDiscount);
  const validPricing = Number.isSafeInteger(listPrice) && listPrice >= 0 && listPrice <= MAX_PRODUCT_PRICE && [b2cDiscount, b2bDiscount].every(value => Number.isFinite(value) && value >= 0 && value <= MAX_PRODUCT_DISCOUNT && Math.abs(value * 100 - Math.round(value * 100)) < 0.000001);
  const b2cPrice = pricingEdited ? validPricing ? discountedPrice(listPrice, b2cDiscount) : 0 : initialPrices.b2cPrice;
  const b2bPrice = pricingEdited ? validPricing ? discountedPrice(listPrice, b2bDiscount) : 0 : initialPrices.b2bPrice;
  const { dirty, markSaved, close } = useUnsavedForm(formRef, true, busy || uploading, JSON.stringify([images, richDescription, richTechnicalDetails, richUsageGuide, richShortDescription]));
  const categories = apiCategories || categoryCatalog;
  const stale = product && currentProduct?.revision !== product.revision;
  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy || uploading || !apiMode) return;
    const form = new FormData(event.currentTarget);
    const text = (name: string) => String(form.get(name) || "").trim();
    const payload = {
      name: text("name"), code: text("code"), slug: slug.trim(), category, subcategory,
      brand: text("brand"), unit: text("unit"), price: b2cPrice,
      ...(pricingEdited ? { listPrice, b2cDiscount, b2bDiscount } : product?.oldPrice !== undefined ? { oldPrice: product.oldPrice } : {}),
      specification: specification.trim(), material: text("material"),
      size: variantDimension(variantAttributes, "size")?.value.trim() || text("size"),
      color: variantDimension(variantAttributes, "color")?.value.trim() || text("color"), origin: text("origin"),
      description: richDescription || text("description"), 
      technicalDetails: richTechnicalDetails || text("technicalDetails"),
      usageGuide: richUsageGuide || text("usageGuide"),
      gallery: images, featured: form.has("featured"), published,
      alternateCode: text("alternateCode"), sourceUrl: text("sourceUrl"), 
      shortDescription: richShortDescription || text("shortDescription"),
      warranty: text("warranty"),
      variantLabel: variantLabel.trim(),
      ...(variantAttributes.length || variantGroupId ? { variantGroupId: variantGroupId || "self", variantAttributes: variantAttributes.map(attribute => ({ name: attribute.name.trim(), value: attribute.value.trim() })) } : {}),
      ...(product ? { revision: product.revision } : {})
    };
    if (pricingEdited && (!validPricing || Object.values(pricing).some(value => value.trim() === ""))) { setError("Kiểm tra giá niêm yết và chiết khấu."); return; }
    if (richTechnicalDetails.length > PRODUCT_TECHNICAL_DETAILS_MAX_LENGTH) {
      setActiveTab(PRODUCT_EDITOR_TABS.basic);
      setError(`Thông số kỹ thuật quá dài. Vui lòng rút gọn còn tối đa ${PRODUCT_TECHNICAL_DETAILS_MAX_LENGTH.toLocaleString("vi-VN")} ký tự, bao gồm định dạng.`);
      return;
    }
    if (published && (!images.length || !payload.specification || payload.price <= 0)) {
      setError("Sản phẩm công khai cần ít nhất một ảnh, thông số và giá bán lớn hơn 0."); return;
    }
    setBusy(true); setError("");
    try {
      const response = await api<{ id: string; product: AdminProduct }>(product ? `/admin/products/${encodeURIComponent(product.id)}` : "/admin/products", { method: product ? "PATCH" : "POST", body: JSON.stringify(payload) });
      await reload();
      await reloadCatalog().catch(cause => notice(cause instanceof Error ? cause.message : "Không thể tải catalog."));
      notice(product ? "Đã lưu sản phẩm." : "Đã thêm sản phẩm.");
      markSaved();
      
      // Nếu đang edit, ở lại trang và reload data
      if (product) {
        await onReload();
      } else {
        // Nếu tạo mới, chuyển sang trang edit của sản phẩm vừa tạo
        router.push(`/admin/products/${encodeURIComponent(response.id)}/edit?returnTo=${encodeURIComponent(listUrl)}`);
      }
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể lưu sản phẩm."); await reload(); }
    finally { setBusy(false); }
  };
  return <>
    <Link href={listUrl} className="mb-4 inline-flex items-center gap-2 text-sm text-text-secondary hover:text-primary hover:underline decoration-brand underline-offset-4"><ArrowLeft size={16} />Sản phẩm</Link>
    <AdminHeading title={product ? "Sửa sản phẩm" : template ? "Thêm biến thể" : "Thêm sản phẩm"} subtitle={product?.code || template?.code} />
    {product?.variantGroupId && <ProductVariantCopy source={product} targets={siblings.filter(item => item.id !== product.id)} disabled={busy || uploading || Boolean(stale)} unsaved={dirty} onUpdated={async () => {
      await reloadCatalog().catch(cause => notice(cause instanceof Error ? cause.message : "Không thể tải catalog."));
      await onReload(); router.refresh();
    }} />}
    {detachTarget && product?.variantGroupId && <ProductVariantDetach target={detachTarget} groupId={product.variantGroupId} onClose={() => setDetachId(undefined)} onUpdated={async () => {
      await reloadCatalog().catch(cause => notice(cause instanceof Error ? cause.message : "Không thể tải catalog."));
      await onReload(); router.refresh();
    }} />}
    <form ref={formRef} onSubmit={save} onInvalidCapture={event => {
      const input = event.target as HTMLInputElement;
      if (!input.closest("[hidden]")) return;
      event.preventDefault();
      setActiveTab(PRODUCT_EDITOR_TABS.basic);
      requestAnimationFrame(() => input.reportValidity());
    }} data-unsaved={dirty || undefined} className="min-w-0">
      {error && <p role="alert" className="mb-5 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-danger">{error}</p>}
      {stale && <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Sản phẩm đã được cập nhật ở phiên khác.<Button type="button" variant="secondary" loading={refreshing} disabled={busy || uploading} onClick={() => close(() => void onReload())}><RefreshCw size={16} />Tải lại sản phẩm</Button></div>}
      {!apiMode && <p role="alert" className="mb-5 text-sm text-text-secondary">Chưa kết nối API. Không thể lưu sản phẩm.</p>}
      <fieldset disabled={busy || uploading} className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0">
          <Tabs options={Object.values(PRODUCT_EDITOR_TABS)} value={activeTab} onChange={value => {
            setActiveTab(value);
            if (value === PRODUCT_EDITOR_TABS.content) setContentVisited(true);
          }} />
          
            <div hidden={activeTab !== PRODUCT_EDITOR_TABS.basic} className="min-w-0 space-y-6 pt-6">
              <ProductFormSection id="product-information" title="Thông tin sản phẩm" icon={Package} description="Thông tin nhận diện, phân loại và đường dẫn của sản phẩm.">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2"><Field label="Tên sản phẩm" required><input className="bt-input" name="name" required minLength={2} maxLength={200} defaultValue={source?.name} onChange={event => { if (!customSlug.current) setSlug(slugify(event.target.value)); }} /></Field></div>
                  <Field label="Mã hàng" required><input className="bt-input" name="code" required maxLength={80} defaultValue={product?.code} /></Field>
                  <Field label="Mã sản phẩm mới"><input className="bt-input" name="alternateCode" maxLength={80} defaultValue={source?.alternateCode} /></Field>
                  <Field label="Thương hiệu" required><input className="bt-input" name="brand" required readOnly={Boolean(variantGroupId)} maxLength={80} defaultValue={source?.brand} /></Field>
                  <Field label="Danh mục" required htmlFor="product-category"><select id="product-category" className="bt-input" required disabled={Boolean(variantGroupId)} value={category} onChange={event => { setCategory(event.target.value); setSubcategory(""); }}><option value="">Chọn danh mục</option>{categories.map(item => <option key={item.slug} value={item.slug}>{categoryLabel(categories, item.slug) || item.name}</option>)}</select></Field>
                  <Field label="Nhóm sản phẩm" htmlFor="product-subcategory"><select id="product-subcategory" className="bt-input" value={subcategory} onChange={event => setSubcategory(event.target.value)} disabled={!category}><option value="">Không chọn</option>{categories.find(item => item.slug === category)?.subcategories.map(item => <option key={item}>{item}</option>)}</select></Field>
                  <Field label="Đơn vị tính" required><input className="bt-input" name="unit" required readOnly={Boolean(variantGroupId)} maxLength={30} defaultValue={source?.unit || "cái"} /></Field>
                  <Field label="Đường dẫn" required><input className="bt-input" required maxLength={200} pattern="[a-z0-9]+(-[a-z0-9]+)*" value={slug} onChange={event => { customSlug.current = true; setSlug(event.target.value); }} /></Field>
                  <div className="sm:col-span-2"><Field label="Link sản phẩm nhà cung cấp"><input className="bt-input" name="sourceUrl" type="url" maxLength={300} defaultValue={source?.sourceUrl} /></Field></div>
                </div>
              </ProductFormSection>
              <ProductVariantFields attributes={variantAttributes} onChange={setVariantAttributes} label={variantLabel} onLabelChange={setVariantLabel} groupId={product?.variantGroupId} siblings={siblings} currentId={product?.id} returnTo={listUrl} schemaLocked={Boolean(template || product?.variantGroupId && (product.id !== product.variantGroupId || siblings.length > 1))} onDetach={product ? setDetachId : undefined} detachDisabled={busy || uploading || Boolean(stale) || !apiMode} unsaved={dirty} />
              <ProductPricingFields value={pricing} onChange={value => { setPricing(value); setPricingEdited(true); setError(""); }} b2cPrice={b2cPrice} b2bPrice={b2bPrice} legacy={!pricingEdited} />
              <ProductFormSection id="product-attributes" title="Thuộc tính bổ sung" icon={ListChecks} description="Nội dung ngắn, thông số kỹ thuật, chất liệu và chính sách bảo hành.">
                <div className="space-y-5">
                  <div>
                    <label htmlFor="product-short-description" className="mb-1.5 block text-sm font-medium text-primary">Nội dung ngắn</label>
                    <RichTextEditor
                      id="product-short-description"
                      label="Nội dung ngắn"
                      value={richShortDescription}
                      onChange={setRichShortDescription}
                      disabled={busy || uploading}
                      placeholder="Nhập nội dung tóm tắt ngắn về sản phẩm..."
                      minHeight="150px"
                    />
                    <input type="hidden" name="shortDescription" value={richShortDescription} />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="min-w-0 sm:col-span-2"><Field label="Thông số kỹ thuật" required={published} htmlFor="product-specification">
                      <RichTextEditor id="product-specification" label="Thông số kỹ thuật" value={richTechnicalDetails} onChange={setRichTechnicalDetails} onPlainTextChange={text => setSpecification(Array.from(text).slice(0, PRODUCT_SPECIFICATION_MAX_LENGTH).join(""))} disabled={busy || uploading} placeholder="Nhập thông số kỹ thuật, danh sách hoặc bảng thông số..." minHeight="250px" />
                    </Field></div>
                    <div className="sm:col-span-2"><Field label="Bảo hành"><input name="warranty" className="bt-input" maxLength={500} defaultValue={source?.warranty} /></Field></div>
                    {[{ name: "material", label: "Chất liệu" }, { name: "size", label: "Kích thước" }, { name: "color", label: "Màu sắc" }, { name: "origin", label: "Xuất xứ" }].filter(field => field.name === "size" ? !variantDimension(variantAttributes, "size") : field.name === "color" ? !variantDimension(variantAttributes, "color") : true).map(({ name, label }) => <Field key={name} label={label}><input name={name} className="bt-input" maxLength={100} defaultValue={source?.[name as "material" | "size" | "color" | "origin"]} /></Field>)}
                  </div>
                </div>
              </ProductFormSection>
            </div>

            <div hidden={activeTab !== PRODUCT_EDITOR_TABS.content} className="min-w-0 space-y-6 pt-6">
              {contentVisited && <>
              <ProductFormSection id="product-content" title="Nội dung chi tiết" icon={FileText} description="Biên soạn mô tả sản phẩm và hướng dẫn sử dụng cho khách hàng.">
                <div className="space-y-5">
                  <div>
                    <label htmlFor="product-description" className="mb-1.5 block text-sm font-medium text-primary">Mô tả sản phẩm</label>
                    <RichTextEditor
                      id="product-description"
                      label="Mô tả sản phẩm"
                      value={richDescription}
                      onChange={setRichDescription}
                      disabled={busy || uploading}
                      placeholder="Nhập mô tả chi tiết về sản phẩm..."
                      minHeight="250px"
                    />
                    <input type="hidden" name="description" value={richDescription} />
                  </div>
                  
                  
                  <div>
                    <label htmlFor="product-usage-guide" className="mb-1.5 block text-sm font-medium text-primary">Hướng dẫn sử dụng</label>
                    <RichTextEditor
                      id="product-usage-guide"
                      label="Hướng dẫn sử dụng"
                      value={richUsageGuide}
                      onChange={setRichUsageGuide}
                      disabled={busy || uploading}
                      placeholder="Nhập hướng dẫn sử dụng sản phẩm..."
                      minHeight="300px"
                    />
                    <input type="hidden" name="usageGuide" value={richUsageGuide} />
                  </div>
                </div>
              </ProductFormSection>
              </>}
            </div>

          {activeTab === PRODUCT_EDITOR_TABS.media && (
            <div className="min-w-0 pt-6">
              <ProductImageUpload images={images} onChange={setImages} busy={busy || uploading} uploading={uploading} onBusyChange={setUploading} />
            </div>
          )}
        </div>
        <aside className="min-w-0 space-y-6 xl:sticky xl:top-20 xl:self-start">
          <ProductFormSection id="product-visibility" title="Hiển thị" icon={Eye}>
            <fieldset className="space-y-2"><legend className="sr-only">Chế độ hiển thị</legend>
              {[{ value: false, label: "Riêng tư", Icon: LockKeyhole }, { value: true, label: "Công khai", Icon: Globe }].map(({ value, label, Icon }) => <label key={label} className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-md border px-3 text-sm ${published === value ? "border-brand bg-section text-primary" : "border-border text-text-secondary"}`}><input type="radio" name="visibility" checked={published === value} onChange={() => setPublished(value)} className="accent-brand" /><Icon size={17} /><span>{label}</span></label>)}
            </fieldset>
            <label className="mt-5 flex items-center gap-2 text-sm text-primary"><input type="checkbox" name="featured" defaultChecked={product?.featured} className="h-4 w-4 accent-brand" />Sản phẩm nổi bật</label>
          </ProductFormSection>
          {product && <ProductFormSection id="product-stock" title="Tồn khả dụng" icon={Warehouse}><p className="text-2xl font-semibold tabular-nums text-primary">{currentProduct?.stock || 0} <span className="text-sm font-normal text-text-secondary">{product.unit}</span></p><Link href="/admin/ledger" className="mt-3 inline-flex text-sm font-medium text-primary underline decoration-border underline-offset-4 hover:decoration-primary">Sổ tồn kho</Link></ProductFormSection>}
          {product?.published && <Link href={`/products/${product.slug}`} target="_blank" rel="noopener noreferrer" className="bt-button-secondary w-full"><ExternalLink size={16} />Xem sản phẩm</Link>}
        </aside>
      </fieldset>
      <div className="bt-admin-save-bar"><Button type="button" variant="secondary" disabled={busy || uploading} onClick={() => close(() => router.push(listUrl))}>Hủy</Button><Button type="submit" loading={busy} disabled={uploading || !apiMode || Boolean(stale)}><Save size={17} />Lưu sản phẩm</Button></div>
    </form>
  </>;
}

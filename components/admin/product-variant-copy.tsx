"use client";

import { useRef, useState } from "react";
import { Copy, RefreshCw } from "lucide-react";
import { Button, Modal } from "@/components/ui";
import { useCommerce } from "@/components/commerce-provider";
import { api, apiMode } from "@/lib/api-client";
import type { ApiAdminState } from "@/lib/api-types";
import { MAX_VARIANT_COPY_TARGETS, productVariantCopyFields, type ProductVariantCopyField } from "@/lib/product-variant-copy";

type AdminProduct = ApiAdminState["products"][number];
type Target = Pick<AdminProduct, "id" | "code" | "revision" | "variantLabel" | "variantAttributes">;

export function ProductVariantCopy({ source, targets, disabled, unsaved, onUpdated }: {
  source: AdminProduct; targets: AdminProduct[]; disabled: boolean; unsaved: boolean; onUpdated: () => Promise<void>;
}) {
  const { notice } = useCommerce();
  const [open, setOpen] = useState(false);
  const [candidates, setCandidates] = useState<Target[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [fields, setFields] = useState<ProductVariantCopyField[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);
  const hasContent = (key: ProductVariantCopyField) => {
    const value = source[key];
    return Array.isArray(value) ? value.length > 0 : Boolean(value?.replace(/<[^>]*>|&nbsp;/g, "").trim());
  };
  const start = () => {
    setCandidates(targets.map(({ id, code, revision, variantLabel, variantAttributes }) => ({ id, code, revision, variantLabel, variantAttributes })));
    setSelected(targets.slice(0, MAX_VARIANT_COPY_TARGETS).map(product => product.id));
    setFields(productVariantCopyFields.filter(field => field.defaultSelected && hasContent(field.key)).map(field => field.key));
    setError(""); setOpen(true);
  };
  const apply = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting.current || busy || disabled || unsaved || !apiMode) return;
    if (!fields.length || !selected.length || selected.length > MAX_VARIANT_COPY_TARGETS) {
      setError(`Chọn ít nhất một nội dung và từ 1 đến ${MAX_VARIANT_COPY_TARGETS} SKU nhận.`); return;
    }
    const recipients = candidates.filter(product => selected.includes(product.id));
    if (!source.revision || recipients.some(product => !product.revision)) {
      setError("Thiếu phiên bản sản phẩm. Tải lại nhóm trước khi áp dụng."); return;
    }
    submitting.current = true; setBusy(true); setError("");
    try {
      const result = await api<{ updated: number }>(`/admin/products/${encodeURIComponent(source.id)}/copy-to-variants`, {
        method: "POST", body: JSON.stringify({ revision: source.revision, fields,
          products: recipients.map(({ id, revision }) => ({ id, revision })) }),
      });
      setOpen(false); notice(`Đã áp dụng nội dung từ ${source.code} cho ${result.updated} biến thể.`);
      await onUpdated().catch(() => notice("Đã áp dụng nội dung. Tải lại trang để xem dữ liệu mới."));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể áp dụng nội dung cho biến thể."); }
    finally { submitting.current = false; setBusy(false); }
  };
  if (!targets.length) return null;

  return <>
    <section aria-label="Sao chép nội dung cho biến thể" className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-white p-4">
      <div className="min-w-0 flex-1"><h2 className="text-sm font-semibold text-primary">Dùng nội dung này cho các biến thể khác</h2><p className="mt-1 text-xs leading-5 text-text-secondary">{unsaved ? "Lưu sản phẩm trước khi áp dụng nội dung cho biến thể khác." : `Chọn nội dung đã lưu của ${source.code} và SKU nhận trong cùng nhóm.`}</p></div>
      <Button type="button" variant="secondary" onClick={start} disabled={disabled || unsaved || !apiMode}><Copy size={16} />Áp dụng cho biến thể khác</Button>
    </section>
    <Modal open={open} onClose={() => { if (!busy) setOpen(false); }} title="Áp dụng nội dung cho biến thể" busy={busy} trackChanges={false}>
      <form onSubmit={apply} className="space-y-5">
        <p className="text-sm leading-6 text-text-secondary">Lấy nội dung đã lưu từ <strong className="text-primary">{source.code}</strong>. Nội dung được chọn sẽ thay thế nội dung tương ứng ở các SKU nhận.</p>
        <fieldset disabled={busy} className="space-y-3">
          <legend className="mb-3 text-sm font-semibold text-primary">Nội dung cần áp dụng</legend>
          <div className="grid gap-3 sm:grid-cols-2">{productVariantCopyFields.map(field => <label key={field.key} className="flex items-start gap-2 text-sm text-primary">
            <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-brand" checked={fields.includes(field.key)} onChange={event => setFields(previous => event.target.checked ? [...previous, field.key] : previous.filter(key => key !== field.key))} />
            <span>{field.label}{!hasContent(field.key) && <span className="mt-0.5 block text-xs text-text-secondary">Nguồn đang trống; chọn để xóa nội dung cũ</span>}</span>
          </label>)}</div>
          <p className="text-xs leading-5 text-text-secondary">Thông số kỹ thuật và ảnh có thể khác theo SKU, chỉ chọn khi dùng chung. Mã SKU, đường dẫn, giá, tồn kho, trạng thái và thuộc tính biến thể giữ riêng.</p>
        </fieldset>
        <fieldset disabled={busy} className="space-y-3">
          <legend className="mb-2 text-sm font-semibold text-primary">SKU nhận ({selected.length}/{candidates.length})</legend>
          <div className="flex gap-4 text-xs"><button type="button" className="min-h-8 underline underline-offset-2" onClick={() => setSelected(candidates.slice(0, MAX_VARIANT_COPY_TARGETS).map(product => product.id))}>Chọn tất cả</button><button type="button" className="min-h-8 underline underline-offset-2" onClick={() => setSelected([])}>Bỏ chọn tất cả</button></div>
          <div className="max-h-48 space-y-3 overflow-y-auto rounded border border-border p-3">{candidates.map(product => <label key={product.id} className="flex items-start gap-3 text-sm text-primary">
            <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-brand" aria-label={`Áp dụng cho ${product.code}`} checked={selected.includes(product.id)} onChange={event => setSelected(previous => event.target.checked ? [...previous, product.id] : previous.filter(id => id !== product.id))} />
            <span className="min-w-0 break-words"><strong>{product.code}</strong>{product.variantLabel && <span className="ml-2">{product.variantLabel}</span>}<span className="mt-0.5 block text-xs text-text-secondary">{product.variantAttributes?.map(attribute => `${attribute.name}: ${attribute.value}`).join(" · ")}</span></span>
          </label>)}</div>
          {candidates.length > MAX_VARIANT_COPY_TARGETS && <p className="text-xs text-text-secondary">Tối đa {MAX_VARIANT_COPY_TARGETS} SKU mỗi lần.</p>}
        </fieldset>
        {error && <div role="alert" className="space-y-2 rounded border border-red-200 bg-red-50 p-3 text-sm text-danger"><p>{error}</p><Button type="button" variant="secondary" disabled={busy} onClick={() => { setOpen(false); void onUpdated().catch(() => notice("Không thể tải lại nhóm biến thể.")); }}><RefreshCw size={15} />Tải lại nhóm biến thể</Button></div>}
        <div className="sticky -bottom-4 -mx-4 -mb-4 flex flex-wrap justify-end gap-2 border-t border-border bg-white p-4"><Button type="button" variant="secondary" disabled={busy} onClick={() => setOpen(false)}>Hủy</Button><Button type="submit" loading={busy} disabled={!fields.length || !selected.length || selected.length > MAX_VARIANT_COPY_TARGETS}><Copy size={16} />Áp dụng cho {selected.length} SKU</Button></div>
      </form>
    </Modal>
  </>;
}

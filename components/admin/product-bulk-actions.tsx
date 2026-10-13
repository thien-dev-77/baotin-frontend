"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCheck, Globe, LockKeyhole, Percent, Save, X } from "lucide-react";
import { Button, Field, Modal } from "@/components/ui";
import { api } from "@/lib/api-client";
import { MAX_PRODUCT_DISCOUNT } from "@/lib/product-pricing";

export const MAX_BULK_PRODUCTS = 500;
export type SelectedProduct = { id: string; revision: number; code: string };
type BulkAction = "publish" | "private" | "discounts";
type BulkResult = { updated: number; action: BulkAction; hiddenCategories: string[] };

export function ProductSelectionCheckbox({ checked, mixed = false, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { mixed?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (ref.current) ref.current.indeterminate = mixed; }, [mixed]);
  return <input {...props} ref={ref} type="checkbox" checked={checked} className="h-4 w-4 shrink-0 accent-blue-brand" />;
}

export function ProductBulkActions({ selected, total, busy, setBusy, clear, selectAll, onUpdated }: { selected: SelectedProduct[]; total: number; busy: boolean; setBusy: (busy: boolean) => void; clear: () => void; selectAll: () => Promise<void>; onUpdated: (result: BulkResult) => Promise<void> }) {
  const [action, setAction] = useState<BulkAction>();
  const [error, setError] = useState("");
  const [selecting, setSelecting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [changeB2c, setChangeB2c] = useState(true), [changeB2b, setChangeB2b] = useState(true);
  const [b2c, setB2c] = useState("0"), [b2b, setB2b] = useState("0");
  const start = (value: BulkAction) => { setError(""); setChangeB2c(true); setChangeB2b(true); setB2c("0"); setB2b("0"); setAction(value); };
  const chooseAll = async () => {
    setError(""); setSelecting(true); setBusy(true);
    try { await selectAll(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể chọn sản phẩm."); }
    finally { setSelecting(false); setBusy(false); }
  };
  const apply = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!action || busy || !selected.length) return;
    setError("");
    if (action === "discounts") {
      if (!changeB2c && !changeB2b) { setError("Chọn CK B2C hoặc CK B2B để cập nhật."); return; }
      const values = [changeB2c ? b2c : undefined, changeB2b ? b2b : undefined].filter((value): value is string => value !== undefined);
      if (values.some(value => value.trim() === "" || !Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > MAX_PRODUCT_DISCOUNT || Math.abs(Number(value) * 100 - Math.round(Number(value) * 100)) > 0.000001)) { setError("Chiết khấu phải từ 0 đến 99,99%, tối đa hai chữ số thập phân."); return; }
    }
    setBusy(true); setSaving(true);
    try {
      const result = await api<BulkResult>("/admin/products/bulk", { method: "POST", body: JSON.stringify({ action, products: selected.map(({ id, revision }) => ({ id, revision })), ...(action === "discounts" ? { ...(changeB2c ? { b2cDiscount: Number(b2c) } : {}), ...(changeB2b ? { b2bDiscount: Number(b2b) } : {}) } : {}) }) });
      setAction(undefined); clear();
      await onUpdated(result);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể cập nhật sản phẩm."); }
    finally { setSaving(false); setBusy(false); }
  };
  const title = action === "publish" ? "Công khai sản phẩm" : action === "private" ? "Chuyển sản phẩm sang riêng tư" : "Chỉnh chiết khấu hàng loạt";
  return <>
    <div className="mb-3 flex min-h-12 flex-wrap items-center gap-2 border-y border-border py-2" aria-label="Thao tác sản phẩm hàng loạt" aria-busy={busy || undefined}>
      <span className="mr-2 min-w-24 text-sm font-medium text-primary" role="status">Đã chọn {selected.length}</span>
      <Button type="button" variant="secondary" loading={selecting} disabled={busy || !total || selected.length === total || total > MAX_BULK_PRODUCTS} onClick={() => void chooseAll()}><CheckCheck size={16} />Chọn tất cả {total}</Button>
      <Button type="button" variant="secondary" disabled={busy || !selected.length} onClick={() => start("publish")}><Globe size={16} />Công khai</Button>
      <Button type="button" variant="secondary" disabled={busy || !selected.length} onClick={() => start("private")}><LockKeyhole size={16} />Riêng tư</Button>
      <Button type="button" variant="secondary" disabled={busy || !selected.length} onClick={() => start("discounts")}><Percent size={16} />Chỉnh CK</Button>
      <button type="button" className="bt-icon-button" aria-label="Bỏ chọn sản phẩm" title="Bỏ chọn" disabled={busy || !selected.length} onClick={clear}><X size={17} /></button>
      {total > MAX_BULK_PRODUCTS && <span className="text-xs text-text-muted">Tối đa {MAX_BULK_PRODUCTS} sản phẩm mỗi lần</span>}
    </div>
    {!action && error && <p role="alert" className="mb-3 text-sm text-danger">{error}</p>}
    <Modal open={Boolean(action)} onClose={() => { if (!busy) { setAction(undefined); setError(""); } }} title={title} busy={busy} trackChanges={false}>
      <form onSubmit={apply} className="space-y-5">
        <p className="text-sm text-text-secondary">Cập nhật {selected.length} sản phẩm đã chọn.</p>
        {action === "discounts" && <fieldset disabled={busy} className="space-y-4">
          <div className="flex items-start gap-3"><input type="checkbox" aria-label="Áp dụng CK B2C" checked={changeB2c} onChange={event => setChangeB2c(event.target.checked)} className="mt-2 h-4 w-4 accent-blue-brand" /><div className="flex-1"><Field label="Chiết khấu B2C (%)"><input type="number" min={0} max={MAX_PRODUCT_DISCOUNT} step={0.01} required={changeB2c} disabled={!changeB2c} value={b2c} onChange={event => setB2c(event.target.value)} className="bt-input" /></Field></div></div>
          <div className="flex items-start gap-3"><input type="checkbox" aria-label="Áp dụng CK B2B" checked={changeB2b} onChange={event => setChangeB2b(event.target.checked)} className="mt-2 h-4 w-4 accent-blue-brand" /><div className="flex-1"><Field label="Chiết khấu B2B (%)"><input type="number" min={0} max={MAX_PRODUCT_DISCOUNT} step={0.01} required={changeB2b} disabled={!changeB2b} value={b2b} onChange={event => setB2b(event.target.value)} className="bt-input" /></Field></div></div>
          <p className="text-sm text-text-secondary">Giá sau CK tính từ giá niêm yết của từng sản phẩm. Bảng giá riêng theo khách/nhóm vẫn được ưu tiên.</p>
        </fieldset>}
        {action === "publish" && <p className="text-sm text-text-secondary">Sản phẩm cần đủ giá, thông số và ảnh. Danh mục đang ẩn cần được công khai trong trang Danh mục.</p>}
        {action === "private" && <p className="text-sm text-text-secondary">Các sản phẩm được chọn sẽ ẩn khỏi catalog công khai.</p>}
        {error && <p role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-danger">{error}</p>}
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" disabled={busy} onClick={() => setAction(undefined)}>Hủy</Button><Button type="submit" loading={saving} disabled={busy && !saving}><Save size={16} />Áp dụng</Button></div>
      </form>
    </Modal>
  </>;
}

"use client";

import { useRef, useState } from "react";
import { CheckCheck, Globe, LockKeyhole, Percent, Save, X } from "lucide-react";
import { Button, Field, Modal } from "@/components/ui";
import { api } from "@/lib/api-client";
import { MAX_PRODUCT_DISCOUNT } from "@/lib/product-pricing";
import Link from "next/link";
export { AdminSelectionCheckbox as ProductSelectionCheckbox } from "./admin-selection-checkbox";

export const MAX_BULK_PRODUCTS = 500;
export type SelectedProduct = { id: string; revision: number; code: string };
type BulkAction = "publish" | "private" | "discounts";
type BulkResult = { updated: number; action: BulkAction; hiddenCategories: string[]; skipped?: { id: string; code: string; name: string; reason: string }[] };

export function ProductBulkActions({ selected, total, busy, setBusy, clear, selectAll, onUpdated }: { selected: SelectedProduct[]; total: number; busy: boolean; setBusy: (busy: boolean) => void; clear: () => void; selectAll: () => Promise<void>; onUpdated: (result: BulkResult) => Promise<void> }) {
  const [action, setAction] = useState<BulkAction>();
  const [error, setError] = useState("");
  const [report, setReport] = useState<BulkResult>();
  const submitting = useRef(false);
  const [selecting, setSelecting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [changeB2c, setChangeB2c] = useState(true), [changeB2b, setChangeB2b] = useState(true);
  const [b2c, setB2c] = useState("0"), [b2b, setB2b] = useState("0");
  const start = (value: BulkAction) => { setError(""); setReport(undefined); setChangeB2c(true); setChangeB2b(true); setB2c("0"); setB2b("0"); setAction(value); };
  const chooseAll = async () => {
    setError(""); setSelecting(true); setBusy(true);
    try { await selectAll(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể chọn sản phẩm."); }
    finally { setSelecting(false); setBusy(false); }
  };
  const apply = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!action || busy || submitting.current || !selected.length) return;
    setError("");
    if (action === "discounts") {
      if (!changeB2c && !changeB2b) { setError("Chọn CK B2C hoặc CK B2B để cập nhật."); return; }
      const values = [changeB2c ? b2c : undefined, changeB2b ? b2b : undefined].filter((value): value is string => value !== undefined);
      if (values.some(value => value.trim() === "" || !Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > MAX_PRODUCT_DISCOUNT || Math.abs(Number(value) * 100 - Math.round(Number(value) * 100)) > 0.000001)) { setError("Chiết khấu phải từ 0 đến 99,99%, tối đa hai chữ số thập phân."); return; }
    }
    submitting.current = true; setBusy(true); setSaving(true);
    try {
      const result = await api<BulkResult>("/admin/products/bulk", { method: "POST", body: JSON.stringify({ action, products: selected.map(({ id, revision }) => ({ id, revision })), ...(action === "discounts" ? { ...(changeB2c ? { b2cDiscount: Number(b2c) } : {}), ...(changeB2b ? { b2bDiscount: Number(b2b) } : {}) } : {}) }) });
      setReport(result.skipped?.length ? result : undefined);
      setAction(undefined); clear();
      await onUpdated(result);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể cập nhật sản phẩm."); }
    finally { submitting.current = false; setSaving(false); setBusy(false); }
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
    {report && <section aria-label="Kết quả công khai sản phẩm" className="mb-4 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
      <div className="flex items-start justify-between gap-3">
        <p role="status" className="min-w-0 leading-6"><strong>{report.updated ? `Đã công khai ${report.updated} sản phẩm.` : "Chưa công khai sản phẩm nào."}</strong> Bỏ qua {report.skipped?.length} sản phẩm cần bổ sung thông tin.</p>
        <button type="button" className="bt-icon-button" title="Đóng kết quả" aria-label="Đóng kết quả công khai" onClick={() => setReport(undefined)}><X size={17} /></button>
      </div>
      <p className="mt-1 text-xs leading-5">Sản phẩm bị bỏ qua giữ nguyên trạng thái. Bổ sung thông tin rồi chọn công khai lại.</p>
      <ul aria-label="Sản phẩm chưa công khai" className="mt-3 max-h-72 space-y-3 overflow-y-auto border-t border-amber-200 pt-3">
        {report.skipped?.map(product => <li key={product.id} className="flex flex-wrap items-start justify-between gap-2 border-b border-amber-200 pb-3 last:border-0 last:pb-0">
          <div className="min-w-0 flex-1 break-words"><strong>{product.code}</strong><span className="ml-2">{product.name}</span><p className="mt-1 text-xs leading-5">{product.reason}</p></div>
          <Link href={`/admin/products/${encodeURIComponent(product.id)}/edit`} className="inline-flex min-h-9 shrink-0 items-center px-2 font-medium text-primary hover:underline" aria-label={`Sửa sản phẩm bị bỏ qua ${product.code}`}>Bổ sung</Link>
        </li>)}
      </ul>
      {!!report.hiddenCategories.length && <p className="mt-3 text-xs leading-5">{report.hiddenCategories.length} danh mục vẫn đang ẩn. Bật hiển thị tại trang Danh mục khi cần.</p>}
    </section>}
    <Modal open={Boolean(action)} onClose={() => { if (!busy) { setAction(undefined); setError(""); } }} title={title} busy={busy} trackChanges={false}>
      <form onSubmit={apply} className="space-y-5">
        <p className="text-sm text-text-secondary">Cập nhật {selected.length} sản phẩm đã chọn.</p>
        {action === "discounts" && <fieldset disabled={busy} className="space-y-4">
          <div className="flex items-start gap-3"><input type="checkbox" aria-label="Áp dụng CK B2C" checked={changeB2c} onChange={event => setChangeB2c(event.target.checked)} className="mt-2 h-4 w-4 accent-brand" /><div className="flex-1"><Field label="Chiết khấu B2C (%)"><input type="number" min={0} max={MAX_PRODUCT_DISCOUNT} step={0.01} required={changeB2c} disabled={!changeB2c} value={b2c} onChange={event => setB2c(event.target.value)} className="bt-input" /></Field></div></div>
          <div className="flex items-start gap-3"><input type="checkbox" aria-label="Áp dụng CK B2B" checked={changeB2b} onChange={event => setChangeB2b(event.target.checked)} className="mt-2 h-4 w-4 accent-brand" /><div className="flex-1"><Field label="Chiết khấu B2B (%)"><input type="number" min={0} max={MAX_PRODUCT_DISCOUNT} step={0.01} required={changeB2b} disabled={!changeB2b} value={b2b} onChange={event => setB2b(event.target.value)} className="bt-input" /></Field></div></div>
          <p className="text-sm text-text-secondary">Giá sau CK tính từ giá niêm yết của từng sản phẩm. Bảng giá riêng theo khách/nhóm vẫn được ưu tiên.</p>
        </fieldset>}
        {action === "publish" && <p className="text-sm leading-6 text-text-secondary">Sản phẩm đủ giá, thông số, danh mục và ảnh sẽ được công khai. Sản phẩm chưa đủ điều kiện được bỏ qua và liệt kê sau khi áp dụng. Danh mục đang ẩn cần được bật hiển thị trong trang Danh mục.</p>}
        {action === "private" && <p className="text-sm text-text-secondary">Các sản phẩm được chọn sẽ ẩn khỏi catalog công khai.</p>}
        {error && <p role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-danger">{error}</p>}
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" disabled={busy} onClick={() => setAction(undefined)}>Hủy</Button><Button type="submit" loading={saving} disabled={busy && !saving}><Save size={16} />Áp dụng</Button></div>
      </form>
    </Modal>
  </>;
}

"use client";

import { useRef, useState } from "react";
import { CheckCheck, Eye, EyeOff, Save, X } from "lucide-react";
import { api } from "@/lib/api-client";
import { MAX_BULK_CATEGORIES, type CategoryBulkResult, type SelectedCategory } from "@/lib/category-management";
import { Button, Modal } from "@/components/ui";

type CategoryBulkActionsProps = {
  selected: SelectedCategory[]; total: number; busy: boolean;
  setBusy: (value: boolean) => void; clear: () => void; selectAll: () => void;
  onUpdated: (result: CategoryBulkResult) => Promise<void>;
};

export function CategoryBulkActions({ selected, total, busy, setBusy, clear, selectAll, onUpdated }: CategoryBulkActionsProps) {
  const [action, setAction] = useState<"show" | "hide">();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);
  const close = () => { if (!busy) { setAction(undefined); setError(""); } };
  const start = (value: "show" | "hide") => { setError(""); setAction(value); };
  const apply = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!action || busy || submitting.current || !selected.length) return;
    submitting.current = true;
    setError(""); setBusy(true); setSaving(true);
    try {
      const result = await api<CategoryBulkResult>("/admin/categories/bulk", { method: "POST", body: JSON.stringify({ action, categories: selected.map(({ slug, revision }) => ({ slug, revision })) }) });
      setAction(undefined); clear();
      await onUpdated(result);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể cập nhật danh mục."); }
    finally { submitting.current = false; setSaving(false); setBusy(false); }
  };
  return <>
    <div className="mb-3 flex min-h-12 flex-wrap items-center gap-2 border-y border-border py-2" aria-label="Thao tác danh mục hàng loạt" aria-busy={busy || undefined}>
      <span className="mr-2 min-w-24 text-sm font-medium text-primary" role="status">Đã chọn {selected.length}</span>
      <Button type="button" variant="secondary" disabled={busy || !total || selected.length === total || total > MAX_BULK_CATEGORIES} onClick={selectAll}><CheckCheck size={16} />Chọn tất cả {total}</Button>
      <Button type="button" variant="secondary" disabled={busy || !selected.length} onClick={() => start("show")}><Eye size={16} />Hiển thị</Button>
      <Button type="button" variant="secondary" disabled={busy || !selected.length} onClick={() => start("hide")}><EyeOff size={16} />Ẩn danh mục</Button>
      <button type="button" className="bt-icon-button" title="Bỏ chọn" aria-label="Bỏ chọn danh mục" disabled={busy || !selected.length} onClick={clear}><X size={17} /></button>
      {total > MAX_BULK_CATEGORIES && <span className="text-xs text-text-muted">Tối đa {MAX_BULK_CATEGORIES} danh mục mỗi lần</span>}
    </div>
    {!action && error && <p role="alert" className="mb-3 text-sm text-danger">{error}</p>}
    <Modal open={Boolean(action)} onClose={close} title={action === "show" ? "Hiển thị danh mục hàng loạt" : "Ẩn danh mục hàng loạt"} busy={busy} trackChanges={false}>
      <form onSubmit={apply} className="space-y-4">
        <p className="text-sm text-text-secondary">{action === "show" ? "Hiển thị" : "Ẩn"} {selected.length} danh mục đã chọn.</p>
        <ul className="max-h-40 list-disc space-y-1 overflow-y-auto pl-5 text-sm text-primary">{selected.map(category => <li key={category.slug}>{category.name}</li>)}</ul>
        <p className="text-sm leading-6 text-text-secondary">Chỉ thay đổi hiển thị danh mục trên website. Sản phẩm riêng tư vẫn giữ nguyên; sản phẩm công khai không tự chuyển sang riêng tư.</p>
        {action === "show" && <p className="text-sm text-text-secondary">Danh mục cần ảnh đại diện hợp lệ để hiển thị.</p>}
        {error && <p role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-danger">{error}</p>}
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" disabled={busy} onClick={close}>Hủy</Button><Button type="submit" loading={saving} disabled={busy && !saving}><Save size={16} />Áp dụng</Button></div>
      </form>
    </Modal>
  </>;
}

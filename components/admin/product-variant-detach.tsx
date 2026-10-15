"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw, Unlink2 } from "lucide-react";
import { Button, Modal } from "@/components/ui";
import { useCommerce } from "@/components/commerce-provider";
import { api } from "@/lib/api-client";
import type { ApiAdminState } from "@/lib/api-types";

type AdminProduct = ApiAdminState["products"][number];

export function ProductVariantDetach({ target, groupId, onClose, onUpdated }: {
  target: AdminProduct; groupId: string; onClose: () => void; onUpdated: () => Promise<void>;
}) {
  const { notice } = useCommerce();
  const [members, setMembers] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const submitting = useRef(false);
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(""); setMembers([]);
    void api<{ products: AdminProduct[] }>(`/admin/products/${encodeURIComponent(target.id)}/variants`).then(({ products }) => {
      if (cancelled) return;
      if (products.length < 2 || !products.some(product => product.id === target.id) || products.some(product => product.variantGroupId !== groupId || !product.revision)) {
        throw new Error("SKU hoặc nhóm biến thể đã thay đổi. Đóng hộp thoại và tải lại sản phẩm.");
      }
      setMembers(products);
    }).catch(cause => { if (!cancelled) setError(cause instanceof Error ? cause.message : "Không thể tải nhóm biến thể."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [target.id, groupId, version]);
  const detach = async () => {
    if (submitting.current || loading || error || !members.length) return;
    submitting.current = true; setBusy(true);
    try {
      await api(`/admin/products/${encodeURIComponent(target.id)}/detach-variant`, {
        method: "POST", body: JSON.stringify({ groupId, products: members.map(({ id, revision }) => ({ id, revision })) }),
      });
      notice(`Đã tách ${target.code} khỏi nhóm biến thể.`);
      await onUpdated().catch(() => notice("Đã tách SKU. Tải lại trang để xem nhóm mới."));
      onClose();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể tách SKU khỏi nhóm."); }
    finally { submitting.current = false; setBusy(false); }
  };
  return <Modal open onClose={onClose} title="Tách SKU khỏi nhóm" busy={busy} trackChanges={false}>
    <div className="space-y-4">
      <p className="text-sm leading-6 text-text-secondary">Tách <strong className="text-primary">{target.code}</strong> khỏi nhóm hiện tại? SKU này sẽ trở thành sản phẩm độc lập, không còn hiển thị trong lựa chọn biến thể của các sản phẩm còn lại.</p>
      <p className="text-sm leading-6 text-text-secondary">Giá, ảnh, tồn kho, nội dung và thuộc tính riêng của SKU được giữ nguyên.</p>
      {target.id === groupId && <p className="rounded border border-border bg-section p-3 text-sm leading-6 text-text-secondary">Đây là SKU gốc. Hệ thống sẽ chọn một SKU còn lại làm gốc để giữ nhóm hiện tại.</p>}
      {loading && <p role="status" className="text-sm text-text-secondary">Đang tải nhóm biến thể mới nhất...</p>}
      {error && <div role="alert" className="space-y-2 rounded border border-red-200 bg-red-50 p-3 text-sm text-danger"><p>{error}</p><Button type="button" variant="secondary" disabled={busy || loading} onClick={() => setVersion(value => value + 1)}><RefreshCw size={16} />Tải lại nhóm biến thể</Button></div>}
      <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
        <Button type="button" variant="secondary" disabled={busy} onClick={onClose}>Hủy</Button>
        <Button type="button" loading={busy} disabled={loading || Boolean(error) || !members.length} onClick={() => void detach()}><Unlink2 size={16} />Tách khỏi nhóm</Button>
      </div>
    </div>
  </Modal>;
}

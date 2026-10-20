"use client";

import { useEffect, useRef, useState } from "react";
import { Link2, RefreshCw } from "lucide-react";
import { Button, Field, Modal } from "@/components/ui";
import { useCommerce } from "@/components/commerce-provider";
import { api } from "@/lib/api-client";
import type { AdminBrowsePage, ApiAdminState } from "@/lib/api-types";
import { useApiResource } from "@/lib/use-api-resource";
import { variantDimension, variantKey } from "@/lib/product-variants";
import { useAdmin } from "./admin-provider";

type AdminProduct = ApiAdminState["products"][number];
type Group = { products: AdminProduct[] };
const SEARCH_DELAY_MS = 250;
const SEARCH_PAGE_SIZE = 10;

function unavailableReason(product: AdminProduct, root: AdminProduct, members: AdminProduct[]) {
  if (members.some(member => member.id === product.id)) return "Đã có trong nhóm này";
  if (product.variantGroupId && product.variantGroupId !== product.id) return "Cần tách khỏi nhóm hiện tại trước";
  if (product.brand !== root.brand || product.category !== root.category || product.unit !== root.unit) return "Khác thương hiệu, danh mục hoặc đơn vị tính";
  return "";
}

function suggestedValue(root: AdminProduct, candidate: AdminProduct, name: string) {
  const existing = candidate.variantAttributes?.find(attribute => variantKey(attribute.name) === variantKey(name));
  if (existing) return existing.value;
  const attributes = root.variantAttributes || [];
  if (variantDimension(attributes, "size")?.name === name) return candidate.size || "";
  if (variantDimension(attributes, "color")?.name === name) return candidate.color || "";
  return "";
}

export function ProductVariantAttach({ product, onClose, onUpdated }: {
  product: AdminProduct; onClose: () => void; onUpdated: () => Promise<void>;
}) {
  const { branch } = useAdmin();
  const { notice } = useCommerce();
  const group = useApiResource<Group>(`/admin/products/${encodeURIComponent(product.id)}/variants`);
  const members = group.data?.products || [];
  const current = members.find(member => member.id === product.id);
  const root = members.find(member => member.id === (current?.variantGroupId || product.id));
  const groupError = group.error || (group.data && (!root || !current || members.some(member => !member.revision)) ? "Nhóm biến thể không hợp lệ. Đóng hộp thoại và tải lại sản phẩm." : "");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [targetId, setTargetId] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const submitting = useRef(false);
  useEffect(() => {
    const timer = setTimeout(() => setSearch(query.trim()), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [query]);
  const params = new URLSearchParams({ resource: "products", branch, page: String(page), pageSize: String(SEARCH_PAGE_SIZE), status: "all", q: search, brand: root?.brand || "", category: root?.category || "" });
  const results = useApiResource<AdminBrowsePage>(`/admin/browse?${params}`, Boolean(root) && !group.loading && !groupError);
  const candidateGroup = useApiResource<Group>(`/admin/products/${encodeURIComponent(targetId)}/variants`, Boolean(targetId));
  const candidate = candidateGroup.data?.products.find(item => item.id === targetId);
  const candidateError = candidateGroup.error || (candidateGroup.data && (!candidate || !candidate.revision) ? "Không tìm thấy phiên bản mới nhất của SKU." : "")
    || (candidateGroup.data && candidateGroup.data.products.length !== 1 ? "Sản phẩm này đang có nhóm biến thể riêng. Tách SKU khỏi nhóm đó trước khi liên kết." : "")
    || (candidate && root ? unavailableReason(candidate, root, members) : "");
  const waitingForSearch = query.trim() !== search || results.loading;
  const attributes = (root?.variantAttributes || []).map(attribute => ({ name: attribute.name, value: values[attribute.name] ?? (candidate ? suggestedValue(root!, candidate, attribute.name) : "") }));
  const ready = root && candidate && !group.loading && !candidateGroup.loading && !groupError && !candidateError && !needsRefresh;
  const reload = async () => {
    setError(""); setNeedsRefresh(false); setTargetId(""); setValues({});
    await group.reload();
    await results.reload();
  };
  const attach = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!ready || submitting.current) return;
    submitting.current = true; setBusy(true); setError("");
    try {
      await api(`/admin/products/${encodeURIComponent(product.id)}/attach-variant`, {
        method: "POST", body: JSON.stringify({ groupId: root.id, products: members.map(({ id, revision }) => ({ id, revision })), targetId: candidate.id, targetRevision: candidate.revision, attributes: attributes.map(attribute => ({ name: attribute.name, value: attribute.value.trim() })) }),
      });
      notice(`Đã liên kết ${candidate.code} vào nhóm biến thể.`);
      await onUpdated().catch(() => notice("Đã liên kết SKU. Tải lại trang để xem nhóm mới."));
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể liên kết SKU.");
      setNeedsRefresh(true);
    } finally { submitting.current = false; setBusy(false); }
  };
  return <Modal open onClose={onClose} title="Liên kết sản phẩm có sẵn" busy={busy} trackChanges={false}>
    <form onSubmit={event => void attach(event)} className="space-y-4">
      <p className="text-sm leading-6 text-text-secondary">Chọn sản phẩm đã tồn tại để thêm vào nhóm của <strong className="text-primary">{product.code}</strong>. Giá, ảnh, tồn kho và nội dung riêng được giữ nguyên.</p>
      {group.loading && <p role="status" className="text-sm text-text-secondary">Đang tải nhóm biến thể...</p>}
      {groupError && <p role="alert" className="text-sm text-danger">{groupError}</p>}
      {root && !groupError && <fieldset disabled={busy} className="min-w-0 space-y-4">
        <Field label="Tìm sản phẩm theo tên hoặc mã SKU"><input type="search" className="bt-input" maxLength={200} value={query} onChange={event => { setQuery(event.target.value); setPage(1); }} placeholder="Nhập tên hoặc mã SKU..." /></Field>
        <p className="text-xs leading-5 text-text-secondary">Tìm trong sản phẩm cùng thương hiệu {root.brand} và danh mục với sản phẩm gốc, gồm cả sản phẩm riêng tư. SKU cần cùng đơn vị tính ({root.unit}).</p>
        <div aria-busy={waitingForSearch} className="space-y-2">
          {waitingForSearch && <p role="status" className="text-sm text-text-secondary">Đang tìm sản phẩm...</p>}
          {results.error && <p role="alert" className="text-sm text-danger">{results.error}</p>}
          {!waitingForSearch && !results.error && results.data && <>
            {!results.data.products?.length && <p className="text-sm text-text-secondary">Không tìm thấy sản phẩm phù hợp.</p>}
            <ul aria-label="Sản phẩm có sẵn" className="max-h-60 space-y-2 overflow-y-auto">
              {results.data.products?.map(item => {
                const reason = unavailableReason(item, root, members);
                return <li key={item.id}><label className={`flex items-start gap-3 rounded-md border p-3 text-sm ${targetId === item.id ? "border-brand bg-section" : "border-border"} ${reason ? "opacity-60" : "cursor-pointer"}`}>
                  <input type="radio" name="existing-variant" className="mt-1 accent-brand" value={item.id} checked={targetId === item.id} disabled={Boolean(reason)} onChange={() => { setTargetId(item.id); setValues({}); setError(""); }} aria-label={`Chọn ${item.code}`} />
                  <span className="min-w-0 break-words"><strong className="block text-primary">{item.code}</strong><span className="block text-text-secondary">{item.name}</span>{reason && <span className="mt-1 block text-xs text-danger">{reason}</span>}</span>
                </label></li>;
              })}
            </ul>
            {results.data.pagination.totalPages > 1 && <div className="flex items-center justify-between gap-2 text-xs text-text-secondary">
              <Button type="button" variant="secondary" disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Trang trước</Button>
              <span>Trang {page}/{results.data.pagination.totalPages}</span>
              <Button type="button" variant="secondary" disabled={page >= results.data.pagination.totalPages} onClick={() => setPage(value => value + 1)}>Trang sau</Button>
            </div>}
          </>}
        </div>
        {candidateGroup.loading && <p role="status" className="text-sm text-text-secondary">Đang kiểm tra SKU...</p>}
        {candidateError && <p role="alert" className="text-sm text-danger">{candidateError}</p>}
        {candidate && !candidateGroup.loading && !candidateError && <div className="space-y-3 rounded-md border border-border bg-section/40 p-3">
          <h3 className="text-sm font-semibold text-primary">Giá trị biến thể của {candidate.code}</h3>
          {attributes.map(attribute => <Field key={attribute.name} label={`Giá trị ${attribute.name}`} required><input className="bt-input" required maxLength={100} value={attribute.value} onChange={event => { setValues(previous => ({ ...previous, [attribute.name]: event.target.value })); setError(""); }} /></Field>)}
          {!attributes.length && <p className="text-sm leading-6 text-text-secondary">Nhóm chưa có loại biến thể. Khách sẽ chọn theo mã SKU. Bạn có thể thêm loại tại “Thiết lập loại biến thể” sau khi liên kết.</p>}
        </div>}
      </fieldset>}
      {error && <p role="alert" className="whitespace-pre-line rounded border border-red-200 bg-red-50 p-3 text-sm text-danger">{error}</p>}
      {(needsRefresh || groupError || results.error || candidateError) && <Button type="button" variant="secondary" disabled={busy || group.loading} onClick={() => void reload()}><RefreshCw size={16} />Tải lại dữ liệu liên kết</Button>}
      <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
        <Button type="button" variant="secondary" disabled={busy} onClick={onClose}>Hủy</Button>
        <Button type="submit" loading={busy} disabled={!ready || attributes.some(attribute => !attribute.value.trim())}><Link2 size={16} />Liên kết vào nhóm</Button>
      </div>
    </form>
  </Modal>;
}

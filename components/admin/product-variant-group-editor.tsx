"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ArrowLeft, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { api, apiMode } from "@/lib/api-client";
import type { ApiAdminState } from "@/lib/api-types";
import { variantKey } from "@/lib/product-variants";
import { useApiResource } from "@/lib/use-api-resource";
import { useUnsavedForm } from "@/lib/unsaved-form";
import { useCommerce } from "@/components/commerce-provider";
import { Button, EmptyState, Field } from "@/components/ui";
import { useAdmin } from "./admin-provider";
import { AdminHeading } from "./admin-ui";
import { ResourceStatus } from "./admin-resource";

type AdminProduct = ApiAdminState["products"][number];
type VariantGroup = { products: AdminProduct[] };
const MAX_VARIANT_ATTRIBUTES = 6;
const ATTRIBUTE_PRESETS = ["Màu sắc", "Hướng", "Kích thước"];

export function ProductVariantGroupPage({ id }: { id: string }) {
  const { products, reset: reload } = useAdmin();
  const { sessionUser } = useCommerce();
  const [version, setVersion] = useState(0);
  const authorized = ["admin", "boss", "sales"].includes(sessionUser?.role || "");
  // Editing needs a fresh group snapshot, including revisions of private SKUs.
  const resource = useApiResource<VariantGroup>(`/admin/products/${encodeURIComponent(id)}/variants`, apiMode && authorized);
  const groupProducts = apiMode ? resource.data?.products || [] : products;
  const selected = groupProducts.find(product => product.id === id);
  const root = groupProducts.find(product => product.id === (selected?.variantGroupId || id));
  if (apiMode && !authorized) return <p role="alert">Tài khoản không có quyền quản lý sản phẩm.</p>;
  if (apiMode && (resource.loading || resource.error || !resource.data)) return <ResourceStatus loading={resource.loading} error={resource.error} reload={resource.reload} />;
  if (!root) return <EmptyState title="Không tìm thấy sản phẩm gốc" href="/admin/products" action="Về danh sách" />;
  const siblings = groupProducts.filter(product => product.id === root.id || product.variantGroupId === root.id);
  return <VariantGroupEditor key={`${root.id}-${version}`} root={root} siblings={siblings} editId={id} onReload={async () => {
    await resource.reload();
    setVersion(value => value + 1);
  }} onSaved={async () => { await reload(); }} />;
}

function VariantGroupEditor({ root, siblings: currentSiblings, editId, onReload, onSaved }: { root: AdminProduct; siblings: AdminProduct[]; editId: string; onReload: () => Promise<void>; onSaved: () => Promise<void> }) {
  const router = useRouter();
  const { notice, reloadCatalog } = useCommerce();
  const [siblings] = useState(currentSiblings);
  const [names, setNames] = useState(() => root.variantAttributes?.map(attribute => attribute.name) || []);
  const [values, setValues] = useState(() => siblings.map(product => names.map((_, index) => product.variantAttributes?.[index]?.value || "")));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const saving = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const { markSaved, close } = useUnsavedForm(formRef, true, busy, JSON.stringify([names, values]));
  const editUrl = `/admin/products/${encodeURIComponent(editId)}/edit`;
  const add = (name: string) => {
    if (names.length >= MAX_VARIANT_ATTRIBUTES) return;
    setNames([...names, name]); setValues(values.map(row => [...row, ""])); setError("");
  };
  const remove = (index: number) => {
    setNames(names.filter((_, position) => position !== index));
    setValues(values.map(row => row.filter((_, position) => position !== index))); setError("");
  };
  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving.current || !apiMode) return;
    if (names.some(name => !name.trim()) || new Set(names.map(variantKey)).size !== names.length) { setError("Tên các loại biến thể phải được nhập đầy đủ và khác nhau."); return; }
    if (values.some(row => row.some(value => !value.trim()))) { setError("Nhập giá trị cho từng loại biến thể của tất cả SKU."); return; }
    saving.current = true; setBusy(true); setError("");
    try {
      const path = `/admin/products/${encodeURIComponent(root.id)}/variants`;
      const latest = await api<VariantGroup>(path);
      const byId = new Map(latest.products.map(product => [product.id, product]));
      const definition = (product: AdminProduct) => JSON.stringify([product.code, product.variantGroupId, product.variantAttributes || []]);
      if (latest.products.length !== siblings.length || siblings.some(product => {
        const current = byId.get(product.id);
        return !current || definition(current) !== definition(product);
      })) throw new Error("Các thuộc tính hoặc danh sách SKU trong nhóm đã thay đổi. Tải lại nhóm trước khi lưu.");
      // Rebase unrelated price/content changes; the backend still checks these
      // fresh revisions atomically in case another write races with this save.
      await api(path, { method: "PATCH", body: JSON.stringify({ products: siblings.map((product, row) => ({ id: product.id, revision: byId.get(product.id)!.revision, attributes: names.map((name, column) => ({ name: name.trim(), value: values[row][column].trim() })) })) }) });
      markSaved(); notice("Đã cập nhật loại biến thể cho toàn bộ SKU trong nhóm.");
      await reloadCatalog().catch(cause => notice(cause instanceof Error ? cause.message : "Không thể tải catalog."));
      await onSaved().catch(cause => notice(cause instanceof Error ? cause.message : "Không thể tải danh sách sản phẩm."));
      await onReload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể lưu loại biến thể.");
    } finally { saving.current = false; setBusy(false); }
  };
  return <>
    <Link href={editUrl} className="mb-4 inline-flex items-center gap-2 text-sm text-text-secondary"><ArrowLeft size={16} />Về sửa sản phẩm</Link>
    <AdminHeading title="Thiết lập loại biến thể" subtitle={root.name} />
    <form ref={formRef} onSubmit={save} className="min-w-0 space-y-6">
      <p className="text-sm text-text-secondary">Thêm, đổi tên hoặc xóa loại biến thể tại đây sẽ áp dụng cho toàn bộ {siblings.length} SKU trong nhóm. Mã hàng, giá, hình ảnh và tồn kho riêng của từng SKU được giữ nguyên.</p>
      {error && <p role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-danger">{error}</p>}
      {error && <Button type="button" variant="secondary" disabled={busy} onClick={() => close(() => void onReload())}><RefreshCw size={16} />Tải lại nhóm biến thể</Button>}
      <fieldset disabled={busy} className="min-w-0 space-y-6">
        <section className="space-y-4">
          <h2 className="text-base font-semibold text-primary">Các loại biến thể</h2>
          <div className="flex flex-wrap gap-2">
            {ATTRIBUTE_PRESETS.map(name => <Button key={name} type="button" variant="secondary" disabled={names.length >= MAX_VARIANT_ATTRIBUTES || names.some(item => variantKey(item) === variantKey(name))} onClick={() => add(name)}><Plus size={16} />Thêm {name}</Button>)}
            <Button type="button" variant="secondary" disabled={names.length >= MAX_VARIANT_ATTRIBUTES} onClick={() => add("")}><Plus size={16} />Thêm loại khác</Button>
          </div>
          {!names.length && <p className="text-sm text-text-secondary">Nhóm không còn loại biến thể. Khi lưu, các loại cũ sẽ được xóa khỏi tất cả SKU; các SKU vẫn được giữ trong nhóm.</p>}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{names.map((name, index) => <div key={index} className="rounded border border-border p-3">
            <div className="flex items-end gap-2"><div className="min-w-0 flex-1"><Field label={`Tên loại biến thể ${index + 1}`}><input className="bt-input" required maxLength={50} value={name} onChange={event => setNames(names.map((item, position) => position === index ? event.target.value : item))} placeholder="Ví dụ: Hướng" /></Field></div><button type="button" className="bt-icon-button shrink-0" aria-label={`Xóa loại biến thể ${index + 1}`} onClick={() => remove(index)}><Trash2 size={17} /></button></div>
            <p className="mt-2 break-words text-xs text-text-secondary">Giá trị: {Array.from(new Set(values.map(row => row[index]?.trim()).filter(Boolean))).join(", ") || "Chưa nhập"}</p>
          </div>)}</div>
        </section>
        <section className="min-w-0 space-y-3">
          <h2 className="text-base font-semibold text-primary">Giá trị theo từng SKU</h2>
          <div className="overflow-x-auto rounded border border-border" role="region" aria-label="Giá trị biến thể theo SKU" tabIndex={0}>
            <table className="bt-admin-table"><thead><tr><th scope="col">Mã SKU</th>{names.map((name, index) => <th key={index} scope="col">{name || `Loại ${index + 1}`}</th>)}</tr></thead>
              <tbody>{siblings.map((product, row) => <tr key={product.id}><th scope="row" className="min-w-[150px] p-3 text-left text-sm font-medium">{product.code}</th>{names.map((name, column) => <td key={column} className="min-w-[180px]"><input className="bt-input" aria-label={`${name || `Loại ${column + 1}`} của ${product.code}`} maxLength={100} required value={values[row][column]} onChange={event => setValues(values.map((items, position) => position === row ? items.map((item, index) => index === column ? event.target.value : item) : items))} placeholder={name === "Hướng" ? "Ví dụ: Trái, Phải" : name === "Màu sắc" ? "Ví dụ: Đen" : name === "Kích thước" ? "Ví dụ: 800mm" : "Nhập giá trị"} /></td>)}</tr>)}</tbody>
            </table>
          </div>
          <p className="text-xs text-text-secondary">Nếu các SKU còn cùng thông số sau khi xóa một loại, khách vẫn có thể chọn từng mã hàng trên trang sản phẩm.</p>
        </section>
      </fieldset>
      {root.variantGroupId && <Link href={`/admin/products/new?variantOf=${encodeURIComponent(root.id)}`} className="bt-button-secondary"><Plus size={16} />Tạo SKU biến thể</Link>}
      {!apiMode && <p role="alert" className="text-sm text-text-secondary">Chưa kết nối API. Không thể lưu thiết lập.</p>}
      <div className="bt-admin-save-bar"><Button type="button" variant="secondary" disabled={busy} onClick={() => close(() => router.push(editUrl))}>Hủy</Button><Button type="submit" loading={busy} disabled={!apiMode}><Save size={17} />Lưu thiết lập biến thể</Button></div>
    </form>
  </>;
}

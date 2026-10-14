"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ArrowLeft, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { api, apiMode } from "@/lib/api-client";
import type { ApiAdminState } from "@/lib/api-types";
import { variantKey } from "@/lib/product-variants";
import { useUnsavedForm } from "@/lib/unsaved-form";
import { useCommerce } from "@/components/commerce-provider";
import { Button, EmptyState, Field } from "@/components/ui";
import { useAdmin } from "./admin-provider";
import { AdminHeading } from "./admin-ui";

type AdminProduct = ApiAdminState["products"][number];
const MAX_VARIANT_ATTRIBUTES = 6;
const ATTRIBUTE_PRESETS = ["Màu sắc", "Hướng", "Kích thước"];

export function ProductVariantGroupPage({ id }: { id: string }) {
  const { products, loadedResources, reset: reload } = useAdmin();
  const { sessionUser } = useCommerce();
  const [version, setVersion] = useState(0);
  const selected = products.find(product => product.id === id);
  const root = products.find(product => product.id === (selected?.variantGroupId || id));
  if (apiMode && !["admin", "boss", "sales"].includes(sessionUser?.role || "")) return <p role="alert">Tài khoản không có quyền quản lý sản phẩm.</p>;
  if (!loadedResources?.includes("products") && !root) return <p role="status">Đang tải nhóm biến thể...</p>;
  if (!root) return <EmptyState title="Không tìm thấy sản phẩm gốc" href="/admin/products" action="Về danh sách" />;
  const siblings = products.filter(product => product.id === root.id || product.variantGroupId === root.id);
  return <VariantGroupEditor key={`${root.id}-${version}`} root={root} siblings={siblings} editId={id} onReload={async () => { await reload(); setVersion(value => value + 1); }} />;
}

function VariantGroupEditor({ root, siblings, editId, onReload }: { root: AdminProduct; siblings: AdminProduct[]; editId: string; onReload: () => Promise<void> }) {
  const router = useRouter();
  const { notice, reloadCatalog } = useCommerce();
  const [names, setNames] = useState(() => root.variantAttributes?.map(attribute => attribute.name) || []);
  const [values, setValues] = useState(() => siblings.map(product => names.map((_, index) => product.variantAttributes?.[index]?.value || "")));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
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
    if (busy || !apiMode) return;
    if (!names.length || names.some(name => !name.trim()) || new Set(names.map(variantKey)).size !== names.length) { setError("Nhập từ 1 đến 6 loại biến thể với tên khác nhau."); return; }
    if (values.some(row => row.some(value => !value.trim()))) { setError("Nhập giá trị cho từng loại biến thể của tất cả SKU."); return; }
    setBusy(true); setError("");
    try {
      await api(`/admin/products/${encodeURIComponent(root.id)}/variants`, { method: "PATCH", body: JSON.stringify({ products: siblings.map((product, row) => ({ id: product.id, revision: product.revision, attributes: names.map((name, column) => ({ name: name.trim(), value: values[row][column].trim() })) })) }) });
      markSaved(); notice("Đã lưu các loại biến thể và giá trị của từng SKU.");
      await reloadCatalog().catch(cause => notice(cause instanceof Error ? cause.message : "Không thể tải catalog."));
      await onReload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể lưu loại biến thể.");
    } finally { setBusy(false); }
  };
  return <>
    <Link href={editUrl} className="mb-4 inline-flex items-center gap-2 text-sm text-text-secondary"><ArrowLeft size={16} />Về sửa sản phẩm</Link>
    <AdminHeading title="Thiết lập loại biến thể" subtitle={root.name} />
    <form ref={formRef} onSubmit={save} className="min-w-0 space-y-6">
      <p className="text-sm text-text-secondary">Tạo riêng từng loại như Màu sắc, Hướng, Kích thước. Mỗi SKU có một giá trị cho mỗi loại. Các thiết lập này áp dụng cho toàn bộ nhóm.</p>
      {error && <p role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-danger">{error}</p>}
      {error && <Button type="button" variant="secondary" disabled={busy} onClick={() => close(() => void onReload())}><RefreshCw size={16} />Tải lại nhóm biến thể</Button>}
      <fieldset disabled={busy} className="min-w-0 space-y-6">
        <section className="space-y-4">
          <h2 className="text-base font-semibold text-primary">Các loại biến thể</h2>
          <div className="flex flex-wrap gap-2">
            {ATTRIBUTE_PRESETS.map(name => <Button key={name} type="button" variant="secondary" disabled={names.length >= MAX_VARIANT_ATTRIBUTES || names.some(item => variantKey(item) === variantKey(name))} onClick={() => add(name)}><Plus size={16} />Thêm {name}</Button>)}
            <Button type="button" variant="secondary" disabled={names.length >= MAX_VARIANT_ATTRIBUTES} onClick={() => add("")}><Plus size={16} />Thêm loại khác</Button>
          </div>
          {!names.length && <p className="text-sm text-text-secondary">Chưa có loại biến thể. Chọn một loại ở trên để bắt đầu.</p>}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{names.map((name, index) => <div key={index} className="rounded border border-border p-3">
            <div className="flex items-end gap-2"><div className="min-w-0 flex-1"><Field label={`Tên loại biến thể ${index + 1}`}><input className="bt-input" required maxLength={50} value={name} onChange={event => setNames(names.map((item, position) => position === index ? event.target.value : item))} placeholder="Ví dụ: Hướng" /></Field></div><button type="button" className="bt-icon-button shrink-0" aria-label={`Xóa loại biến thể ${index + 1}`} onClick={() => remove(index)}><Trash2 size={17} /></button></div>
            <p className="mt-2 break-words text-xs text-text-secondary">Giá trị: {Array.from(new Set(values.map(row => row[index]?.trim()).filter(Boolean))).join(", ") || "Chưa nhập"}</p>
          </div>)}</div>
        </section>
        {names.length > 0 && <section className="min-w-0 space-y-3">
          <h2 className="text-base font-semibold text-primary">Giá trị theo từng SKU</h2>
          <div className="overflow-x-auto rounded border border-border" role="region" aria-label="Giá trị biến thể theo SKU" tabIndex={0}>
            <table className="bt-admin-table"><thead><tr><th scope="col">Mã SKU</th>{names.map((name, index) => <th key={index} scope="col">{name || `Loại ${index + 1}`}</th>)}</tr></thead>
              <tbody>{siblings.map((product, row) => <tr key={product.id}><th scope="row" className="min-w-[150px] p-3 text-left text-sm font-medium">{product.code}</th>{names.map((name, column) => <td key={column} className="min-w-[180px]"><input className="bt-input" aria-label={`${name || `Loại ${column + 1}`} của ${product.code}`} maxLength={100} required value={values[row][column]} onChange={event => setValues(values.map((items, position) => position === row ? items.map((item, index) => index === column ? event.target.value : item) : items))} placeholder={name === "Hướng" ? "Ví dụ: Trái, Phải" : name === "Màu sắc" ? "Ví dụ: Đen" : name === "Kích thước" ? "Ví dụ: 800mm" : "Nhập giá trị"} /></td>)}</tr>)}</tbody>
            </table>
          </div>
          <p className="text-xs text-text-secondary">Mỗi tổ hợp giá trị cần khác nhau. Sau khi lưu, chọn “Tạo SKU biến thể” để thêm một tổ hợp mới.</p>
        </section>}
      </fieldset>
      {root.variantGroupId && <Link href={`/admin/products/new?variantOf=${encodeURIComponent(root.id)}`} className="bt-button-secondary"><Plus size={16} />Tạo SKU biến thể</Link>}
      {!apiMode && <p role="alert" className="text-sm text-text-secondary">Chưa kết nối API. Không thể lưu thiết lập.</p>}
      <div className="bt-admin-save-bar"><Button type="button" variant="secondary" disabled={busy} onClick={() => close(() => router.push(editUrl))}>Hủy</Button><Button type="submit" loading={busy} disabled={!apiMode || !names.length}><Save size={17} />Lưu thiết lập biến thể</Button></div>
    </form>
  </>;
}

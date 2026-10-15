"use client";

import Link from "next/link";
import { Plus, Trash2, Unlink2 } from "lucide-react";
import type { Product } from "@/lib/types";
import { Button, Field } from "@/components/ui";
import { MAX_VARIANT_LABEL_LENGTH, variantLabel } from "@/lib/product-variants";

type Attribute = NonNullable<Product["variantAttributes"]>[number];

export function ProductVariantFields({ attributes, onChange, label, onLabelChange, groupId, siblings, currentId, returnTo, schemaLocked, onDetach, detachDisabled, unsaved }: {
  attributes: Attribute[];
  onChange: (attributes: Attribute[]) => void;
  label: string;
  onLabelChange: (label: string) => void;
  groupId?: string;
  siblings: Product[];
  currentId?: string;
  returnTo: string;
  schemaLocked: boolean;
  onDetach?: (id: string) => void;
  detachDisabled?: boolean;
  unsaved?: boolean;
}) {
  const edit = (index: number, field: keyof Attribute, value: string) => onChange(attributes.map((item, position) => position === index ? { ...item, [field]: value } : item));
  return <section className="border-b border-border pb-7">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-base font-semibold text-primary">Biến thể sản phẩm</h2><p className="mt-1 text-sm text-text-secondary">Tách riêng các loại như Màu sắc, Hướng, Kích thước. Mỗi tổ hợp là một SKU.</p></div>
      {currentId && <Link className="bt-button-secondary" href={`/admin/products/${encodeURIComponent(currentId)}/variants`}><Plus size={16} />Thiết lập loại biến thể</Link>}
      {!schemaLocked && attributes.length < 6 && <Button type="button" variant="secondary" onClick={() => onChange([...attributes, { name: "", value: "" }])}><Plus size={16} />Thêm thuộc tính</Button>}
    </div>
    {!schemaLocked && <div className="mb-4 flex flex-wrap gap-2">{["Màu sắc", "Hướng", "Kích thước"].map(name => <Button key={name} type="button" variant="secondary" disabled={attributes.length >= 6 || attributes.some(attribute => attribute.name.trim().toLocaleLowerCase("vi") === name.toLocaleLowerCase("vi"))} onClick={() => onChange([...attributes, { name, value: "" }])}><Plus size={16} />Thêm {name}</Button>)}</div>}
    {schemaLocked && currentId && <p className="mb-4 text-sm text-text-secondary">Để thêm, đổi tên hoặc xóa loại cho cả nhóm, chọn “Thiết lập loại biến thể”. Giá trị bên dưới chỉ áp dụng cho SKU đang sửa.</p>}
    {attributes.map((attribute, index) => <div key={index} className="mb-3 grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_40px]">
      <Field label={`Tên thuộc tính ${index + 1}`}><input className="bt-input" maxLength={50} required readOnly={schemaLocked} value={attribute.name} onChange={event => edit(index, "name", event.target.value)} placeholder="Ví dụ: Hướng" /></Field>
      <Field label={attribute.name ? `Giá trị ${attribute.name}` : `Giá trị ${index + 1}`}><input className="bt-input" maxLength={100} required value={attribute.value} onChange={event => edit(index, "value", event.target.value)} placeholder={attribute.name === "Hướng" ? "Ví dụ: Phải" : "Ví dụ: 800mm, Đen"} /></Field>
      {!schemaLocked && (!groupId || attributes.length > 1) && <button type="button" aria-label={`Xóa thuộc tính ${index + 1}`} title="Xóa thuộc tính" onClick={() => onChange(attributes.filter((_, position) => position !== index))} className="bt-icon-button h-10 w-10"><Trash2 size={17} /></button>}
    </div>)}
    {(attributes.length > 0 || groupId) && <div className="mt-4">
      <Field label="Nhãn hiển thị biến thể" htmlFor="product-variant-label"><input id="product-variant-label" name="variantLabel" className="bt-input" maxLength={MAX_VARIANT_LABEL_LENGTH} value={label} onChange={event => onLabelChange(event.target.value)} placeholder="Ví dụ: Phải" aria-describedby="product-variant-label-hint" /></Field>
      <p id="product-variant-label-hint" className="mt-1 text-xs text-text-secondary">Để trống để hiển thị mã SKU. Nhãn chỉ áp dụng cho biến thể đang sửa.</p>
      {attributes.length > 1 && <p className="mt-1 text-xs text-text-secondary">Khách chọn riêng từng loại theo giá trị bên trên. Nhãn này dùng trong danh sách SKU quản trị.</p>}
    </div>}
    {groupId && <div className="mt-4 border-t border-border pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-sm font-semibold text-primary">Các SKU trong nhóm</h3><Link className="bt-button-secondary" href={`/admin/products/new?variantOf=${encodeURIComponent(groupId)}&returnTo=${encodeURIComponent(returnTo)}`}><Plus size={16} />Tạo biến thể</Link></div>
      <ul aria-label="Các SKU trong nhóm" className="mt-3 flex flex-wrap gap-2">{siblings.map(item => <li key={item.id} className={`inline-flex max-w-full items-center rounded border ${item.id === currentId ? "border-brand bg-section font-semibold text-primary" : "border-border text-text-secondary"}`}>
        <Link href={`/admin/products/${encodeURIComponent(item.id)}/edit?returnTo=${encodeURIComponent(returnTo)}`} title={item.code} aria-current={item.id === currentId ? "page" : undefined} className="inline-flex min-h-10 min-w-0 items-center break-all px-3 text-sm hover:text-primary">{variantLabel(item)}</Link>
        {onDetach && siblings.length > 1 && <button type="button" aria-label={`Tách ${item.code} khỏi nhóm`} title={`Tách ${item.code} khỏi nhóm`} disabled={detachDisabled || unsaved} onClick={() => onDetach(item.id)} className="inline-flex h-10 w-10 shrink-0 items-center justify-center border-l border-border text-text-muted transition-colors hover:bg-section hover:text-danger disabled:cursor-not-allowed disabled:opacity-40"><Unlink2 size={15} aria-hidden="true" /></button>}
      </li>)}</ul>
      {onDetach && siblings.length > 1 && <p className="mt-2 text-xs leading-5 text-text-secondary">{unsaved ? "Lưu các thay đổi trước khi tách SKU khỏi nhóm." : "Chọn biểu tượng ngắt liên kết cạnh mã SKU để tách sản phẩm đó khỏi nhóm."}</p>}
    </div>}
  </section>;
}

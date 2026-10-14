"use client";

import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import type { Product } from "@/lib/types";
import { Button, Field } from "@/components/ui";

type Attribute = NonNullable<Product["variantAttributes"]>[number];

export function ProductVariantFields({ attributes, onChange, groupId, siblings, currentId, returnTo, schemaLocked }: {
  attributes: Attribute[];
  onChange: (attributes: Attribute[]) => void;
  groupId?: string;
  siblings: Product[];
  currentId?: string;
  returnTo: string;
  schemaLocked: boolean;
}) {
  const edit = (index: number, field: keyof Attribute, value: string) => onChange(attributes.map((item, position) => position === index ? { ...item, [field]: value } : item));
  return <section className="border-b border-border pb-7">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-base font-semibold text-primary">Biến thể sản phẩm</h2><p className="mt-1 text-sm text-text-secondary">Mỗi tổ hợp thuộc tính là một mã hàng với giá, ảnh và tồn kho riêng.</p></div>
      {!schemaLocked && attributes.length < 6 && <Button type="button" variant="secondary" onClick={() => onChange([...attributes, { name: "", value: "" }])}><Plus size={16} />Thêm thuộc tính</Button>}
    </div>
    {attributes.map((attribute, index) => <div key={index} className="mb-3 grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_40px]">
      <Field label={`Tên thuộc tính ${index + 1}`}><input className="bt-input" maxLength={50} required readOnly={schemaLocked} value={attribute.name} onChange={event => edit(index, "name", event.target.value)} placeholder="Ví dụ: Kích thước" /></Field>
      <Field label={`Giá trị ${index + 1}`}><input className="bt-input" maxLength={100} required value={attribute.value} onChange={event => edit(index, "value", event.target.value)} placeholder="Ví dụ: 800mm" /></Field>
      {!schemaLocked && (!groupId || attributes.length > 1) && <button type="button" aria-label={`Xóa thuộc tính ${index + 1}`} title="Xóa thuộc tính" onClick={() => onChange(attributes.filter((_, position) => position !== index))} className="bt-icon-button h-10 w-10"><Trash2 size={17} /></button>}
    </div>)}
    {groupId && <div className="mt-4 border-t border-border pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-sm font-semibold text-primary">Các SKU trong nhóm</h3><Link className="bt-button-secondary" href={`/admin/products/new?variantOf=${encodeURIComponent(groupId)}&returnTo=${encodeURIComponent(returnTo)}`}><Plus size={16} />Tạo biến thể</Link></div>
      <ul className="mt-3 flex flex-wrap gap-2">{siblings.map(item => <li key={item.id}><Link href={`/admin/products/${encodeURIComponent(item.id)}/edit?returnTo=${encodeURIComponent(returnTo)}`} aria-current={item.id === currentId ? "page" : undefined} className={`inline-flex min-h-9 items-center rounded border px-3 text-sm ${item.id === currentId ? "border-brand bg-section font-semibold text-primary" : "border-border text-text-secondary hover:border-brand"}`}>{item.variantAttributes?.map(part => part.value).join(" / ") || item.code}</Link></li>)}</ul>
    </div>}
  </section>;
}

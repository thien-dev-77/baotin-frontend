"use client";

import { ListFilter } from "lucide-react";
import { productFacetGroups, PRODUCT_FACET_FIELDS, PRODUCT_FACETS, type ProductFacetData, type ProductFacetSelections } from "@/lib/product-filter-attributes";
import { ProductFormSection } from "./product-form-section";

export type ProductFilterDraft = Required<Pick<ProductFacetData, "material" | "color" | "origin">> & Required<ProductFacetSelections>;

export function productFilterDraft(source?: ProductFacetData): ProductFilterDraft {
  return {
    material: source?.material || "", color: source?.color || "", origin: source?.origin || "",
    materialGroups: source?.materialGroups ?? null, colorGroups: source?.colorGroups ?? null, originGroups: source?.originGroups ?? null,
  };
}

export function ProductFilterAttributes({ value, onChange, variantColor }: {
  value: ProductFilterDraft;
  onChange: (value: ProductFilterDraft) => void;
  variantColor?: string;
}) {
  const effective = { ...value, ...(variantColor !== undefined ? { color: variantColor } : {}) };
  return <ProductFormSection id="product-filter-attributes" title="Phân loại bộ lọc" icon={ListFilter} description="Chọn chất liệu, màu sắc và xuất xứ để khách dễ tìm sản phẩm. Có thể chọn nhiều giá trị cho mỗi mục.">
    <div className="space-y-5">
      {PRODUCT_FACET_FIELDS.map(field => {
        const definition = PRODUCT_FACETS[field];
        const manual = Array.isArray(value[definition.selectionField]);
        const selected = productFacetGroups(effective, field);
        const inputId = `product-${field}-description`;
        const hintId = `product-${field}-mode`;
        return <fieldset key={field} className="min-w-0 rounded-lg border border-border p-4" data-product-facet={field}>
          <legend className="px-1 text-sm font-semibold text-primary">{definition.label}</legend>
          <label htmlFor={inputId} className="mb-1.5 block text-xs font-medium text-text-secondary">Mô tả {definition.label.toLowerCase()}</label>
          <input id={inputId} name={field} className="bt-input" maxLength={100} value={effective[field]} readOnly={field === "color" && variantColor !== undefined} onChange={event => onChange({ ...value, [field]: event.target.value })} aria-describedby={hintId} placeholder={`Nhập thông tin ${definition.label.toLowerCase()} chi tiết…`} />
          {field === "color" && variantColor !== undefined && <p className="mt-1 text-xs text-text-muted">Mô tả màu sắc lấy từ thuộc tính biến thể.</p>}
          <div className="mb-3 mt-3 flex flex-wrap items-center justify-between gap-2">
            <p id={hintId} className="text-xs leading-5 text-text-secondary">{manual ? "Đang dùng các giá trị bạn chọn bên dưới." : "Tự nhận diện từ mô tả. Chọn bên dưới để điều chỉnh."}</p>
            {manual && <button type="button" onClick={() => onChange({ ...value, [definition.selectionField]: null })} className="min-h-8 text-xs font-medium text-primary underline underline-offset-4">Dùng tự động</button>}
          </div>
          <div role="group" aria-label={`Nhóm ${definition.label.toLowerCase()}`} className="grid max-h-52 gap-2 overflow-y-auto overscroll-contain pr-1 sm:grid-cols-2 lg:grid-cols-3">
            {definition.options.map(option => <label key={option.value} className={`flex min-h-9 cursor-pointer items-center gap-2 rounded-md border px-2.5 py-2 text-xs ${selected.includes(option.value) ? "border-brand bg-section text-primary" : "border-border text-text-secondary hover:bg-section"}`}>
              <input type="checkbox" className="h-4 w-4 shrink-0 accent-brand" checked={selected.includes(option.value)} onChange={() => onChange({ ...value, [definition.selectionField]: selected.includes(option.value) ? selected.filter(item => item !== option.value) : [...selected, option.value] })} />
              <span>{option.label}</span>
            </label>)}
          </div>
        </fieldset>;
      })}
    </div>
  </ProductFormSection>;
}

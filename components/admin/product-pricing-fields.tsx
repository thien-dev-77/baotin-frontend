"use client";

import { Field } from "../ui";
import { MAX_PRODUCT_DISCOUNT, MAX_PRODUCT_PRICE } from "@/lib/product-pricing";

export type ProductPricingDraft = { listPrice: string; b2cDiscount: string; b2bDiscount: string };
export function ProductPricingFields({ value, onChange, b2cPrice, b2bPrice, legacy }: { value: ProductPricingDraft; onChange: (value: ProductPricingDraft) => void; b2cPrice: number; b2bPrice?: number; legacy: boolean }) {
  return <section className="border-b border-border pb-7" aria-labelledby="product-pricing-heading">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 id="product-pricing-heading" className="text-base font-semibold text-primary">Giá bán & chiết khấu</h2><span className="text-xs text-text-muted">{legacy ? "Chưa cấu hình giá niêm yết" : "B2B: giá mặc định"}</span></div>
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2"><Field label="Giá niêm yết (VNĐ)" required htmlFor="product-list-price"><input id="product-list-price" name="listPrice" type="number" required min={0} max={MAX_PRODUCT_PRICE} step={1} value={value.listPrice} onChange={event => onChange({ ...value, listPrice: event.target.value })} className="bt-input" /></Field></div>
      <Field label="Chiết khấu B2C (%)" required htmlFor="product-b2c-discount"><input id="product-b2c-discount" name="b2cDiscount" type="number" required min={0} max={MAX_PRODUCT_DISCOUNT} step={0.01} value={value.b2cDiscount} onChange={event => onChange({ ...value, b2cDiscount: event.target.value })} className="bt-input" /></Field>
      <Field label="Giá sau CK B2C (VNĐ)" htmlFor="product-b2c-price"><input id="product-b2c-price" name="price" type="number" readOnly value={b2cPrice} className="bt-input bg-section font-semibold tabular-nums" /></Field>
      <Field label="Chiết khấu B2B (%)" required htmlFor="product-b2b-discount"><input id="product-b2b-discount" name="b2bDiscount" type="number" required min={0} max={MAX_PRODUCT_DISCOUNT} step={0.01} value={value.b2bDiscount} onChange={event => onChange({ ...value, b2bDiscount: event.target.value })} className="bt-input" /></Field>
      <Field label="Giá sau CK B2B (VNĐ)" htmlFor="product-b2b-price"><input id="product-b2b-price" type="number" readOnly value={b2bPrice ?? ""} placeholder="Chưa cấu hình" className="bt-input bg-section font-semibold tabular-nums" /></Field>
    </div>
  </section>;
}

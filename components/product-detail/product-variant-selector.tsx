"use client";

import Link from "next/link";
import type { Product } from "@/lib/types";
import { chooseVariant, variantKey } from "@/lib/product-variants";

export function ProductVariantSelector({ product, variants }: { product: Product; variants: Product[] }) {
  if (!product.variantGroupId || variants.length < 2 || !product.variantAttributes?.length) return null;
  const names = product.variantAttributes.map(attribute => attribute.name);
  return <section aria-label="Chọn biến thể" className="mt-5 border-t border-border pt-5">
    <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2"><h2 className="text-sm font-semibold text-primary">Tùy chọn sản phẩm</h2><span className="text-xs text-text-secondary">Mã: {product.code}</span></div>
    <div className="space-y-4">
      {names.map((name, index) => {
        const selected = product.variantAttributes?.[index]?.value || "";
        const values = Array.from(new Map(variants.flatMap(item => {
          const value = item.variantAttributes?.[index]?.value;
          return value ? [[variantKey(value), value] as const] : [];
        })).values());
        return <fieldset key={name}>
          <legend className="mb-2 text-sm font-medium text-primary">{name}: <span className="font-normal text-text-secondary">{selected}</span></legend>
          <div className="flex flex-wrap gap-2">{values.map(value => {
            const chosen = variantKey(value) === variantKey(selected);
            const target = chooseVariant(variants, product, index, value);
            if (!target) return null;
            return <Link key={value} href={`/products/${target.slug}`} prefetch={false} aria-current={chosen ? "page" : undefined} className={`inline-flex min-h-10 items-center justify-center rounded border px-3 text-sm transition-colors ${chosen ? "border-blue-brand bg-section-blue font-semibold text-primary" : "border-border bg-white text-primary hover:border-blue-brand hover:text-blue-brand"}`}>{value}</Link>;
          })}</div>
        </fieldset>;
      })}
    </div>
  </section>;
}

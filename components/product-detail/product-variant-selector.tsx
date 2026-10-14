"use client";

import Link from "next/link";
import type { Product } from "@/lib/types";
import { chooseVariant, variantKey, variantOptionLabel } from "@/lib/product-variants";

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
          <legend className="mb-2 text-sm font-medium text-primary">{name}: <span className="font-normal text-text-secondary">{variantOptionLabel(product, index)}</span></legend>
          <div className="flex flex-wrap gap-2">{values.map(value => {
            const chosen = variantKey(value) === variantKey(selected);
            const target = chooseVariant(variants, product, index, value);
            if (!target) return null;
            return <Link key={value} href={`/products/${target.slug}`} title={target.code} prefetch={false} aria-current={chosen ? "page" : undefined} className={`inline-flex min-h-10 max-w-full items-center justify-center break-words rounded border px-3 py-2 text-sm text-primary transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${chosen ? "border-brand bg-brand text-white font-semibold hover:border-brand-hover hover:bg-brand-hover" : "border-border bg-white hover:border-brand hover:bg-brand"}`}>{variantOptionLabel(target, index)}</Link>;
          })}</div>
        </fieldset>;
      })}
    </div>
  </section>;
}

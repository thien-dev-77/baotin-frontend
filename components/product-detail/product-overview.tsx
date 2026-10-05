"use client";

import type { Product } from "@/lib/catalog";
import type { ProductSpecification } from "@/lib/product-detail";
import { ChevronRight, Star } from "lucide-react";
import Link from "next/link";

type ProductOverviewProps = {
  product: Product;
  specifications: ProductSpecification[];
  reviewCount: number;
  onShowReviews: () => void;
};

export function ProductOverview({ product, specifications, reviewCount, onShowReviews }: ProductOverviewProps) {
  const brandSlug = product.brand === "Bảo Tín" ? "bao-tin" : product.brand.toLowerCase();

  return (
    <section>
      <Link href={`/brand/${brandSlug}`} className="text-xs font-bold text-text-muted">{product.brand.toUpperCase()}</Link>
      <h1 className="mt-1 text-[22px] font-bold leading-tight text-primary">{product.name}</h1>
      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
        <span className="flex text-amber-500">
          {Array.from({ length: 5 }, (_, index) => <Star key={index} size={13} fill="currentColor" />)}
        </span>
        <button onClick={onShowReviews} className="text-blue-brand">4.8 ({126 + reviewCount - 1} đánh giá)</button>
        <span className="text-text-secondary">· Đã bán 1.2k+</span>
      </div>
      <p className="mt-4 text-sm leading-6 text-text-secondary">
        {product.name} chính hãng, bền bỉ và đồng bộ. Phù hợp cho xưởng nội thất, công trình và ngôi nhà Việt.
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {product.specification.split(" · ").map((tag) => <span key={tag} className="rounded-full bg-section-blue px-2 py-1 text-xs text-primary">{tag}</span>)}
      </div>
      <dl className="mt-4 divide-y divide-border text-[13px]">
        {specifications.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[100px_minmax(0,1fr)] gap-2 py-2">
            <dt className="text-text-secondary">{label}</dt>
            <dd className="text-primary">{value}</dd>
          </div>
        ))}
      </dl>
      <a href="#specifications" className="mt-2 inline-flex items-center gap-1 text-xs text-blue-brand">
        Xem thông số kỹ thuật<ChevronRight size={14} />
      </a>
    </section>
  );
}

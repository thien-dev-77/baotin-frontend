"use client";

import type { Product } from "@/lib/catalog";
import { Star } from "lucide-react";
import Link from "next/link";

type ProductOverviewProps = {
  product: Product;
  reviewCount: number;
  rating?: number;
  onShowReviews: () => void;
};

export function ProductOverview({ product, reviewCount, rating = 0, onShowReviews }: ProductOverviewProps) {
  const brandSlug = product.brand === "Bảo Tín" ? "bao-tin" : product.brand.toLowerCase();

  return (
    <section aria-label="Thông tin sản phẩm">
      <Link href={`/brand/${brandSlug}`} className="text-xs font-bold text-text-muted">{product.brand.toUpperCase()}</Link>
      <h1 className="mt-1 text-[22px] font-bold leading-tight text-primary">{product.name}</h1>
      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
        <span className="flex text-brand">
          {Array.from({ length: 5 }, (_, index) => <Star key={index} size={13} fill={index < Math.round(rating) ? "currentColor" : "none"} />)}
        </span>
        <button onClick={onShowReviews} className="text-primary">{reviewCount ? `${rating.toFixed(1)} (${reviewCount} đánh giá)` : "Chưa có đánh giá"}</button>
      </div>
      <p className="mt-4 whitespace-pre-line break-words text-sm leading-6 text-text-secondary">
        {product.shortDescription || `${product.name} chính hãng, bền bỉ và đồng bộ. Phù hợp cho xưởng nội thất, công trình và ngôi nhà Việt.`}
      </p>
    </section>
  );
}

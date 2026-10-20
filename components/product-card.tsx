"use client";

import { Product, money, priceFor } from "@/lib/catalog";
import { Eye, Heart } from "lucide-react";
import Link from "next/link";
import { ProductImage as Image } from "@/components/product-image";
import { ProductAuthenticityLabel } from "@/components/product-authenticity-label";
import { useCommerce } from "@/components/commerce-provider";
import { apiMode } from "@/lib/api-client";
import { productPrices } from "@/lib/product-pricing";

export function PriceDisplay({ product, compact = false }: { product: Product; compact?: boolean }) {
  const { customer } = useCommerce();
  const isB2b = apiMode ? customer?.status === "active" && product.customerPrice !== undefined : Boolean(customer);
  const price = priceFor(product, customer);
  const prices = productPrices(product);
  const referencePrice = prices.configured ? prices.listPrice : product.oldPrice;
  const discount = referencePrice ? Math.max(0, Math.round((1 - price / referencePrice) * 100)) : 0;
  return <div className="min-w-0">
    <div className={`bt-product-card-price ${compact ? "bt-product-card-price--compact" : ""}`}>
      <div className="bt-product-card-price-current"><span className="bt-price-amount">{money(price)}</span><span className="bt-product-card-unit">/{product.unit}</span></div>
      {referencePrice !== undefined && referencePrice > price && <div className="bt-product-card-price-savings"><del>{money(referencePrice)}</del>{discount > 0 && <span className="bt-product-card-discount" aria-label={`Giảm ${discount}%`}>-{discount}%</span>}</div>}
    </div>
    {isB2b && <div className="bt-product-card-account"><span className="font-medium text-primary">Giá B2B</span></div>}
  </div>;
}

export function ProductCard({ product, list = false, imageSizes }: { product: Product; list?: boolean; imageSizes?: string }) {
  const { favorites, toggleFavorite } = useCommerce();
  const liked = favorites.includes(product.id);
  return <article className={`bt-product-card group ${list ? "bt-product-card--list" : ""}`}>
    <div className="bt-product-card-media">
      <Link href={`/products/${product.slug}`} prefetch={false} className="bt-product-card-image-link"><Image src={product.image} data-image-src={product.image} alt={product.name} fill loading="lazy" quality={85} sizes={list ? "(min-width: 640px) 180px, 112px" : imageSizes || "(min-width: 1440px) 246px, (min-width: 1280px) 238px, (min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw"} className="object-contain transition duration-200 group-hover:scale-[1.02]" /></Link>
      <Link href={`/products/${product.slug}`} prefetch={false} aria-label={`Xem chi tiết - ${product.name}`} className="bt-product-card-details"><Eye size={16} strokeWidth={1.6} className="shrink-0" aria-hidden="true" /><span>Xem chi tiết</span></Link>
      <button type="button" aria-label={`${liked ? "Bỏ yêu thích" : "Yêu thích"} ${product.name}`} aria-pressed={liked} title={liked ? "Bỏ yêu thích" : "Yêu thích"} onClick={() => toggleFavorite(product.id)} className={`bt-product-card-favorite ${liked ? "text-brand" : "text-text-muted"}`}><Heart size={18} fill={liked ? "currentColor" : "none"} aria-hidden="true" /></button>
      {product.showAuthenticityLabel !== false && <ProductAuthenticityLabel compact />}
    </div>
    <div className="bt-product-card-content">
      <Link href={`/products/${product.slug}`} prefetch={false} className="bt-product-card-title line-clamp-2" title={product.name}>{product.name}</Link>
      <div className="mt-1.5"><PriceDisplay product={product} /></div>
      {product.stock === 0 && <span className="mt-1 text-xs text-text-muted">Tạm hết hàng</span>}
    </div>
  </article>;
}
function ProductCardSkeleton({ list = false }: { list?: boolean }) {
  return <div aria-hidden="true" data-product-skeleton className={`bt-product-card pointer-events-none select-none motion-safe:animate-pulse ${list ? "bt-product-card--list" : ""}`}>
    <div className="bt-product-card-media"><div className="absolute inset-0 bg-border" /></div>
    <div className="bt-product-card-content">
      <div className="bt-product-card-title space-y-2 py-1"><div className="h-3.5 w-full rounded bg-border" /><div className="h-3.5 w-3/4 rounded bg-border" /></div>
      <div className="mt-1.5 space-y-2"><div className="h-6 w-3/4 rounded bg-border" /><div className="h-2.5 w-4/5 rounded bg-border" /></div>
    </div>
  </div>;
}

const DEFAULT_SKELETON_COUNT = 12;

export function ProductGrid({ products, list = false, desktopColumns = 5, loading = false }: { products: Product[]; list?: boolean; desktopColumns?: 4 | 5; loading?: boolean }) {
  const imageSizes = desktopColumns === 4 ? "(min-width: 1440px) 248px, (min-width: 1280px) 238px, (min-width: 1024px) calc((100vw - 339px) / 4), (min-width: 640px) 33vw, 50vw" : undefined;
  return <div data-product-grid data-desktop-columns={desktopColumns} aria-hidden={loading || undefined} className={list ? "grid gap-3" : `grid grid-cols-2 gap-3 sm:grid-cols-3 ${desktopColumns === 4 ? "lg:grid-cols-4" : "lg:grid-cols-5"}`}>
    {loading ? Array.from({ length: products.length || DEFAULT_SKELETON_COUNT }, (_, index) => <ProductCardSkeleton key={index} list={list} />) : products.map((product) => <ProductCard key={product.id} product={product} list={list} imageSizes={imageSizes} />)}
  </div>;
}

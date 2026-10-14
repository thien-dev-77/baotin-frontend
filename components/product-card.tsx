"use client";

import { Product, money, priceFor } from "@/lib/catalog";
import { Eye, Heart, Star } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useCommerce } from "@/components/commerce-provider";
import { apiMode } from "@/lib/api-client";
import { productPrices } from "@/lib/product-pricing";

export function PriceDisplay({ product, compact = false }: { product: Product; compact?: boolean }) {
  const { customer } = useCommerce();
  const isB2b = apiMode ? customer?.status === "active" && product.customerPrice !== undefined : Boolean(customer);
  const price = priceFor(product, customer);
  const prices = productPrices(product);
  const referencePrice = prices.configured ? prices.listPrice : product.oldPrice;
  return <div className="min-w-0">
    <div className={`bt-product-card-price ${compact ? "bt-product-card-price--compact" : ""}`}>
      <span className="bt-price-amount">{money(price)}</span>
      {referencePrice !== undefined && referencePrice > price && <del>{money(referencePrice)}</del>}
    </div>
    <div className="bt-product-card-account">
      {isB2b ? <span className="font-medium text-primary">Giá B2B</span> : customer ? <span>Chờ kích hoạt B2B</span> : <Link href="/login" className="hover:underline">Đăng nhập B2B để xem giá</Link>}
    </div>
  </div>;
}

function productTags(product: Product) {
  const placeholders = new Set(["chưa cập nhật", "theo phiên bản", "theo mã hàng", "theo nhãn sản phẩm"]);
  const attributes = [
    ...(product.variantAttributes || []),
    { name: "Kích thước", value: product.size },
    { name: "Chất liệu", value: product.material },
    { name: "Màu sắc", value: product.color },
  ];
  const seen = new Set<string>();
  return attributes.filter(attribute => {
    const value = attribute.value?.trim();
    if (!value || placeholders.has(value.toLocaleLowerCase("vi")) || seen.has(value.toLocaleLowerCase("vi"))) return false;
    seen.add(value.toLocaleLowerCase("vi"));
    return true;
  }).slice(0, 4);
}

export function ProductCard({ product, list = false }: { product: Product; list?: boolean }) {
  const { favorites, toggleFavorite, customer } = useCommerce();
  const liked = favorites.includes(product.id);
  const prices = productPrices(product);
  const referencePrice = prices.configured ? prices.listPrice : product.oldPrice;
  const discount = referencePrice ? Math.max(0, Math.round((1 - priceFor(product, customer) / referencePrice) * 100)) : 0;
  const tags = productTags(product);
  const summary = product.reviewSummary;
  return <article className={`bt-product-card group ${list ? "bt-product-card--list" : ""}`}>
    <div className="bt-product-card-media">
      <Link href={`/products/${product.slug}`} prefetch={false} className="bt-product-card-image-link"><Image src={product.image} data-image-src={product.image} alt={product.name} fill loading="lazy" quality={85} sizes={list ? "(min-width: 640px) 180px, 112px" : "(min-width: 1440px) 246px, (min-width: 1280px) 238px, (min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw"} className="object-contain transition duration-200 group-hover:scale-[1.02]" /></Link>
      <Link href={`/products/${product.slug}`} prefetch={false} aria-label={`Xem chi tiết - ${product.name}`} className="bt-product-card-details"><Eye size={18} strokeWidth={1.6} className="shrink-0" aria-hidden="true" /><span>Xem chi tiết</span></Link>
      <button type="button" aria-label={`${liked ? "Bỏ yêu thích" : "Yêu thích"} ${product.name}`} aria-pressed={liked} title={liked ? "Bỏ yêu thích" : "Yêu thích"} onClick={() => toggleFavorite(product.id)} className={`bt-product-card-favorite ${liked ? "text-brand" : "text-text-muted"}`}><Heart size={18} fill={liked ? "currentColor" : "none"} aria-hidden="true" /></button>
      {discount > 0 && <span className="bt-product-card-discount" aria-label={`Giảm ${discount}%`}><span>GIẢM</span><strong>-{discount}%</strong></span>}
    </div>
    <div className="bt-product-card-content">
      <Link href={`/products/${product.slug}`} prefetch={false} className="bt-product-card-title line-clamp-2" title={product.name}>{product.name}</Link>
      <div className="mt-2"><PriceDisplay product={product} /></div>
      {summary && <Link href={`/products/${product.slug}`} prefetch={false} className="bt-product-card-reviews" aria-label={summary.count ? `${summary.rating.toFixed(1)} trên 5 sao, ${summary.count} đánh giá` : "Chưa có đánh giá"}>
        <span className="inline-flex shrink-0 text-brand" aria-hidden="true">{Array.from({ length: 5 }, (_, index) => <span key={index} className="bt-product-card-star">
          <Star size={15} strokeWidth={1.6} />
          <span style={{ width: `${summary.count > 0 ? Math.max(0, Math.min(1, summary.rating - index)) * 100 : 0}%` }}><Star size={15} strokeWidth={1.6} fill="currentColor" /></span>
        </span>)}</span>
        <span>{summary.count} đánh giá</span>
      </Link>}
      {tags.length > 0 && <ul className="bt-product-card-tags" aria-label="Thuộc tính sản phẩm">{tags.map(attribute => <li key={attribute.value.toLocaleLowerCase("vi")} title={`${attribute.name}: ${attribute.value}`}>{attribute.value}</li>)}</ul>}
      <div className="bt-product-card-meta"><span title={`Mã: ${product.code}`}>Mã: {product.code}</span><span>/{product.unit}</span></div>
      {product.stock === 0 && <span className="mt-1 text-xs text-text-muted">Tạm hết hàng</span>}
    </div>
  </article>;
}
export function ProductGrid({ products, list = false }: { products: Product[]; list?: boolean }) {
  return <div className={list ? "grid gap-3" : "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"}>{products.map((product) => <ProductCard key={product.id} product={product} list={list} />)}</div>;
}

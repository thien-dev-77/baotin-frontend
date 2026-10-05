"use client";

import { Product, money, priceFor } from "@/lib/catalog";
import { Eye, Heart } from "lucide-react";
import Link from "next/link";
import { useCommerce } from "@/components/commerce-provider";
import { apiMode } from "@/lib/api-client";

export function PriceDisplay({ product, compact = false }: { product: Product; compact?: boolean }) {
  const { customer } = useCommerce();
  const isB2b = apiMode ? customer?.status === "active" && product.customerPrice !== undefined : Boolean(customer);
  const price = priceFor(product, customer);
  return <div className="min-w-0"><div className={`flex flex-wrap items-baseline gap-x-1 ${compact ? "text-base" : "text-lg"} font-bold ${product.oldPrice ? "text-danger" : "text-primary"}`}><span className="bt-price-amount">{money(price)}</span><span className="text-xs font-normal text-text-secondary">/{product.unit}</span></div>{product.oldPrice && <del className="text-xs text-text-muted">{money(product.oldPrice)}</del>}{isB2b ? <p className="mt-1 text-[11px] font-medium text-success">Giá B2B</p> : customer ? <p className="mt-1 text-[11px] text-text-muted">Chờ kích hoạt B2B</p> : <Link href="/login" className="mt-1 block text-[11px] leading-4 text-blue-brand hover:underline">Đăng nhập B2B để xem giá</Link>}</div>;
}
export function ProductCard({ product, list = false }: { product: Product; list?: boolean }) {
  const { favorites, toggleFavorite, products } = useCommerce();
  if (apiMode) {
    const current = products.find((item) => item.id === product.id);
    if (!current) return null;
    product = current;
  }
  const liked = favorites.includes(product.id);
  const discount = product.oldPrice ? Math.round((1 - product.price / product.oldPrice) * 100) : 0;
  return <article className={`bt-product-card group ${list ? "flex" : "flex flex-col"}`}>
    <div className={`bt-product-card-media relative shrink-0 bg-[#f8fafc] ${list ? "h-[160px] w-[96px] sm:w-[120px]" : "h-[150px] md:h-[180px]"}`}>
      <Link href={`/products/${product.slug}`} className="bt-product-card-image-link"><img src={product.image} alt={product.name} loading="lazy" width={240} height={180} className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.02]" /></Link>
      <Link href={`/products/${product.slug}`} aria-label={`Xem sản phẩm - ${product.name}`} className="bt-button-primary bt-product-card-details"><Eye size={16} className="shrink-0" aria-hidden="true" /><span>Xem sản phẩm</span></Link>
      <button type="button" aria-label={`${liked ? "Bỏ yêu thích" : "Yêu thích"} ${product.name}`} aria-pressed={liked} title={liked ? "Bỏ yêu thích" : "Yêu thích"} onClick={() => toggleFavorite(product.id)} className={`absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white ${liked ? "text-danger" : "text-primary"}`}><Heart size={16} fill={liked ? "currentColor" : "none"} /></button>
      {discount > 0 && <span className="absolute left-2 top-2 rounded bg-danger px-1.5 py-0.5 text-[11px] font-semibold text-white">-{discount}%</span>}
    </div>
    <div className="flex min-w-0 flex-1 flex-col p-3">
      <Link href={`/products/${product.slug}`} className="line-clamp-2 min-h-[40px] text-sm font-semibold leading-5 text-primary hover:text-blue-brand">{product.name}</Link>
      <p className="mt-1 text-xs text-text-muted">Mã: {product.code}</p>
      <p className="mt-1 text-xs font-medium text-text-secondary">{product.brand}</p>
      <p className="mt-1 line-clamp-2 text-xs leading-[18px] text-text-secondary">{product.specification}</p>
      <div className="mt-auto min-h-[80px] pt-3"><PriceDisplay product={product} /></div>
      {product.stock === 0 && <span className="mt-2 text-xs text-text-muted">Tạm hết hàng</span>}
    </div>
  </article>;
}
export function ProductGrid({ products, list = false }: { products: Product[]; list?: boolean }) {
  return <div className={list ? "grid gap-3" : "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"}>{products.map((product) => <ProductCard key={product.id} product={product} list={list} />)}</div>;
}

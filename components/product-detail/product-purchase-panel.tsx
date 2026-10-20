"use client";

import { useCommerce } from "@/components/commerce-provider";
import { ProductServiceBenefits } from "@/components/product-detail/product-service-benefits";
import { ProductContactActions } from "@/components/product-detail/product-contact-actions";
import { Button, QuantityStepper } from "@/components/ui";
import { money, priceFor, type Product } from "@/lib/catalog";
import { CheckCircle2, Heart, RefreshCw, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { apiMode } from "@/lib/api-client";
import { productPrices, effectiveDiscount, formatDiscount } from "@/lib/product-pricing";

export function ProductPurchasePanel({ product, availability }: { product: Product; availability?: { loading: boolean; error?: string; reload: () => Promise<void> } }) {
  const { customer, add, toggleFavorite, favorites } = useCommerce();
  const [quantity, setQuantity] = useState(1);
  const price = priceFor(product, customer);
  const isB2b = apiMode ? customer?.status === "active" && product.customerPrice !== undefined : Boolean(customer);
  const b2bAccount = apiMode ? customer?.status === "active" : Boolean(customer);
  const blocked = Boolean(availability?.loading || availability?.error);
  const liked = favorites.includes(product.id);
  const pricing = productPrices(product);
  const loginHref = `/login?next=/products/${product.slug}`;

  return (
    <aside aria-label="Mua sản phẩm" aria-busy={availability?.loading || undefined} tabIndex={0} className="bt-product-detail-purchase overflow-hidden rounded-lg border border-border bg-white">
      <div className="grid grid-cols-2 border-b border-border text-xs">
        <span className={`py-3 text-center font-semibold ${isB2b ? "text-text-secondary" : "bg-section text-primary"}`}>Giá bán lẻ</span>
        {b2bAccount ? (
          <span className="bg-section py-3 text-center font-semibold text-primary">Giá B2B</span>
        ) : (
          <Link href={loginHref} className="py-3 text-center text-text-secondary">Giá B2B (Đăng nhập)</Link>
        )}
      </div>
      <div className="p-4">
        {availability?.loading && <p role="status" className="mb-4 text-sm text-text-secondary">{b2bAccount ? "Đang tải giá B2B và tồn kho..." : "Đang cập nhật giá và tồn kho..."}</p>}
        {availability?.error && <div role="alert" className="mb-4 space-y-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-danger"><p>{availability.error}</p><Button type="button" variant="secondary" loading={availability.loading} onClick={() => void availability.reload()}><RefreshCw size={16} />Thử lại giá và tồn kho</Button></div>}
        {!blocked && <>
        <div role="group" aria-label="Giá sản phẩm" className="flex flex-wrap items-baseline gap-2">
          <strong className="text-[26px] text-primary">{money(price)}</strong>
          <span className="text-sm text-text-secondary">/{product.unit}</span>
          {product.oldPrice && product.oldPrice > price && <del className="text-xs text-text-muted">{money(product.oldPrice)}</del>}
        </div>
        {pricing.configured && <dl aria-label="Giá niêm yết và chiết khấu" className="mt-4 space-y-2 border-y border-border py-3 text-xs"><div className="flex flex-wrap justify-between gap-2"><dt className="text-text-secondary">Giá niêm yết</dt><dd className="tabular-nums">{money(pricing.listPrice)}</dd></div><div className="flex justify-between gap-2"><dt className="text-text-secondary">Chiết khấu B2C</dt><dd>{formatDiscount(pricing.b2cDiscount)}</dd></div><div className="flex flex-wrap justify-between gap-2"><dt className="text-text-secondary">Giá sau CK B2C</dt><dd className="font-semibold tabular-nums">{money(pricing.b2cPrice)}</dd></div>{isB2b ? <><div className="flex justify-between gap-2"><dt className="text-text-secondary">Chiết khấu B2B</dt><dd>{price > pricing.listPrice ? "Giá riêng" : formatDiscount(effectiveDiscount(pricing.listPrice, price))}</dd></div><div className="flex flex-wrap justify-between gap-2"><dt className="text-text-secondary">Giá sau CK B2B</dt><dd className="font-semibold tabular-nums text-primary">{money(price)}</dd></div></> : <div className="flex flex-wrap justify-between gap-2"><dt className="text-text-secondary">Giá / CK B2B</dt><dd><Link href={loginHref} className="text-primary">Đăng nhập B2B</Link></dd></div>}</dl>}
        <p className={`mt-3 flex items-center gap-1.5 text-xs font-semibold ${product.stock > 0 ? "text-success" : "text-text-muted"}`}>
          <CheckCircle2 size={14} />
          {product.stock > 0 ? `Còn hàng (${product.stock} ${product.unit})` : "Tạm hết hàng"}
        </p>
        </>}
        <fieldset disabled={blocked} className="mt-3 flex flex-wrap gap-2">
          <QuantityStepper value={quantity} onChange={setQuantity} max={Math.max(1, product.stock)} />
          <Button className="min-w-0 flex-1 !px-2 !text-xs" disabled={blocked || !product.stock} onClick={() => add(product, quantity)}>
            <ShoppingCart size={18} />Thêm vào giỏ hàng
          </Button>
        </fieldset>
        <ProductContactActions />
        <Button variant="secondary" className="mt-2 w-full !text-xs" onClick={() => toggleFavorite(product.id)}>
          <Heart size={16} fill={liked ? "currentColor" : "none"} />{liked ? "Đã yêu thích" : "Yêu thích"}
        </Button>
        {!customer && (
          <div className="mt-4 rounded-md bg-section p-3">
            <h2 className="text-sm font-bold text-primary">Mua số lượng lớn?</h2>
            <p className="mt-1 text-xs leading-5 text-text-secondary">Đăng nhập B2B để xem giá tốt hơn và chính sách công nợ.</p>
            <Link className="bt-button-secondary mt-3 w-full !text-xs" href={loginHref}>Đăng nhập B2B</Link>
          </div>
        )}
        <ProductServiceBenefits />
      </div>
    </aside>
  );
}

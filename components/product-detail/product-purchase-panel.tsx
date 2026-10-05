"use client";

import { useCommerce } from "@/components/commerce-provider";
import { ProductServiceBenefits } from "@/components/product-detail/product-service-benefits";
import { Button, QuantityStepper } from "@/components/ui";
import { money, priceFor, type Product } from "@/lib/catalog";
import { CheckCircle2, Heart, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { apiMode } from "@/lib/api-client";

export function ProductPurchasePanel({ product }: { product: Product }) {
  const { customer, add, toggleFavorite, favorites } = useCommerce();
  const [quantity, setQuantity] = useState(1);
  const price = priceFor(product, customer);
  const isB2b = apiMode ? customer?.status === "active" && product.customerPrice !== undefined : Boolean(customer);
  const liked = favorites.includes(product.id);
  const loginHref = `/login?next=/products/${product.slug}`;

  return (
    <aside aria-label="Mua sản phẩm" tabIndex={0} className="bt-product-detail-purchase overflow-hidden rounded-lg border border-border bg-white">
      <div className="grid grid-cols-2 border-b border-border text-xs">
        <span className={`py-3 text-center font-semibold ${isB2b ? "text-text-secondary" : "bg-section-blue text-primary"}`}>Giá bán lẻ</span>
        {isB2b ? (
          <span className="bg-section-blue py-3 text-center font-semibold text-blue-brand">Giá B2B</span>
        ) : (
          <Link href={loginHref} className="py-3 text-center text-text-secondary">Giá B2B (Đăng nhập)</Link>
        )}
      </div>
      <div className="p-4">
        <div className="flex flex-wrap items-baseline gap-2">
          <strong className="text-[26px] text-danger">{money(price)}</strong>
          <span className="text-sm text-text-secondary">/{product.unit}</span>
          {product.oldPrice && <del className="text-xs text-text-muted">{money(product.oldPrice)}</del>}
        </div>
        <p className={`mt-3 flex items-center gap-1.5 text-xs font-semibold ${product.stock > 0 ? "text-success" : "text-text-muted"}`}>
          <CheckCircle2 size={14} />
          {product.stock > 0 ? `Còn hàng (${product.stock} ${product.unit})` : "Tạm hết hàng"}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <QuantityStepper value={quantity} onChange={setQuantity} max={Math.max(1, product.stock)} />
          <Button className="min-w-0 flex-1 !px-2 !text-xs" disabled={!product.stock} onClick={() => add(product, quantity)}>
            <ShoppingCart size={18} />Thêm vào giỏ hàng
          </Button>
        </div>
        <Button variant="secondary" className="mt-2 w-full !text-xs" onClick={() => toggleFavorite(product.id)}>
          <Heart size={16} fill={liked ? "currentColor" : "none"} />{liked ? "Đã yêu thích" : "Yêu thích"}
        </Button>
        {!customer && (
          <div className="mt-4 rounded-md bg-section-blue p-3">
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

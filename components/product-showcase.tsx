"use client";
import { Product } from "@/lib/catalog";
import { useCommerce } from "@/components/commerce-provider";
import { ProductCard } from "@/components/product-card";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { useFrequentlyBought } from "./frequently-bought";
import { EmptyState } from "./ui";
import { ResourceStatus } from "./admin/admin-resource";
import { homeShowcaseProducts, HOME_SHOWCASE_LIMIT } from "@/lib/home-showcase";

export function ProductCarousel({ products, title, children }: { products: Product[]; title: string; children?: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const move = (direction: number) => ref.current?.scrollBy({ left: direction * ref.current.clientWidth * 0.8, behavior: "smooth" });
  return (
    <section className="mt-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-primary">{title}</h2>
        {children || <Link href="/search" className="inline-flex items-center gap-1 text-xs font-semibold text-primary">Xem tất cả<ArrowRight size={14} /></Link>}
      </div>
      <div className="relative">
        {products.length > 1 && <button aria-label="Sản phẩm trước" title="Sản phẩm trước" className="absolute -left-3 top-[90px] z-10 hidden h-8 w-8 items-center justify-center rounded-full border border-border bg-white text-primary shadow-card lg:flex" onClick={() => move(-1)}><ChevronLeft size={18} /></button>}
        <div ref={ref} className="scrollbar-hide grid auto-cols-[170px] grid-flow-col gap-3 overflow-x-auto scroll-smooth pb-1 lg:auto-cols-[calc((100%_-_48px)_/_5)]">
          {products.map(product => <ProductCard key={product.id} product={product} />)}
        </div>
        {products.length > 1 && <button aria-label="Sản phẩm tiếp theo" title="Sản phẩm tiếp theo" className="absolute -right-3 top-[90px] z-10 hidden h-8 w-8 items-center justify-center rounded-full border border-border bg-white text-primary shadow-card lg:flex" onClick={() => move(1)}><ChevronRight size={18} /></button>}
      </div>
    </section>
  );
}
export function ProductShowcase() {
  const { products: catalog, categories, customer } = useCommerce();
  const [tab, setTab] = useState("Nổi bật");
  const isFrequent = tab === "Thường mua";
  const frequent = useFrequentlyBought(isFrequent);
  const selected = homeShowcaseProducts(catalog, categories);
  const personalized = customer?.status === "active";
  const showHistory = isFrequent && personalized;
  const hasHistory = Boolean(frequent.products.length);
  const noHistory = showHistory && frequent.data && !hasHistory && !frequent.error;
  const products = (tab === "Khuyến mãi" ? catalog.filter(p => p.oldPrice && p.oldPrice > p.price) : isFrequent ? showHistory && !noHistory ? frequent.products : selected.recommended : selected.featured).slice(0, HOME_SHOWCASE_LIMIT);
  const emptyTitle = showHistory && !noHistory ? "Chưa có sản phẩm thường mua" : "Chưa có sản phẩm";
  return (
    <div className="bt-container" data-product-showcase>
      <ProductCarousel key={tab} products={products} title="SẢN PHẨM NỔI BẬT / THƯỜNG MUA">
        <div className="flex flex-wrap items-center gap-1">
          {["Nổi bật", "Thường mua", "Khuyến mãi"].map(option => (
            <button key={option} aria-pressed={tab === option} onClick={() => setTab(option)} className={`h-8 rounded-md px-3 text-xs font-medium ${tab === option ? "bg-brand text-primary" : "bg-section text-primary"}`}>{option === "Thường mua" && (!personalized || noHistory) ? "Gợi ý cho bạn" : option}</button>
          ))}
          <Link href="/search" className="ml-2 text-xs font-semibold text-primary">Xem tất cả →</Link>
        </div>
      </ProductCarousel>
      {showHistory && <ResourceStatus {...frequent} />}
      {!products.length && !(showHistory && (frequent.loading || frequent.error)) && <EmptyState title={emptyTitle} href="/search" action="Tìm sản phẩm" />}
    </div>
  );
}

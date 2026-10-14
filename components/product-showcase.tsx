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
// @ts-ignore - Type definitions issue with @splidejs/react-splide package.json exports
import { Splide, SplideSlide } from "@splidejs/react-splide";
import "@splidejs/react-splide/css/core";

export function ProductCarousel({ products, title, children }: { products: Product[]; title: string; children?: React.ReactNode }) {
  const splideRef = useRef<any>(null);

  return (
    <section className="mt-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-primary">{title}</h2>
        {children || <Link href="/search" className="inline-flex items-center gap-1 text-xs font-semibold text-primary">Xem tất cả<ArrowRight size={14} /></Link>}
      </div>
      <div className="relative product-carousel">
        <Splide
          ref={splideRef}
          options={{
            type: "slide",
            rewind: false,
            perPage: 5,
            perMove: 1,
            gap: "0.75rem",
            padding: 0,
            pagination: false,
            arrows: products.length > 5,
            drag: true,
            keyboard: "global",
            breakpoints: {
              1024: {
                perPage: 4,
                arrows: products.length > 4,
              },
              768: {
                perPage: 3,
                arrows: products.length > 3,
              },
              640: {
                perPage: 2,
                arrows: false,
              },
            },
          }}
          aria-label={title}
        >
          {products.map(product => (
            <SplideSlide key={product.id}>
              <ProductCard product={product} />
            </SplideSlide>
          ))}
        </Splide>
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
            <button key={option} aria-pressed={tab === option} onClick={() => setTab(option)} className={`h-8 rounded-md px-3 text-xs font-medium ${tab === option ? "bg-brand text-white" : "bg-section text-primary"}`}>{option === "Thường mua" && (!personalized || noHistory) ? "Gợi ý cho bạn" : option}</button>
          ))}
          <Link href="/search" className="ml-2 text-xs font-semibold text-primary">Xem tất cả →</Link>
        </div>
      </ProductCarousel>
      {showHistory && <ResourceStatus {...frequent} />}
      {!products.length && !(showHistory && (frequent.loading || frequent.error)) && <EmptyState title={emptyTitle} href="/search" action="Tìm sản phẩm" />}
    </div>
  );
}

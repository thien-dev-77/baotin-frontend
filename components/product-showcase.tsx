"use client";
import { Product } from "@/lib/catalog";
import { useCommerce } from "@/components/commerce-provider";
import { ProductCard } from "@/components/product-card";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";

export function ProductCarousel({ products, title, children }: { products: Product[]; title: string; children?: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const move = (direction: number) => ref.current?.scrollBy({ left: direction * ref.current.clientWidth * 0.8, behavior: "smooth" });
  return <section className="mt-6"><div className="mb-3 flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold text-primary">{title}</h2>{children || <Link href="/search" className="inline-flex items-center gap-1 text-xs font-semibold text-blue-brand">Xem tất cả<ArrowRight size={14} /></Link>}</div><div className="relative"><button aria-label="Sản phẩm trước" title="Sản phẩm trước" className="absolute -left-3 top-[90px] z-10 hidden h-8 w-8 items-center justify-center rounded-full border border-border bg-white text-primary shadow-card lg:flex" onClick={() => move(-1)}><ChevronLeft size={18} /></button><div ref={ref} className="scrollbar-hide grid auto-cols-[170px] grid-flow-col gap-3 overflow-x-auto scroll-smooth pb-1 lg:auto-cols-[calc((100%_-_48px)_/_5)]">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div><button aria-label="Sản phẩm tiếp theo" title="Sản phẩm tiếp theo" className="absolute -right-3 top-[90px] z-10 hidden h-8 w-8 items-center justify-center rounded-full border border-border bg-white text-primary shadow-card lg:flex" onClick={() => move(1)}><ChevronRight size={18} /></button></div></section>;
}
export function ProductShowcase() {
  const { products: catalog } = useCommerce();
  const [tab, setTab] = useState("Bán chạy");
  const products = tab === "Khuyến mãi" ? catalog.filter((p) => p.oldPrice) : tab === "Thường mua" ? catalog.slice(0, 10).reverse() : catalog.slice(0, 10);
  return <div className="bt-container"><ProductCarousel key={tab} products={products} title="SẢN PHẨM BÁN CHẠY / THƯỜNG MUA"><div className="flex flex-wrap items-center gap-1">{["Bán chạy", "Thường mua", "Khuyến mãi"].map((option) => <button key={option} aria-pressed={tab === option} onClick={() => setTab(option)} className={`h-8 rounded-md px-3 text-xs font-medium ${tab === option ? "bg-blue-brand text-white" : "bg-section text-primary"}`}>{option}</button>)}<Link href="/search" className="ml-2 text-xs font-semibold text-blue-brand">Xem tất cả →</Link></div></ProductCarousel></div>;
}

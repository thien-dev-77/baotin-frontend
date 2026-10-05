import { ProductCard } from "@/components/product-card";
import type { Product } from "@/lib/catalog";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function CategoryProductSection({ title, caption, href, products }: { title: string; caption: string; href: string; products: Product[] }) {
  return (
    <section className="bt-container mt-7" aria-label={title} data-category-products>
      <Link href={href} aria-label={`Xem danh mục ${title}`} className="bt-category-product-banner">
        <div className="bt-category-product-banner-copy">
          <span className="text-xs font-semibold text-white/70">HAFELE</span>
          <h2 className="mt-3 text-[22px] font-bold leading-tight text-white sm:text-[28px]">{title}</h2>
          <p className="mt-2 text-xs leading-5 text-white/80 sm:text-sm">{caption}</p>
          <span className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-white">Xem danh mục<ArrowRight size={15} aria-hidden="true" /></span>
        </div>
        <div className="bt-category-product-banner-image">
          <img src={products[0].image} alt={title} loading="lazy" className="h-full w-full object-contain" width={640} height={360} />
        </div>
      </Link>
      <div className="mt-[40px] bt-category-product-row scrollbar-hide" tabIndex={0} role="region" aria-label={`Sản phẩm ${title}`}>
        {products.map((product) => <ProductCard key={product.id} product={product} />)}
      </div>
      <div className="mt-3 flex justify-end">
        <Link href={href} className="inline-flex min-h-10 items-center gap-1.5 text-xs font-semibold text-blue-brand hover:text-blue-hover">Xem tất cả<ArrowRight size={15} aria-hidden="true" /></Link>
      </div>
    </section>
  );
}

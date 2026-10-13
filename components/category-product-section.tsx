import { ProductCard } from "@/components/product-card";
import type { Product } from "@/lib/catalog";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function CategoryProductSection({ title, href, products, subcategories = [] }: { title: string; href: string; products: Product[]; subcategories?: { name: string; href: string }[] }) {
  if (!products.length) return null;
  return (
    <section className="bt-container bt-category-products" aria-label={title} data-category-products>
      <div className="bt-category-products-heading">
        <h2>{title}</h2>
        <Link href={href} prefetch={false} className="bt-category-products-all">Xem tất cả<ChevronRight size={18} aria-hidden="true" /></Link>
      </div>
      {subcategories.length > 0 && <nav className="bt-category-products-subcategories scrollbar-hide" aria-label={`Danh mục con của ${title}`}>
        {subcategories.map(item => <Link key={item.name} href={item.href} prefetch={false}>{item.name}</Link>)}
      </nav>}
      <div className="bt-category-product-row scrollbar-hide" tabIndex={0} role="region" aria-label={`Sản phẩm ${title}`}>
        {products.map((product) => <ProductCard key={product.id} product={product} />)}
      </div>
    </section>
  );
}

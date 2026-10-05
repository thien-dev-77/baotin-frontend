import { ProductCard } from "@/components/product-card";
import type { Product } from "@/lib/catalog";

export function RelatedProducts({ products }: { products: Product[] }) {
  if (!products.length) return null;

  return (
    <section className="mt-8" aria-labelledby="related-products-heading">
      <h2 id="related-products-heading" className="mb-3 text-lg font-bold text-primary">Sản phẩm liên quan</h2>
      <div className="bt-product-detail-related-row scrollbar-hide" tabIndex={0} role="region" aria-label="Danh sách sản phẩm liên quan">
        {products.map((product) => <ProductCard key={product.id} product={product} />)}
      </div>
    </section>
  );
}

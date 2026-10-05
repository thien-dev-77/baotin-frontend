"use client";

import { ProductBundle } from "@/components/product-detail/product-bundle";
import { ProductGallery } from "@/components/product-detail/product-gallery";
import { ProductInformationTabs } from "@/components/product-detail/product-information-tabs";
import { ProductOverview } from "@/components/product-detail/product-overview";
import { ProductPurchasePanel } from "@/components/product-detail/product-purchase-panel";
import { ProductSpecifications } from "@/components/product-detail/product-specifications";
import { RelatedProducts } from "@/components/product-detail/related-products";
import { Breadcrumb } from "@/components/ui";
import { categoryCatalog, type Product } from "@/lib/catalog";
import { getProductRecommendations, getProductSpecifications, initialProductReviews, type ProductReview } from "@/lib/product-detail";
import { useEffect, useRef, useState } from "react";
import { useCommerce } from "@/components/commerce-provider";

export function ProductDetail({ product }: { product: Product }) {
  const { products } = useCommerce();
  product = products.find((item) => item.id === product.id) || product;
  const detailRef = useRef<HTMLElement>(null);
  const [tab, setTab] = useState("Mô tả sản phẩm");
  const [reviews, setReviews] = useState<ProductReview[]>(initialProductReviews);
  const category = categoryCatalog.find((item) => item.slug === product.category)!;
  const specifications = getProductSpecifications(product);
  const { related, bundle } = getProductRecommendations(product);

  useEffect(() => {
    const header = document.querySelector("header");
    if (!header) return;

    const updateOffset = () => {
      detailRef.current?.style.setProperty("--product-detail-sticky-top", `${header.getBoundingClientRect().height + 16}px`);
    };
    updateOffset();
    const observer = new ResizeObserver(updateOffset);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  const showReviews = () => {
    setTab("Đánh giá");
    document.getElementById("product-tabs")?.scrollIntoView({ behavior: "smooth" });
  };
  const addReview = (review: ProductReview) => setReviews((current) => [...current, review]);

  return (
    <main ref={detailRef} className="bt-container bt-page bt-product-detail">
      <Breadcrumb items={[{ label: category.name, href: `/category/${category.slug}` }, { label: product.name }]} />
      <div className="bt-product-detail-layout">
        <div className="bt-product-detail-intro grid items-start gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <ProductGallery product={product} />
          <ProductOverview product={product} specifications={specifications} reviewCount={reviews.length} onShowReviews={showReviews} />
        </div>
        <ProductPurchasePanel product={product} />
        <section className="bt-product-detail-information">
          <ProductSpecifications specifications={specifications} />
          <ProductInformationTabs
            product={product}
            specifications={specifications}
            tab={tab}
            onTabChange={setTab}
            reviews={reviews}
            onAddReview={addReview}
          />
        </section>
      </div>
      <ProductBundle products={bundle} />
      <RelatedProducts products={related} />
    </main>
  );
}

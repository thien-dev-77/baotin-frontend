"use client";

import { ProductBundle } from "@/components/product-detail/product-bundle";
import { ProductGallery } from "@/components/product-detail/product-gallery";
import { ProductInformationTabs } from "@/components/product-detail/product-information-tabs";
import { ProductOverview } from "@/components/product-detail/product-overview";
import { ProductPurchasePanel } from "@/components/product-detail/product-purchase-panel";
import { ProductSpecifications } from "@/components/product-detail/product-specifications";
import { RelatedProducts } from "@/components/product-detail/related-products";
import { Breadcrumb } from "@/components/ui";
import { type Product } from "@/lib/catalog";
import { getProductRecommendations, getProductSpecifications, initialProductReviews, type ProductReview } from "@/lib/product-detail";
import { useEffect, useRef, useState } from "react";
import { useCommerce } from "@/components/commerce-provider";
import { apiMode } from "@/lib/api-client";
import { useApiResource } from "@/lib/use-api-resource";
import { useProductSelection } from "@/lib/use-product-selection";
import { readCatalogPage } from "@/lib/commerce-api";
import type { CatalogPageResponse } from "@/lib/api-types";

export function ProductDetail({ product: initialProduct }: { product: Product }) {
  const { products, categories } = useCommerce();
  useProductSelection([initialProduct.id]);
  const product = products.find((item) => item.id === initialProduct.id) || initialProduct;
  const detailRef = useRef<HTMLElement>(null);
  const [tab, setTab] = useState("Mô tả sản phẩm");
  const [reviews, setReviews] = useState<ProductReview[]>(initialProductReviews);
  const reviewResource = useApiResource<{ items: ProductReview[] }>(`/reviews/${encodeURIComponent(product.id)}`);
  const visibleReviews = apiMode ? reviewResource.data?.items || [] : reviews;
  const rating = visibleReviews.length ? visibleReviews.reduce((sum, review) => sum + review.stars, 0) / visibleReviews.length : 0;
  const category = categories.find((item) => item.slug === product.category);
  const specifications = getProductSpecifications(product);
  const recommendations = useApiResource<CatalogPageResponse>(`/catalog/search?category=${encodeURIComponent(product.category)}&pageSize=5`, apiMode, undefined, readCatalogPage);
  const { related, bundle } = getProductRecommendations(product, apiMode ? recommendations.data?.products || [] : products);

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
      <Breadcrumb items={[...(category ? [{ label: category.name, href: `/category/${category.slug}` }] : []), { label: product.name }]} />
      <div className="bt-product-detail-layout">
        <div className="bt-product-detail-intro grid items-start gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <ProductGallery product={product} />
          <ProductOverview product={product} specifications={specifications} reviewCount={visibleReviews.length} rating={rating} onShowReviews={showReviews} />
        </div>
        <ProductPurchasePanel product={product} />
        <section className="bt-product-detail-information">
          <ProductSpecifications specifications={specifications} />
          <ProductInformationTabs
            product={product}
            specifications={specifications}
            tab={tab}
            onTabChange={setTab}
            reviews={visibleReviews}
            onAddReview={addReview}
            reviewResource={apiMode ? reviewResource : undefined}
          />
        </section>
      </div>
      <ProductBundle products={bundle} />
      <RelatedProducts products={related} />
    </main>
  );
}

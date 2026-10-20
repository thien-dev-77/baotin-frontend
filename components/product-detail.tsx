"use client";

import { ProductBundle } from "@/components/product-detail/product-bundle";
import { ProductGallery } from "@/components/product-detail/product-gallery";
import { ProductInformationTabs } from "@/components/product-detail/product-information-tabs";
import { ProductOverview } from "@/components/product-detail/product-overview";
import { ProductPurchasePanel } from "@/components/product-detail/product-purchase-panel";
import { ProductSpecifications } from "@/components/product-detail/product-specifications";
import { ProductVariantSelector } from "@/components/product-detail/product-variant-selector";
import { RelatedProducts } from "@/components/product-detail/related-products";
import { Breadcrumb } from "@/components/ui";
import { type Product } from "@/lib/catalog";
import { getProductRecommendations, getProductSpecifications, initialProductReviews, type ProductReview } from "@/lib/product-detail";
import { getTechnicalSpecificationRows } from "@/lib/product-technical-specifications";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCommerce } from "@/components/commerce-provider";
import { apiMode } from "@/lib/api-client";
import { useApiResource } from "@/lib/use-api-resource";
import { useProductSelection } from "@/lib/use-product-selection";
import { readCatalogPage } from "@/lib/commerce-api";
import type { CatalogPageResponse } from "@/lib/api-types";
import { categoryTrail } from "@/lib/category-tree";

export function ProductDetail({ product: initialProduct }: { product: Product & { variants?: Product[] } }) {
  const { products, categories } = useCommerce();
  const selection = useProductSelection([initialProduct.id, ...initialProduct.variants?.map(item => item.id) || []], [initialProduct.id]);
  const loadedProducts = selection.products || products;
  const product = loadedProducts.find((item) => item.id === initialProduct.id) || initialProduct;
  const variants = initialProduct.variants?.map(item => loadedProducts.find(loaded => loaded.id === item.id) || item) || (!apiMode && product.variantGroupId ? products.filter(item => item.variantGroupId === product.variantGroupId) : []);
  const detailRef = useRef<HTMLElement>(null);
  const [tab, setTab] = useState("Mô tả sản phẩm");
  const [reviews, setReviews] = useState<ProductReview[]>(initialProductReviews);
  const reviewResource = useApiResource<{ items: ProductReview[] }>(`/reviews/${encodeURIComponent(product.id)}`);
  const visibleReviews = apiMode ? reviewResource.data?.items || [] : reviews;
  const rating = visibleReviews.length ? visibleReviews.reduce((sum, review) => sum + review.stars, 0) / visibleReviews.length : 0;
  const category = categories.find((item) => item.slug === product.category);
  const technicalRows = useMemo(() => getTechnicalSpecificationRows(product.technicalDetails), [product.technicalDetails]);
  const specifications = technicalRows.length === 1 ? getProductSpecifications(product) : technicalRows;
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
      <Breadcrumb items={[...(category ? categoryTrail(categories, category.slug).map(item => ({ label: item.name, href: `/category/${item.slug}` })) : []), { label: product.name }]} />
      <div className="bt-product-detail-layout">
        <div className="bt-product-detail-intro grid items-start gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <ProductGallery product={product} />
          <div><ProductOverview product={product} reviewCount={visibleReviews.length} rating={rating} onShowReviews={showReviews} /><ProductVariantSelector product={product} variants={variants} /></div>
        </div>
        <ProductPurchasePanel product={product} availability={apiMode ? selection : undefined} />
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

"use client";

import { useCommerce } from "./commerce-provider";
import { CategoryProductSection } from "./category-product-section";

const productsPerGroup = 5;

export function HomeLockSections() {
  const { products, categories } = useCommerce();
  const category = categories.find(item => item.slug === "khoa");
  if (!category) return null;
  return category.subcategories.map(title => {
    const entries = products.filter(product => product.category === category.slug && product.subcategory === title).slice(0, productsPerGroup);
    if (!entries.length) return null;
    return <CategoryProductSection key={title} title={title} caption={category.description} href={`/category/${category.slug}?subcategory=${encodeURIComponent(title)}`} products={entries} />;
  });
}

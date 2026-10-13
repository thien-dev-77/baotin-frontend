"use client";

import { useCommerce } from "./commerce-provider";
import { CategoryProductSection } from "./category-product-section";

const productsPerGroup = 5;
const categorySections = 5;

export function HomeCategoryProducts() {
  const { products, categories } = useCommerce();
  return categories.filter(category => category.visible !== false && products.some(product => product.category === category.slug)).slice(0, categorySections).map(category => {
    const entries = products.filter(product => product.category === category.slug).slice(0, productsPerGroup);
    const href = `/category/${category.slug}`;
    const subcategories = category.subcategories.map(name => ({ name, href: `${href}?subcategory=${encodeURIComponent(name)}` }));
    return <CategoryProductSection key={category.slug} title={category.name} href={href} products={entries} subcategories={subcategories} />;
  });
}

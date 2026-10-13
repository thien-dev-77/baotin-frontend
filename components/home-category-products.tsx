"use client";

import { useCommerce } from "./commerce-provider";
import { CategoryProductSection } from "./category-product-section";
import { categoryRoots, categoryDescendants } from "@/lib/category-tree";

const productsPerGroup = 5;
const categorySections = 5;

export function HomeCategoryProducts() {
  const { products, categories } = useCommerce();
  return categoryRoots(categories).filter(category => category.visible !== false && products.some(product => categoryDescendants(categories, category.slug).includes(product.category))).slice(0, categorySections).map(category => {
    const descendants = new Set(categoryDescendants(categories, category.slug));
    const entries = products.filter(product => descendants.has(product.category)).slice(0, productsPerGroup);
    const href = `/category/${category.slug}`;
    const children = categories.filter(child => child.parentSlug === category.slug);
    const subcategories = children.length ? children.map(child => ({ name: child.name, href: `/category/${child.slug}` })) : category.subcategories.map(name => ({ name, href: `${href}?subcategory=${encodeURIComponent(name)}` }));
    return <CategoryProductSection key={category.slug} title={category.name} href={href} products={entries} subcategories={subcategories} />;
  });
}

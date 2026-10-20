"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Package } from "lucide-react";
import { Splide, SplideSlide, SplideTrack } from "@splidejs/react-splide";
import "@splidejs/react-splide/css/core";
import type { Category } from "@/lib/types";
import { useCommerce } from "./commerce-provider";
import { SectionHeading } from "./section-heading";
import { Breadcrumb, EmptyState, PageHeading } from "./ui";
import { categoryRoots, MAX_CATEGORY_DEPTH } from "@/lib/category-tree";

function CategoryTile({
  category,
  compact = false,
}: {
  category: Category;
  compact?: boolean;
}) {
  return (
    <Link
      href={`/category/${category.slug}`}
      className={`group block min-w-0 overflow-hidden rounded-lg border border-border bg-white shadow-card transition hover:border-brand hover:shadow-card-hover ${compact ? "h-full" : ""}`}
    >
      <div className="relative aspect-[1.35/1] overflow-hidden bg-section">
        {category.image ? (
          <Image
            src={category.image}
            data-image-src={category.image}
            alt={category.name}
            fill
            sizes={
              compact
                ? "(min-width: 1320px) 250px, (min-width: 1024px) 20vw, (min-width: 768px) 25vw, (min-width: 640px) 33vw, 50vw"
                : "(min-width: 1024px) 320px, (min-width: 640px) 45vw, 90vw"
            }
            quality={85}
            className="object-cover transition duration-200 group-hover:scale-[1.03]"
          />
        ) : (
          <Package
            className="absolute inset-0 m-auto text-text-muted"
            size={32}
          />
        )}
      </div>
      <div
        className={`${compact ? "flex min-h-8 items-center justify-center px-1 py-1 text-center text-xs" : "p-3 text-sm"} font-semibold text-primary`}
      >
        {category.name}
        {!compact && category.description && (
          <p className="mt-1 line-clamp-2 text-xs font-normal leading-5 text-text-secondary">
            {category.description}
          </p>
        )}
      </div>
    </Link>
  );
}

export function HomeCategorySection() {
  const { categories } = useCommerce();
  const roots = categoryRoots(categories);
  if (!roots.length) return null;
  return (
    <section className="bt-container mt-5">
      <SectionHeading
        title="Danh mục sản phẩm chính"
        link="Xem tất cả danh mục"
        href="/categories"
      />
      <Splide
        className="bt-category-carousel"
        hasTrack={false}
        aria-label="Danh mục sản phẩm chính"
        options={{
          type: "slide",
          perPage: 5,
          perMove: 1,
          gap: "0.5rem",
          pagination: false,
          arrows: roots.length > 5,
          keyboard: "focused",
          i18n: { prev: "Danh mục trước", next: "Danh mục tiếp" },
          breakpoints: {
            1023: { perPage: 4, arrows: roots.length > 4 },
            767: { perPage: 3, arrows: roots.length > 3 },
            639: { perPage: 2, arrows: roots.length > 2 },
          },
        }}
      >
        <SplideTrack>
          {roots.map((category) => (
            <SplideSlide key={category.slug}>
              <CategoryTile category={category} compact />
            </SplideSlide>
          ))}
        </SplideTrack>
        {roots.length > 1 && (
          <div className="splide__arrows">
            <button type="button" className="splide__arrow splide__arrow--prev"><ChevronLeft size={20} aria-hidden="true" /></button>
            <button type="button" className="splide__arrow splide__arrow--next"><ChevronRight size={20} aria-hidden="true" /></button>
          </div>
        )}
      </Splide>
    </section>
  );
}

export function AllCategories() {
  const { categories } = useCommerce();
  return (
    <main className="bt-container bt-page">
      <Breadcrumb items={[{ label: "Danh mục sản phẩm" }]} />
      <PageHeading title="Danh mục sản phẩm" />
      {categories.length ? (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {categoryRoots(categories).map((category) => <section key={category.slug} className="min-w-0">
            <CategoryTile category={category} />
            <CategoryChildren categories={categories} parent={category.slug} depth={0} />
          </section>)}
        </div>
      ) : (
        <EmptyState title="Chưa có danh mục" />
      )}
    </main>
  );
}

function CategoryChildren({ categories, parent, depth }: { categories: Category[]; parent: string; depth: number }) {
  const children = depth < MAX_CATEGORY_DEPTH - 1 ? categories.filter(category => category.parentSlug === parent) : [];
  if (!children.length) return null;
  return <ul className="mt-2 space-y-1 border-l border-border pl-3">{children.map(category => <li key={category.slug}>
    <Link href={`/category/${category.slug}`} className="inline-flex min-h-9 items-center break-words text-sm text-primary hover:underline">{category.name}</Link>
    <CategoryChildren categories={categories} parent={category.slug} depth={depth + 1} />
  </li>)}</ul>;
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { Package } from "lucide-react";
import type { Category } from "@/lib/types";
import { useCommerce } from "./commerce-provider";
import { SectionHeading } from "./section-heading";
import { Breadcrumb, EmptyState, PageHeading } from "./ui";

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
      className={`group overflow-hidden rounded-lg border border-border bg-white shadow-card transition hover:border-blue-brand hover:shadow-card-hover ${compact ? "w-[126px] shrink-0 md:w-auto" : "min-w-0"}`}
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
                ? "(min-width: 1024px) 160px, (min-width: 768px) 25vw, 126px"
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
  if (!categories.length) return null;
  return (
    <section className="bt-container mt-5">
      <SectionHeading
        title="Danh mục sản phẩm chính"
        link="Xem tất cả danh mục"
        href="/categories"
      />
      <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-1 md:grid md:grid-cols-4 lg:grid-cols-8">
        {categories.map((category) => (
          <CategoryTile key={category.slug} category={category} compact />
        ))}
      </div>
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
          {categories.map((category) => (
            <CategoryTile key={category.slug} category={category} />
          ))}
        </div>
      ) : (
        <EmptyState title="Chưa có danh mục" />
      )}
    </main>
  );
}

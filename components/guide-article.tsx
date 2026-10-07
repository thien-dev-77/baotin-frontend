"use client";
import Image from "next/image";
import Link from "next/link";
import type { PublicContent } from "@/lib/content-types";
import { useCommerce } from "./commerce-provider";
import { GuideCard } from "./content-pages";
import { ProductGrid } from "./product-card";
import { Breadcrumb, PageHeading } from "./ui";
export function GuideArticle({
  guide,
  guides,
}: {
  guide: PublicContent;
  guides: PublicContent[];
}) {
  const { products } = useCommerce();
  return (
    <main className="bt-container bt-page">
      <Breadcrumb
        items={[
          { label: "Hướng dẫn", href: "/guides" },
          { label: guide.title },
        ]}
      />
      <article className="max-w-3xl">
        <PageHeading title={guide.title} description={guide.description} />
        <p className="mb-4 text-xs text-text-muted">
          Bảo Tín · {guide.minutes} phút đọc
        </p>
        <Image
          src={guide.image}
          alt={guide.title}
          width={768}
          height={320}
          sizes="(min-width: 1024px) 768px, 100vw"
          quality={85}
          className="mb-6 aspect-[12/5] w-full rounded-lg object-cover"
        />
        {guide.body.split(/\n\s*\n/).map((paragraph, index) => (
          <p
            key={index}
            className="mb-5 whitespace-pre-line break-words text-sm leading-7 text-text-secondary"
          >
            {paragraph}
          </p>
        ))}
        <Link href="/contact" className="bt-button-secondary">
          Nhận tư vấn
        </Link>
      </article>
      <section className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-primary">
          Sản phẩm được gợi ý
        </h2>
        <ProductGrid
          products={products
            .filter((row) => row.category === guide.category)
            .slice(0, 5)}
        />
      </section>
      <section className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-primary">
          Hướng dẫn liên quan
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {guides
            .filter((row) => row.id !== guide.id)
            .slice(0, 3)
            .map((row) => (
              <GuideCard key={row.id} guide={row} />
            ))}
        </div>
      </section>
    </main>
  );
}

import { CatalogPage } from "@/components/catalog-page";
import type { ListingSearchParams } from "@/lib/catalog-query";
import { getCatalogBrands, slugify } from "@/lib/catalog";
import { serverCatalog } from "@/lib/server-api";
import { notFound } from "next/navigation";
export default async function BrandPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<ListingSearchParams> }) {
  const { slug } = await params;
  const { products, brands } = await serverCatalog();
  const brand = (brands || getCatalogBrands(products)).find(name => slugify(name) === slug);
  if (!brand) notFound();
  return <CatalogPage brand={brand} searchParams={await searchParams} />;
}

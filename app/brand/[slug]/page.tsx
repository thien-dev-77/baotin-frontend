import { CatalogListing } from "@/components/catalog-listing";
import { getCatalogBrands, slugify } from "@/lib/catalog";
import { serverCatalog } from "@/lib/server-api";
import { notFound } from "next/navigation";
export default async function BrandPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { products } = await serverCatalog();
  const brand = getCatalogBrands(products).find(name => slugify(name) === slug);
  if (!brand) notFound();
  return <CatalogListing brand={brand} />;
}

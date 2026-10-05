import { CatalogListing } from "@/components/catalog-listing";
import { brands, slugify } from "@/lib/catalog";
import { notFound } from "next/navigation";
export default async function BrandPage({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; const brand = brands.find((name) => slugify(name) === slug); if (!brand) notFound(); return <CatalogListing brand={brand} />; }

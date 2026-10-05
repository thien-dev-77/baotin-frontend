import { CatalogListing } from "@/components/catalog-listing";
import { brands, slugify } from "@/lib/catalog";
import { notFound } from "next/navigation";
export default function BrandPage({ params }: { params: { slug: string } }) { const brand = brands.find((name) => slugify(name) === params.slug); if (!brand) notFound(); return <CatalogListing brand={brand} />; }

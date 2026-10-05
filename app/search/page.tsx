import { CatalogListing } from "@/components/catalog-listing";
export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) { const { q } = await searchParams; return <CatalogListing key={q || ""} query={q || ""} />; }

import { CatalogListing } from "@/components/catalog-listing";
export default function SearchPage({ searchParams }: { searchParams: { q?: string } }) { return <CatalogListing key={searchParams.q || ""} query={searchParams.q || ""} />; }

import { CatalogPage } from "@/components/catalog-page";
import type { ListingSearchParams } from "@/lib/catalog-query";
export default async function SearchPage({ searchParams }: { searchParams: Promise<ListingSearchParams> }) {
  const params = await searchParams;
  return <CatalogPage searchParams={params} query={typeof params.q === "string" ? params.q : ""} />;
}

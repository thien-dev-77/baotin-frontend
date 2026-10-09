import { CatalogDocument } from "@/components/catalog-document";
import { listingParams, type ListingSearchParams } from "@/lib/catalog-query";
import { serverCatalogPage } from "@/lib/server-api";
import type { CatalogPageResponse } from "@/lib/api-types";

export default async function CatalogPage({ searchParams }: { searchParams: Promise<ListingSearchParams> }) {
  const params = listingParams(await searchParams);
  params.set("pageSize", "60");
  let initialPage: CatalogPageResponse | undefined;
  let initialError: string | undefined;
  try { initialPage = await serverCatalogPage(params); }
  catch (cause) { initialError = cause instanceof Error ? cause.message : "Không thể tải catalog."; }
  return <CatalogDocument queryString={params.toString()} initialPage={initialPage} initialError={initialError} />;
}

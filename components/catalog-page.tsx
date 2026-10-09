import { CatalogListing } from "./catalog-listing";
import { listingParams, type ListingSearchParams } from "@/lib/catalog-query";
import { serverCatalogPage } from "@/lib/server-api";
import type { Category } from "@/lib/types";

export async function CatalogPage({ searchParams, category, brand, query, promotion }: { searchParams: ListingSearchParams; category?: Category; brand?: string; query?: string; promotion?: boolean }) {
  const params = listingParams(searchParams, { category: category?.slug, brand, query, promotion });
  let initialPage;
  let initialError = "";
  try { initialPage = await serverCatalogPage(params); }
  catch { initialError = "Không thể tải danh sách sản phẩm. Vui lòng thử lại."; }
  return <CatalogListing category={category} brand={brand} query={query} promotion={promotion} queryString={params.toString()} initialPage={initialPage} initialError={initialError} />;
}

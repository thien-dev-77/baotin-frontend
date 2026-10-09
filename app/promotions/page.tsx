import { CatalogPage } from "@/components/catalog-page";
import type { ListingSearchParams } from "@/lib/catalog-query";
export default async function PromotionsPage({ searchParams }: { searchParams: Promise<ListingSearchParams> }) { return <CatalogPage searchParams={await searchParams} promotion />; }

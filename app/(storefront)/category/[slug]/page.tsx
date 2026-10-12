import { CatalogPage } from "@/components/catalog-page";
import type { ListingSearchParams } from "@/lib/catalog-query";
import { serverCategory } from "@/lib/server-api";
import { notFound } from "next/navigation";
export default async function CategoryPage(props: { params: Promise<{ slug: string }>; searchParams: Promise<ListingSearchParams> }) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const category = await serverCategory(params.slug);
  if (!category) notFound();
  const requested = searchParams.subcategory;
  const subcategory = typeof requested === "string" && category.subcategories.includes(requested) ? requested : "";
  return <CatalogPage category={category} searchParams={{ ...searchParams, subcategory }} />;
}

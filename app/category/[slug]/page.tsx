import { CatalogListing } from "@/components/catalog-listing";
import { serverCategory } from "@/lib/server-api";
import { notFound } from "next/navigation";
export default async function CategoryPage(props: { params: Promise<{ slug: string }>; searchParams: Promise<{ subcategory?: string | string[] }> }) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const category = await serverCategory(params.slug);
  if (!category) notFound();
  const requested = searchParams.subcategory;
  const subcategory = typeof requested === "string" && category.subcategories.includes(requested) ? requested : "";
  return <CatalogListing key={`${category.slug}:${subcategory}`} category={category} initialSubcategory={subcategory} />;
}

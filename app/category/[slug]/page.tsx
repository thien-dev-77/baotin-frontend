import { CatalogListing } from "@/components/catalog-listing";
import { findCategory } from "@/lib/catalog";
import { notFound } from "next/navigation";
export default async function CategoryPage(props: { params: Promise<{ slug: string }>; searchParams: Promise<{ subcategory?: string | string[] }> }) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const category = findCategory(params.slug);
  if (!category) notFound();
  const requested = searchParams.subcategory;
  const subcategory = typeof requested === "string" && category.subcategories.includes(requested) ? requested : "";
  return <CatalogListing key={`${category.slug}:${subcategory}`} category={category} initialSubcategory={subcategory} />;
}

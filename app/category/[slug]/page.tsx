import { CatalogListing } from "@/components/catalog-listing";
import { findCategory } from "@/lib/catalog";
import { notFound } from "next/navigation";
export default function CategoryPage({ params, searchParams }: { params: { slug: string }; searchParams: { subcategory?: string | string[] } }) {
  const category = findCategory(params.slug);
  if (!category) notFound();
  const requested = searchParams.subcategory;
  const subcategory = typeof requested === "string" && category.subcategories.includes(requested) ? requested : "";
  return <CatalogListing key={`${category.slug}:${subcategory}`} category={category} initialSubcategory={subcategory} />;
}

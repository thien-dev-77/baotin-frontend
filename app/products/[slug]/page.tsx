import { ProductDetail } from "@/components/product-detail";
import { serverProduct } from "@/lib/server-api";
import { notFound } from "next/navigation";

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await serverProduct(params.slug);
  if (!product) notFound();
  return <ProductDetail key={product.id} product={product} />;
}

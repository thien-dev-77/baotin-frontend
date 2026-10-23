import { ProductDetail } from "@/components/product-detail";
import { serverProduct } from "@/lib/server-api";
import { productMetadata, storefrontOrigin } from "@/lib/product-metadata";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

type ProductPageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const product = await serverProduct((await params).slug);
  if (!product) notFound();
  return productMetadata(product, storefrontOrigin(await headers(), process.env.SITE_URL));
}

export default async function ProductPage({ params: pending }: ProductPageProps) {
  const params = await pending;
  const product = await serverProduct(params.slug);
  if (!product) notFound();
  return <ProductDetail key={product.id} product={product} />;
}

import { ProductVariantGroupPage } from "@/components/admin/product-variant-group-editor";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <ProductVariantGroupPage id={(await params).id} />;
}

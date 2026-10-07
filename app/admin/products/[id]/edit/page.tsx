import { ProductEditorPage } from "@/components/admin/product-editor";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <ProductEditorPage id={(await params).id} />;
}

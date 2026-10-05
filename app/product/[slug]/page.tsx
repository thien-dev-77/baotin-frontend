import { redirect } from "next/navigation";
export default function ProductAlias({ params }: { params: { slug: string } }) { redirect(`/products/${params.slug}`); }

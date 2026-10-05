import { GuideDetail } from "@/components/content-pages";
import { guideCatalog } from "@/lib/catalog";
import { notFound } from "next/navigation";
export default function GuidePage({ params }: { params: { slug: string } }) { if (!guideCatalog.some((guide) => guide.slug === params.slug)) notFound(); return <GuideDetail slug={params.slug} />; }

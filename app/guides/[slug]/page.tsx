import { GuideDetail } from "@/components/content-pages";
import { guideCatalog } from "@/lib/catalog";
import { notFound } from "next/navigation";
export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; if (!guideCatalog.some((guide) => guide.slug === slug)) notFound(); return <GuideDetail slug={slug} />; }

import { GuideDetail } from "@/components/content-pages";
import { guideCatalog } from "@/lib/catalog";
import { notFound } from "next/navigation";
import { serverContent } from "@/lib/server-api";
import { GuideArticle } from "@/components/guide-article";
export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const content = await serverContent();
  if (content) { const guides = content.filter(row => row.kind === "guide"); const guide = guides.find(row => row.slug === slug); if (!guide) notFound(); return <GuideArticle guide={guide} guides={guides} />; }
  if (!guideCatalog.some(row => row.slug === slug)) notFound();
  return <GuideDetail slug={slug} />;
}

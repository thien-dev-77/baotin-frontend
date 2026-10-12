import { GuidesView } from "@/components/content-pages";
import { serverContent } from "@/lib/server-api";
export default async function GuidesPage() { const content = await serverContent(); return <GuidesView guides={content?.filter(row => row.kind === "guide")} />; }

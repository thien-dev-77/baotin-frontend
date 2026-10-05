import { AuthView } from "@/components/auth-view";
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) { return <AuthView next={(await searchParams).next} />; }

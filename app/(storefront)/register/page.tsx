import { AuthView } from "@/components/auth-view";
export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) { return <AuthView register next={(await searchParams).next} />; }

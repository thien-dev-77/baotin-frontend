import { AuthView } from "@/components/auth-view";
export default function LoginPage({ searchParams }: { searchParams: { next?: string } }) { return <AuthView next={searchParams.next} />; }

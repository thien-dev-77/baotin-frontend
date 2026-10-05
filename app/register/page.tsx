import { AuthView } from "@/components/auth-view";
export default function RegisterPage({ searchParams }: { searchParams: { next?: string } }) { return <AuthView register next={searchParams.next} />; }

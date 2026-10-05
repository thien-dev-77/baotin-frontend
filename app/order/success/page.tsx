import { SuccessView } from "@/components/checkout-flow";
export default async function OrderSuccessPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) { return <SuccessView id={(await searchParams).id} />; }

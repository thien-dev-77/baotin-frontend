import { SuccessView } from "@/components/checkout-flow";
export default function OrderSuccessPage({ searchParams }: { searchParams: { id?: string } }) { return <SuccessView id={searchParams.id} />; }

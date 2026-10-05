import { OrderDetailView } from "@/components/order-views";
export default function OrderPage({ params }: { params: { id: string } }) { return <OrderDetailView id={params.id} />; }

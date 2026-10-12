import { OrderDetailView } from "@/components/order-views";
export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) { return <OrderDetailView id={(await params).id} />; }

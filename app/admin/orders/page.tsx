import { AdminOrders } from "@/components/admin/admin-orders";

export default function Page({ searchParams }: { searchParams: { status?: string; order?: string } }) {
  return <AdminOrders key={`${searchParams.status || "all"}-${searchParams.order || ""}`} initialStatus={searchParams.status} initialOrder={searchParams.order} />;
}

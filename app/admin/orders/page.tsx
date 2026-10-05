import { AdminOrders } from "@/components/admin/admin-orders";

export default async function Page({ searchParams: pending }: { searchParams: Promise<{ status?: string; order?: string }> }) {
  const searchParams = await pending;
  return <AdminOrders key={`${searchParams.status || "all"}-${searchParams.order || ""}`} initialStatus={searchParams.status} initialOrder={searchParams.order} />;
}

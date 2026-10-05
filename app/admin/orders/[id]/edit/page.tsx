import { AdminSalesOrder } from "@/components/admin/admin-sales-order";

export default async function Page({ params: pending }: { params: Promise<{ id: string }> }) {
  const params = await pending;
  return <AdminSalesOrder id={params.id} />;
}

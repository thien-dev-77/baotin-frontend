import { AdminSalesOrder } from "@/components/admin/admin-sales-order";

export default function Page({ params }: { params: { id: string } }) {
  return <AdminSalesOrder id={params.id} />;
}

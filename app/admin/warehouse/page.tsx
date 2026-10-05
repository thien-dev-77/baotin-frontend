import { AdminWarehouse } from "@/components/admin/admin-warehouse";

export default async function Page({ searchParams: pending }: { searchParams: Promise<{ status?: string; order?: string }> }) {
  const searchParams = await pending;
  return <AdminWarehouse key={`${searchParams.status || "all"}-${searchParams.order || ""}`} initialStatus={searchParams.status} initialOrder={searchParams.order} />;
}

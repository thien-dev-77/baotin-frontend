import { AdminWarehouse } from "@/components/admin/admin-warehouse";

export default function Page({ searchParams }: { searchParams: { status?: string; order?: string } }) {
  return <AdminWarehouse key={`${searchParams.status || "all"}-${searchParams.order || ""}`} initialStatus={searchParams.status} initialOrder={searchParams.order} />;
}

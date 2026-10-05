import { AdminCustomers } from "@/components/admin/admin-customers";

export default function Page({ searchParams }: { searchParams: { status?: string } }) {
  const status = ["overdue", "overlimit"].includes(searchParams.status || "") ? searchParams.status : "all";
  return <AdminCustomers key={status} credit initialStatus={status} />;
}

import { AdminCustomers } from "@/components/admin/admin-customers";

export default async function Page({ searchParams: pending }: { searchParams: Promise<{ status?: string }> }) {
  const searchParams = await pending;
  const status = ["overdue", "overlimit"].includes(searchParams.status || "") ? searchParams.status : "all";
  return <AdminCustomers key={status} credit initialStatus={status} />;
}

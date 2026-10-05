import { AdminApprovalRequest } from "@/components/admin/admin-approval-request";

export default async function Page({ searchParams: pending }: { searchParams: Promise<{ order?: string; type?: string }> }) {
  const searchParams = await pending;
  return <AdminApprovalRequest initialOrder={searchParams.order} initialType={searchParams.type} />;
}

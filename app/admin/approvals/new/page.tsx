import { AdminApprovalRequest } from "@/components/admin/admin-approval-request";

export default function Page({ searchParams }: { searchParams: { order?: string; type?: string } }) {
  return <AdminApprovalRequest initialOrder={searchParams.order} initialType={searchParams.type} />;
}

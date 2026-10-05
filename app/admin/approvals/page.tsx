import { AdminApprovals } from "@/components/admin/admin-approvals";

export default function Page({ searchParams }: { searchParams: { request?: string } }) {
  return <AdminApprovals key={searchParams.request} initialRequest={searchParams.request} />;
}

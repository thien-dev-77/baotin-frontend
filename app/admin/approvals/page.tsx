import { AdminApprovals } from "@/components/admin/admin-approvals";

export default async function Page({ searchParams: pending }: { searchParams: Promise<{ request?: string }> }) {
  const searchParams = await pending;
  return <AdminApprovals key={searchParams.request} initialRequest={searchParams.request} />;
}

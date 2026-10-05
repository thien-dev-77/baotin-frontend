import { AdminCustomers } from "@/components/admin/admin-customers";

export default async function Page({ searchParams: pending }: { searchParams: Promise<{ status?: string }> }) {
  const searchParams = await pending;
  const status = ["Chờ duyệt", "Đang hoạt động", "Tạm ngưng"].includes(searchParams.status || "") ? searchParams.status : "all";
  return <AdminCustomers key={status} initialStatus={status} />;
}

import { AdminCustomers } from "@/components/admin/admin-customers";

export default function Page({ searchParams }: { searchParams: { status?: string } }) {
  const status = ["Chờ duyệt", "Đang hoạt động", "Tạm ngưng"].includes(searchParams.status || "") ? searchParams.status : "all";
  return <AdminCustomers key={status} initialStatus={status} />;
}

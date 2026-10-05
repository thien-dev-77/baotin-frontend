import type { Metadata } from "next";
import { AdminProvider } from "@/components/admin/admin-provider";
import { AdminShell } from "@/components/admin/admin-shell";

export const metadata: Metadata = {
  title: "Quản trị nội bộ | Bảo Tín",
  robots: { index: false, follow: false }
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminProvider><AdminShell>{children}</AdminShell></AdminProvider>;
}

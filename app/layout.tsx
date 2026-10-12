import "./globals.css";
import "./fonts.css";
import type { Metadata } from "next";
import { StoreProvider } from "@/components/store-provider";
import { NavigationProgress } from "@/components/navigation-progress";
import { UnsavedChangesProvider } from "@/components/admin/unsaved-changes-provider";

export const metadata: Metadata = {
  title: "Bảo Tín - Phụ kiện nội thất",
  description:
    "Catalog phụ kiện nội thất B2B/B2C cho công trình, xưởng nội thất và chủ nhà Việt."
};

// Cache public data, not complete account/admin HTML or build-time API snapshots.
export const revalidate = 0;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="font-sans antialiased"><NavigationProgress><StoreProvider><UnsavedChangesProvider>{children}</UnsavedChangesProvider></StoreProvider></NavigationProgress></body>
    </html>
  );
}

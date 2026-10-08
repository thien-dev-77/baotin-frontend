import "./globals.css";
import "./fonts.css";
import type { Metadata } from "next";
import { CommerceProvider } from "@/components/commerce-provider";
import { StoreProvider } from "@/components/store-provider";
import { SiteFrame } from "@/components/site-frame";
import { NavigationProgress } from "@/components/navigation-progress";
import { serverCatalog } from "@/lib/server-api";
import type { CatalogResponse } from "@/lib/api-types";
import { NotificationsProvider } from "@/components/notifications";

export const metadata: Metadata = {
  title: "Bảo Tín - Phụ kiện nội thất",
  description:
    "Catalog phụ kiện nội thất B2B/B2C cho công trình, xưởng nội thất và chủ nhà Việt."
};

// Cache public data, not complete account/admin HTML or build-time API snapshots.
export const revalidate = 0;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let initialCatalog: CatalogResponse | null = null;
  let initialCatalogError = "";
  try { initialCatalog = await serverCatalog(); }
  catch { initialCatalogError = "Không thể tải danh sách sản phẩm. Vui lòng thử lại."; }
  return (
    <html lang="vi">
      <body className="font-sans antialiased"><NavigationProgress><StoreProvider><CommerceProvider initialCatalog={initialCatalog} initialCatalogError={initialCatalogError}><NotificationsProvider><SiteFrame>{children}</SiteFrame></NotificationsProvider></CommerceProvider></StoreProvider></NavigationProgress></body>
    </html>
  );
}

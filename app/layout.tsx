import "./globals.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/inter/800.css";
import type { Metadata } from "next";
import { CommerceProvider } from "@/components/commerce-provider";
import { StoreProvider } from "@/components/store-provider";
import { SiteFrame } from "@/components/site-frame";
import { NavigationProgress } from "@/components/navigation-progress";
import { serverCatalog } from "@/lib/server-api";
import type { CatalogResponse } from "@/lib/api-types";

export const metadata: Metadata = {
  title: "Bảo Tín - Phụ kiện nội thất",
  description:
    "Catalog phụ kiện nội thất B2B/B2C cho công trình, xưởng nội thất và chủ nhà Việt."
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let initialCatalog: CatalogResponse | null = null;
  let initialCatalogError = "";
  try { initialCatalog = await serverCatalog(); }
  catch { initialCatalogError = "Không thể tải danh sách sản phẩm. Vui lòng thử lại."; }
  return (
    <html lang="vi">
      <body className="font-sans antialiased"><NavigationProgress><StoreProvider><CommerceProvider initialCatalog={initialCatalog} initialCatalogError={initialCatalogError}><SiteFrame>{children}</SiteFrame></CommerceProvider></StoreProvider></NavigationProgress></body>
    </html>
  );
}

import "./globals.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/inter/800.css";
import type { Metadata } from "next";
import { CommerceProvider } from "@/components/commerce-provider";
import { SiteFrame } from "@/components/site-frame";

export const metadata: Metadata = {
  title: "Bảo Tín - Phụ kiện nội thất",
  description:
    "Catalog phụ kiện nội thất B2B/B2C cho công trình, xưởng nội thất và chủ nhà Việt."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="font-sans antialiased"><CommerceProvider><SiteFrame>{children}</SiteFrame></CommerceProvider></body>
    </html>
  );
}

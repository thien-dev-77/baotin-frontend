import "./globals.css";
import "./fonts.css";
import type { Metadata } from "next";
import { StoreProvider } from "@/components/store-provider";
import { NavigationProgress } from "@/components/navigation-progress";
import { UnsavedChangesProvider } from "@/components/admin/unsaved-changes-provider";

export const metadata: Metadata = {
  title: "Bảo Tín - Phụ kiện nội thất",
  description:
    "Catalog phụ kiện nội thất B2B/B2C cho công trình, xưởng nội thất và chủ nhà Việt.",
  icons: {
    icon: { url: "/favicon-baotin.png", type: "image/png", sizes: "1254x1254" },
    shortcut: "/favicon-baotin.png",
    apple: "/favicon-baotin.png"
  }
};

// Cache public data, not complete account/admin HTML or build-time API snapshots.
export const revalidate = 0;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" data-scroll-behavior="smooth">
      <body className="font-sans antialiased"><NavigationProgress><StoreProvider><UnsavedChangesProvider>{children}</UnsavedChangesProvider></StoreProvider></NavigationProgress></body>
    </html>
  );
}

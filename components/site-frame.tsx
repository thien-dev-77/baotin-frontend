"use client";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { usePathname } from "next/navigation";

export function SiteFrame({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const admin = path === "/admin" || path.startsWith("/admin/");
  return <div className="flex min-h-screen flex-col">
    {!admin && <SiteHeader />}
    <div id="main-content" className="min-w-0 flex-1">{children}</div>
    {!admin && <SiteFooter />}
  </div>;
}

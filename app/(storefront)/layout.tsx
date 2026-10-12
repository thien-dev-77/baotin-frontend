import { CommerceProvider } from "@/components/commerce-provider";
import { NotificationsProvider } from "@/components/notifications";
import { SiteFrame } from "@/components/site-frame";
import { serverCatalog } from "@/lib/server-api";
import type { CatalogResponse } from "@/lib/api-types";

export default async function StorefrontLayout({ children }: { children: React.ReactNode }) {
  let initialCatalog: CatalogResponse | null = null;
  let initialCatalogError = "";
  try { initialCatalog = await serverCatalog(); }
  catch { initialCatalogError = "Không thể tải danh sách sản phẩm. Vui lòng thử lại."; }
  return <CommerceProvider initialCatalog={initialCatalog} initialCatalogError={initialCatalogError}><NotificationsProvider><SiteFrame>{children}</SiteFrame></NotificationsProvider></CommerceProvider>;
}

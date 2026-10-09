"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "@bprogress/next/app";
import { Download, Printer } from "lucide-react";
import { api, apiMode } from "@/lib/api-client";
import type { CatalogPageResponse } from "@/lib/api-types";
import { previewCatalogPage } from "@/lib/catalog-query";
import { readCatalogPage, readCatalogResponse } from "@/lib/commerce-api";
import { money } from "@/lib/catalog";
import { downloadAdminCsv } from "@/lib/admin-preview";
import type { Product } from "@/lib/types";
import { useApiResource } from "@/lib/use-api-resource";
import { useCommerce } from "./commerce-provider";
import { ResourceStatus } from "./admin/admin-resource";
import { Breadcrumb, Button, PageHeading } from "./ui";

export function CatalogDocument({ queryString, initialPage, initialError }: { queryString: string; initialPage?: CatalogPageResponse; initialError?: string }) {
  const { products, categories, customer, ready, notice } = useCommerce();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [exporting, setExporting] = useState<"csv" | "print" | null>(null);
  const [printRows, setPrintRows] = useState<Product[] | null>(null);
  const resource = useApiResource<CatalogPageResponse>(`/catalog/search?${queryString}`, apiMode && ready && customer?.status === "active", undefined, readCatalogPage);
  const result = apiMode ? resource.data || initialPage : previewCatalogPage(products, categories, new URLSearchParams(queryString), customer);
  const rows = printRows || result?.products || [];
  const busy = pending || resource.loading;

  useEffect(() => {
    if (!printRows) return;
    const finished = () => { setPrintRows(null); setExporting(null); };
    window.addEventListener("afterprint", finished, { once: true });
    const frame = requestAnimationFrame(() => window.print());
    return () => { cancelAnimationFrame(frame); window.removeEventListener("afterprint", finished); };
  }, [printRows]);

  const exportCatalog = async (format: "csv" | "print") => {
    if (exporting) return;
    setExporting(format);
    try {
      // Full catalog reads are explicit exports, never part of storefront bootstrap.
      const all = apiMode ? readCatalogResponse(await api<unknown>("/catalog")).products : products;
      if (format === "print") { setPrintRows(all); return; }
      downloadAdminCsv("bao-tin-catalog", [
        ["Mã hàng", "Sản phẩm", "Thương hiệu", "Giá bán lẻ", "Đơn vị"],
        ...all.map(product => [product.code, product.name, product.brand, product.price, product.unit]),
      ]);
    } catch (cause) {
      notice(cause instanceof Error ? cause.message : "Không thể xuất catalog. Vui lòng thử lại.");
    }
    setExporting(null);
  };
  const navigate = (page: number) => {
    const params = new URLSearchParams(queryString);
    params.set("page", String(page));
    startTransition(() => router.push(`/catalog?${params}`, { scroll: false }));
  };

  return <main className="bt-container bt-page">
    <Breadcrumb items={[{ label: "Catalog sản phẩm" }]} />
    <PageHeading title="Catalog sản phẩm Bảo Tín" description={`${result?.total || 0} mã hàng · Phụ kiện nội thất chính hãng`}>
      <div className="print-hidden flex flex-wrap gap-2">
        <Button variant="secondary" loading={exporting === "csv"} disabled={!!exporting} onClick={() => void exportCatalog("csv")}><Download size={16} />Tải CSV</Button>
        <Button loading={exporting === "print"} disabled={!!exporting} onClick={() => void exportCatalog("print")}><Printer size={16} />In / Tải PDF</Button>
      </div>
    </PageHeading>
    {(resource.error || initialError || busy) && <ResourceStatus error={resource.error || initialError} loading={busy} reload={async () => { if (resource.error) await resource.reload(); else router.refresh(); }} />}
    <div aria-busy={busy}>
      {categories.filter(category => rows.some(product => product.category === category.slug)).map(category => <section key={category.slug} className="mb-6">
        <h2 className="mb-3 text-lg font-bold text-primary">{category.name}</h2>
        <div className="overflow-auto rounded-lg border border-border"><table className="bt-table">
          <thead><tr><th>Mã hàng</th><th>Sản phẩm</th><th>Thương hiệu</th><th>Giá bán lẻ</th></tr></thead>
          <tbody>{rows.filter(product => product.category === category.slug).map(product => <tr key={product.id}>
            <td className="whitespace-nowrap">{product.code}</td><td><Link href={`/products/${product.slug}`} className="text-primary hover:text-blue-brand">{product.name}</Link></td><td>{product.brand}</td><td className="whitespace-nowrap">{money(product.price)} /{product.unit}</td>
          </tr>)}</tbody>
        </table></div>
      </section>)}
    </div>
    {result && result.totalPages > 1 && <nav aria-label="Phân trang catalog" className="print-hidden mt-6 flex items-center justify-center gap-2">
      <Button variant="secondary" disabled={busy || result.page <= 1} onClick={() => navigate(result.page - 1)}>Trước</Button><span className="text-sm">Trang {result.page} / {result.totalPages}</span><Button variant="secondary" disabled={busy || result.page >= result.totalPages} onClick={() => navigate(result.page + 1)}>Sau</Button>
    </nav>}
  </main>;
}

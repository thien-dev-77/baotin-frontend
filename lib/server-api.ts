import "server-only";
import { apiMode } from "@/lib/api-client";
import type { Product } from "@/lib/catalog";
import { findProduct } from "@/lib/catalog";

export async function serverProduct(slug: string): Promise<Product | undefined> {
  if (!apiMode) return findProduct(slug);
  const response = await fetch(`${process.env.BACKEND_URL || "http://127.0.0.1:4000"}/api/catalog/${encodeURIComponent(slug)}`, { cache: "no-store" });
  if (response.status === 404) return undefined;
  if (!response.ok) throw new Error("Không thể tải sản phẩm.");
  return response.json();
}

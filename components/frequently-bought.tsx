"use client";
import { useCommerce } from "./commerce-provider";
import { apiMode } from "@/lib/api-client";
import type { Product } from "@/lib/catalog";
import { useApiResource } from "@/lib/use-api-resource";
import { useCustomerOrders } from "./order-views";
import { ProductGrid } from "./product-card";
import { EmptyState } from "./ui";
import { ResourceStatus } from "./admin/admin-resource";

export function useFrequentlyBought() {
  const { customer, products } = useCommerce();
  const orders = useCustomerOrders();
  const resource = useApiResource<{ products: Product[] }>(
    "/account/frequently-bought",
    apiMode && customer?.status === "active",
  );
  const counts = new Map<string, number>();
  for (const order of orders.filter((order) =>
    ["Đã giao", "Đang giao"].includes(order.status),
  ))
    for (const line of order.items)
      counts.set(
        line.productId,
        (counts.get(line.productId) || 0) + line.quantity,
      );
  const preview = Array.from(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => products.find((product) => product.id === id))
    .filter((product): product is Product => !!product);
  return {
    ...resource,
    products: apiMode ? resource.data?.products || [] : preview,
  };
}
export function FrequentlyBought({ limit = 50 }: { limit?: number }) {
  const resource = useFrequentlyBought();
  return (
    <>
      {apiMode && <ResourceStatus {...resource} />}
      {!resource.loading && !resource.products.length ? (
        <EmptyState
          title="Chưa có sản phẩm thường mua"
          href="/search"
          action="Tìm sản phẩm"
        />
      ) : (
        <ProductGrid products={resource.products.slice(0, limit)} />
      )}
    </>
  );
}

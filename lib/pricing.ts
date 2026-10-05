import type { Customer, Product } from "./types";
import { apiMode } from "./api-client";

// Preview pricing only. Live purchase prices come from the API.
export function priceFor(product: Product, customer: Customer | null) {
  if (customer && product.customerPrice !== undefined) return product.customerPrice;
  if (apiMode) return product.price;
  return customer ? Math.max(1000, Math.round(product.price * 0.9 / 500) * 500) : product.price;
}

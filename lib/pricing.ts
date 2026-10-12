import type { Customer, Product } from "./types";
import { apiMode } from "./api-client";
import { productPrices, retailPrice } from "./product-pricing";

// Preview pricing only. Live purchase prices come from the API.
export function priceFor(product: Product, customer: Customer | null) {
  if (customer && product.customerPrice !== undefined) return product.customerPrice;
  if (apiMode) return retailPrice(product);
  if (customer && productPrices(product).b2bPrice !== undefined) return productPrices(product).b2bPrice!;
  return customer ? Math.max(1000, Math.round(product.price * 0.9 / 500) * 500) : retailPrice(product);
}

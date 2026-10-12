import type { Product } from "./types";

export const MAX_PRODUCT_PRICE = 999_999_999_999;
export const MAX_PRODUCT_DISCOUNT = 99.99;
const BASIS_POINTS = 10_000;
type PricingProduct = Pick<Product, "price" | "oldPrice" | "listPrice" | "b2cDiscount" | "b2bDiscount">;
export const hasRetailPricing = (product: PricingProduct) => Number.isSafeInteger(product.listPrice) && Number(product.listPrice) >= 0 && typeof product.b2cDiscount === "number" && Number.isFinite(product.b2cDiscount) && product.b2cDiscount >= 0 && product.b2cDiscount <= MAX_PRODUCT_DISCOUNT;

export function discountedPrice(listPrice: number, discount: number) {
  const numerator = BigInt(listPrice) * BigInt(BASIS_POINTS - Math.round(discount * 100));
  const amount = Number((numerator + BigInt(BASIS_POINTS / 2)) / BigInt(BASIS_POINTS));
  return listPrice > 0 ? Math.max(1, amount) : 0;
}
export function productPrices(product: PricingProduct) {
  const configured = hasRetailPricing(product);
  const listPrice = configured ? product.listPrice! : product.oldPrice ?? product.price;
  const b2cDiscount = configured ? product.b2cDiscount! : listPrice > 0 ? Math.max(0, Math.round((1 - product.price / listPrice) * 10000) / 100) : 0;
  const b2bDiscount = configured ? product.b2bDiscount : undefined;
  return { configured, listPrice, b2cDiscount, b2bDiscount, b2cPrice: configured ? discountedPrice(listPrice, b2cDiscount) : product.price, b2bPrice: b2bDiscount === undefined ? undefined : discountedPrice(listPrice, b2bDiscount) };
}
export function retailPrice(product: PricingProduct) { return productPrices(product).b2cPrice; }
export function effectiveDiscount(listPrice: number, price: number) {
  return listPrice > 0 && price < listPrice ? Math.round((1 - price / listPrice) * 10000) / 100 : 0;
}
export const formatDiscount = (value: number) => `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(value)}%`;

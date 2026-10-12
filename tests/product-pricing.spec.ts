import { expect, test } from "@playwright/test";
import { catalog } from "../lib/catalog";
import { discountedPrice, effectiveDiscount, formatDiscount, productPrices, retailPrice } from "../lib/product-pricing";
import { retailProducts } from "../lib/commerce-api";
import { priceFor } from "../lib/pricing";

const configured = { ...catalog[0], price: 80000, oldPrice: 100000, listPrice: 100000, b2cDiscount: 20, b2bDiscount: 35 };
const customer = { id: "QA", name: "QA", company: "QA", phone: "0901234567", email: "qa@example.test", role: "b2b" as const, status: "active" as const };

test("B2C and B2B discounts are independent of each other", () => {
  expect(productPrices(configured)).toEqual({ configured: true, listPrice: 100000, b2cDiscount: 20, b2bDiscount: 35, b2cPrice: 80000, b2bPrice: 65000 });
  expect(retailPrice({ ...configured, price: 1 })).toBe(80000);
  expect(discountedPrice(100000, 12.34)).toBe(87660);
  expect(discountedPrice(999999999999, 12.34)).toBe(876599999999);
  expect(discountedPrice(5, 10)).toBe(5);
  expect(discountedPrice(1, 99.99)).toBe(1);
  expect(discountedPrice(0, 99.99)).toBe(0);
  expect(formatDiscount(12.34)).toBe("12,34%");
});

test("Existing legacy prices remain exact until explicitly converted", () => {
  const legacy = { ...catalog[0], price: 80001, oldPrice: 100000 };
  expect(productPrices(legacy)).toEqual({ configured: false, listPrice: 100000, b2cDiscount: 20, b2bDiscount: undefined, b2cPrice: 80001, b2bPrice: undefined });
  expect(retailPrice(legacy)).toBe(80001);
  expect(productPrices({ price: 0 }).b2cPrice).toBe(0);
});

test("Actual customer prices override default B2B and are never discounted twice", () => {
  expect(priceFor({ ...configured, customerPrice: 90000 }, customer)).toBe(90000);
  expect(priceFor({ ...configured, customerPrice: 55000 }, customer)).toBe(55000);
  expect(priceFor(configured, null)).toBe(80000);
  expect(effectiveDiscount(100000, 90000)).toBe(10);
  expect(effectiveDiscount(100000, 55000)).toBe(45);
  expect(effectiveDiscount(100000, 110000)).toBe(0);
});

test("Logout removes private B2B data without losing public retail pricing", () => {
  const personalized = { ...configured, customerPrice: 55000 };
  const [publicProduct] = retailProducts([personalized]);
  expect(publicProduct).not.toHaveProperty("b2bDiscount");
  expect(publicProduct).not.toHaveProperty("customerPrice");
  expect(productPrices(publicProduct).b2cPrice).toBe(80000);
  expect(productPrices(publicProduct).b2bPrice).toBeUndefined();
  expect(personalized.b2bDiscount).toBe(35);
  expect(personalized.customerPrice).toBe(55000);
});

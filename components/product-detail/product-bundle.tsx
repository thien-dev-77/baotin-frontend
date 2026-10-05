"use client";

import { useCommerce } from "@/components/commerce-provider";
import { Button } from "@/components/ui";
import { money, priceFor, type Product } from "@/lib/catalog";
import { ShoppingCart } from "lucide-react";
import { useState } from "react";

export function ProductBundle({ products }: { products: Product[] }) {
  const { customer, add, products: catalog } = useCommerce();
  const [selected, setSelected] = useState<string[]>(() => products.map((product) => product.id));
  products = products.map((product) => catalog.find((item) => item.id === product.id)).filter((item): item is Product => Boolean(item));

  const toggleSelection = (id: string) => {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };
  const addSelected = () => products.filter((product) => selected.includes(product.id)).forEach((product) => add(product));

  return (
    <section className="mt-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-primary">Sản phẩm thường được mua cùng</h2>
        <Button variant="secondary" disabled={!products.some((product) => selected.includes(product.id))} onClick={addSelected}>
          <ShoppingCart size={16} />Thêm tất cả vào giỏ hàng
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((product) => (
          <label key={product.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
            <input
              type="checkbox"
              className="accent-blue-brand"
              checked={selected.includes(product.id)}
              onChange={() => toggleSelection(product.id)}
            />
            <img alt="" src={product.image} className="h-14 w-14 shrink-0 rounded object-contain" />
            <span className="min-w-0">
              <span className="line-clamp-2 text-xs font-semibold text-primary">{product.name}</span>
              <span className="mt-1 block text-xs text-text-muted">{product.code}</span>
              <span className="mt-1 block text-sm font-bold text-danger">{money(priceFor(product, customer))}</span>
            </span>
          </label>
        ))}
      </div>
    </section>
  );
}

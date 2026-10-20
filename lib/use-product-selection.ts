"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCommerce } from "@/components/commerce-provider";
import { apiMode } from "./api-client";
import type { Product } from "./types";

export function useProductSelection(ids: string[], requiredIds: string[] = []) {
  const { loadProducts, ready, sessionUser } = useCommerce();
  const personalized = sessionUser?.customer?.status === "active";
  const key = JSON.stringify([Array.from(new Set(ids)).sort(), Array.from(new Set(requiredIds)).sort(), sessionUser?.id, sessionUser?.role, personalized]);
  const [state, setState] = useState<{ key: string; loading: boolean; error: string; products?: Product[] }>({ key: "", loading: false, error: "" });
  const sequence = useRef(0);
  const reload = useCallback(async () => {
    const version = ++sequence.current;
    if (!apiMode || !ready) return;
    const [selected, required] = JSON.parse(key) as [string[], string[]];
    setState({ key, loading: true, error: "" });
    try {
      const products = selected.length ? await loadProducts(selected) : [];
      for (const id of required) {
        const product = products.find(product => product.id === id);
        if (!product) throw new Error("Sản phẩm không còn bán hoặc chưa tải được dữ liệu mới nhất.");
        if (personalized && (typeof product.customerPrice !== "number" || !Number.isFinite(product.customerPrice))) throw new Error("Chưa tải được giá B2B của sản phẩm. Vui lòng thử lại.");
      }
      if (sequence.current === version) setState({ key, loading: false, error: "", products });
    } catch (error) {
      if (sequence.current === version) setState({ key, loading: false, error: error instanceof Error ? error.message : "Không thể tải sản phẩm." });
    }
  }, [key, loadProducts, ready, personalized]);
  useEffect(() => {
    const counter = sequence;
    void reload();
    return () => { counter.current++; };
  }, [reload]);
  return { loading: apiMode && (!ready || state.key !== key || state.loading), error: state.key === key ? state.error : "", products: state.key === key ? state.products : undefined, reload };
}

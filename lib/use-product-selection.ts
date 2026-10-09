"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCommerce } from "@/components/commerce-provider";
import { apiMode } from "./api-client";

export function useProductSelection(ids: string[]) {
  const { loadProducts, ready, sessionUser } = useCommerce();
  const key = JSON.stringify([Array.from(new Set(ids)).sort(), sessionUser?.id]);
  const [state, setState] = useState({ key: "", loading: false, error: "" });
  const sequence = useRef(0);
  const reload = useCallback(async () => {
    const version = ++sequence.current;
    if (!apiMode || !ready) return;
    const [selected] = JSON.parse(key) as [string[], string | undefined];
    setState({ key, loading: true, error: "" });
    try {
      if (selected.length) await loadProducts(selected);
      if (sequence.current === version) setState({ key, loading: false, error: "" });
    } catch (error) {
      if (sequence.current === version) setState({ key, loading: false, error: error instanceof Error ? error.message : "Không thể tải sản phẩm." });
    }
  }, [key, loadProducts, ready]);
  useEffect(() => {
    const counter = sequence;
    void reload();
    return () => { counter.current++; };
  }, [reload]);
  return { loading: apiMode && (!ready || state.key !== key || state.loading), error: state.key === key ? state.error : "", reload };
}

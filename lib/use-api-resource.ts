"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCommerce } from "@/components/commerce-provider";
import { api, apiMode } from "./api-client";

export function useApiResource<T>(
  path: string,
  enabled = apiMode,
  refreshToken?: number,
  parser?: (value: unknown) => T,
) {
  const { sessionUser } = useCommerce();
  const key = JSON.stringify([
    path,
    sessionUser?.id,
    sessionUser?.role,
    sessionUser?.branches,
    enabled,
  ]);
  const [state, setState] = useState<{
    key: string;
    data?: T;
    error?: string;
    loading: boolean;
  }>({ key, loading: enabled });
  const sequence = useRef(0);
  const reload = useCallback(async () => {
    const version = ++sequence.current;
    if (!enabled) return;
    setState((previous) => ({
      ...(previous.key === key ? previous : { key }),
      loading: true,
    }));
    try {
      const response = await api<unknown>(path);
      const data = parser ? parser(response) : response as T;
      if (sequence.current === version) setState({ key, data, loading: false });
    } catch (cause) {
      if (sequence.current === version)
        setState((previous) => ({
          ...(previous.key === key ? previous : { key }),
          loading: false,
          error:
            cause instanceof Error ? cause.message : "Không thể tải dữ liệu.",
        }));
    }
  }, [enabled, key, path, parser]);
  useEffect(() => {
    const counter = sequence;
    void reload();
    return () => {
      counter.current++;
    };
  }, [reload, refreshToken]);
  return {
    data: enabled && state.key === key ? state.data : undefined,
    error: state.key === key ? state.error : undefined,
    loading: enabled && (state.key !== key || state.loading),
    reload,
  };
}

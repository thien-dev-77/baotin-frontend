"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { api, apiMode } from "@/lib/api-client";
import { Button, LoadingSpinner } from "../ui";
import { useAdmin } from "./admin-provider";
import { useCommerce } from "../commerce-provider";

export function useAdminResource<T>(path: string, enabled = true, parser?: (value: unknown) => T, dataScope = path) {
  const { resourceRevision, setResourceLoading, readCache } = useAdmin();
  const { sessionUser } = useCommerce();
  const scope = JSON.stringify([sessionUser?.id, sessionUser?.role, sessionUser?.branches]);
  const key = `${scope}:${path}`;
  const identity = `${scope}:${dataScope}`;
  const resourceId = useId();
  const [result, setResult] = useState<{
    key: string;
    identity: string;
    data?: T;
    error?: string;
    loading: boolean;
  }>({ key, identity, data: readCache?.peek<T>(path), loading: enabled && readCache?.peek(path) === undefined });
  const sequence = useRef(0);
  useEffect(() => {
    setResourceLoading?.(resourceId, enabled && (result.key !== key || result.loading));
    return () => { setResourceLoading?.(resourceId, false); };
  }, [key, enabled, resourceId, result.key, result.loading, setResourceLoading]);
  const load = useCallback(async (force = false) => {
    const version = ++sequence.current;
    if (!enabled) return;
    setResult(previous => ({ key, identity, data: readCache?.peek<T>(path) ?? (previous.identity === identity ? previous.data : undefined), error: previous.key === key ? previous.error : undefined, loading: true }));
    try {
      if (!apiMode) throw new Error("Chức năng này cần kết nối backend.");
      const fetcher = async () => {
        const value = await api<unknown>(path);
        return parser ? parser(value) : value as T;
      };
      const data = readCache ? await readCache.load(path, fetcher, force) : await fetcher();
      if (version === sequence.current) setResult({ key, identity, data, loading: false });
    } catch (error) {
      if (version === sequence.current)
        setResult(previous => ({
          ...(previous.identity === identity ? previous : { key, identity }),
          loading: false,
          error:
            error instanceof Error ? error.message : "Không thể tải dữ liệu.",
        }));
    }
  }, [path, key, identity, enabled, readCache, parser]);
  const reload = useCallback(async () => {
    readCache?.invalidate(candidate => candidate === path);
    await load(true);
  }, [readCache, path, load]);
  useEffect(() => {
    const counter = sequence;
    void load();
    const stop = enabled ? readCache?.watch(path, () => load(true)) : undefined;
    return () => {
      stop?.();
      counter.current++;
    };
  }, [load, enabled, readCache, path]);
  useEffect(() => { if (!readCache && resourceRevision) void reload(); }, [readCache, resourceRevision, reload]);
  return {
    data: enabled ? (readCache?.peek<T>(path) ?? (result.identity === identity ? result.data : undefined)) : undefined,
    error: result.key === key ? result.error : undefined,
    loading: enabled && (result.key !== key || result.loading),
    reload,
  };
}
export function ResourceStatus({
  error,
  reload,
  loading,
  data,
}: {
  error?: string;
  reload: () => Promise<void>;
  loading?: boolean;
  data?: unknown;
}) {
  if (!loading && !error && data === undefined) return null;
  if (data !== undefined && !error) return loading ? <span role="status" className="sr-only">Đang cập nhật dữ liệu...</span> : null;
  return (
    <div
      role={error ? "alert" : "status"}
      className={`flex flex-wrap items-center gap-3 text-sm ${data !== undefined ? "mb-4 rounded border border-amber-200 bg-amber-50 p-3 text-amber-900" : "py-10 text-text-secondary"}`}
    >
      {!error && <LoadingSpinner />}{error ? `${data !== undefined ? "Chưa thể cập nhật dữ liệu. " : ""}${error}` : "Đang tải..."}
      {error && (
        <Button variant="secondary" loading={loading} onClick={() => void reload()}>
          <RefreshCw size={16} />
          Thử lại
        </Button>
      )}
    </div>
  );
}

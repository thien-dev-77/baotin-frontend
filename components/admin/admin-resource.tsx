"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { api, apiMode } from "@/lib/api-client";
import { Button, LoadingSpinner } from "../ui";
import { useAdmin } from "./admin-provider";

export function useAdminResource<T>(path: string) {
  const { resourceRevision } = useAdmin();
  const [result, setResult] = useState<{
    path: string;
    data?: T;
    error?: string;
    loading: boolean;
  }>({ path, loading: true });
  const sequence = useRef(0);
  const reload = useCallback(async () => {
    const version = ++sequence.current;
    setResult(previous => ({ ...(previous.path === path ? previous : { path }), loading: true }));
    try {
      if (!apiMode) throw new Error("Chức năng này cần kết nối backend.");
      const data = await api<T>(path);
      if (version === sequence.current) setResult({ path, data, loading: false });
    } catch (error) {
      if (version === sequence.current)
        setResult(previous => ({
          ...(previous.path === path ? previous : { path }),
          loading: false,
          error:
            error instanceof Error ? error.message : "Không thể tải dữ liệu.",
        }));
    }
  }, [path]);
  useEffect(() => {
    const counter = sequence;
    void reload();
    return () => {
      counter.current++;
    };
  }, [reload, resourceRevision]);
  return {
    data: result.path === path ? result.data : undefined,
    error: result.path === path ? result.error : undefined,
    loading: result.path !== path || result.loading,
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

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { api, apiMode } from "@/lib/api-client";
import { Button } from "../ui";
import { useAdmin } from "./admin-provider";

export function useAdminResource<T>(path: string) {
  const { resourceRevision } = useAdmin();
  const [result, setResult] = useState<{
    path: string;
    data?: T;
    error?: string;
  }>({ path });
  const sequence = useRef(0);
  const reload = useCallback(async () => {
    const version = ++sequence.current;
    setResult({ path });
    try {
      if (!apiMode) throw new Error("Chức năng này cần kết nối backend.");
      const data = await api<T>(path);
      if (version === sequence.current) setResult({ path, data });
    } catch (error) {
      if (version === sequence.current)
        setResult({
          path,
          error:
            error instanceof Error ? error.message : "Không thể tải dữ liệu.",
        });
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
    reload,
  };
}
export function ResourceStatus({
  error,
  reload,
}: {
  error?: string;
  reload: () => Promise<void>;
}) {
  return (
    <div
      role={error ? "alert" : "status"}
      className="flex flex-wrap items-center gap-3 py-10 text-sm text-text-secondary"
    >
      {error || "Đang tải..."}
      {error && (
        <Button variant="secondary" onClick={() => void reload()}>
          <RefreshCw size={16} />
          Thử lại
        </Button>
      )}
    </div>
  );
}

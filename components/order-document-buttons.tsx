"use client";
import { useRef, useState } from "react";
import { Download } from "lucide-react";
import { useCommerce } from "./commerce-provider";
import { Button } from "./ui";
import { apiMode, apiPdf } from "@/lib/api-client";

export function OrderDocumentButtons({
  id,
  admin = false,
}: {
  id: string;
  admin?: boolean;
}) {
  const { notice } = useCommerce();
  const [busy, setBusy] = useState("");
  const lock = useRef(false);
  if (!apiMode) return null;
  const download = async (kind: string) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(kind);
    try {
      const bytes = await apiPdf(
        `/${admin ? "admin/" : ""}orders/${encodeURIComponent(id)}/document?kind=${kind}`,
      );
      const url = URL.createObjectURL(bytes);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `bao-tin-${id}-${kind}.pdf`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) {
      notice(
        cause instanceof Error ? cause.message : "Không thể tải tài liệu.",
      );
    } finally {
      lock.current = false;
      setBusy("");
    }
  };
  return (
    <div className="my-4 flex flex-wrap gap-2">
      {[
        ["quote", "Tải báo giá"],
        ["order", "Tải đơn hàng"],
      ].map(([kind, label]) => (
        <Button
          key={kind}
          variant="secondary"
          loading={busy === kind}
          disabled={!!busy}
          onClick={() => void download(kind)}
        >
          <Download size={16} />
          {label}
        </Button>
      ))}
    </div>
  );
}

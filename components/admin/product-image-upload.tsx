"use client";
import { useState } from "react";
import { Upload } from "lucide-react";
import { api } from "@/lib/api-client";
import { useAdmin } from "./admin-provider";
import { useCommerce } from "../commerce-provider";

export function ProductImageUpload({ productId }: { productId: string }) {
  const { reset: reload } = useAdmin();
  const { reloadCatalog } = useCommerce();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return <div className="mb-5"><label className={`bt-button-secondary cursor-pointer ${busy ? "pointer-events-none opacity-60" : ""}`}><Upload size={16} />{busy ? "Đang tải ảnh..." : "Thay ảnh sản phẩm"}<input type="file" className="sr-only" aria-label="Ảnh sản phẩm" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={async (event) => {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError("Ảnh tối đa 5 MB."); return; }
    setBusy(true); setError("");
    try { const data = new FormData(); data.append("image", file); await api(`/media/products/${encodeURIComponent(productId)}/image`, { method: "POST", body: data }); await reload(); await reloadCatalog(); }
    catch (error) { setError(error instanceof Error ? error.message : "Không thể tải ảnh."); }
    finally { setBusy(false); }
  }} /></label>{error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}</div>;
}

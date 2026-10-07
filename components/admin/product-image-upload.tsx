"use client";

import Image from "next/image";
import { ArrowLeft, ArrowRight, ImagePlus, Star, Trash2 } from "lucide-react";
import { useState } from "react";
import { api, apiMode } from "@/lib/api-client";
import { LoadingSpinner } from "@/components/ui";

type Props = { images: string[]; onChange: (images: string[]) => void; busy: boolean; uploading: boolean; onBusyChange: (busy: boolean) => void };

export function ProductImageUpload({ images, onChange, busy, uploading, onBusyChange }: Props) {
  const [error, setError] = useState("");
  const move = (index: number, target: number) => {
    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };
  const upload = async (files: File[]) => {
    if (!files.length || busy) return;
    setError("");
    if (images.length + files.length > 10) { setError("Mỗi sản phẩm tối đa 10 ảnh."); return; }
    if (files.some(file => file.size > 5 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(file.type))) {
      setError("Chọn ảnh JPEG, PNG hoặc WebP, tối đa 5 MB mỗi ảnh."); return;
    }
    onBusyChange(true);
    try {
      const data = new FormData();
      files.forEach(file => data.append("images", file));
      const result = await api<{ urls: string[] }>("/media/product-images", { method: "POST", body: data });
      onChange([...images, ...result.urls]);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể tải ảnh."); }
    finally { onBusyChange(false); }
  };
  return <>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-base font-semibold text-primary">Hình ảnh <span className="ml-1 text-sm font-normal text-text-muted">{images.length}/10</span></h2>
      <label aria-busy={uploading || undefined} className={`bt-button-secondary cursor-pointer ${busy || images.length >= 10 || !apiMode ? "pointer-events-none opacity-50" : ""}`}>
        {uploading ? <LoadingSpinner size={17} /> : <ImagePlus size={17} />}Thêm ảnh
        <input type="file" multiple className="sr-only" aria-label="Thêm ảnh sản phẩm" accept="image/jpeg,image/png,image/webp" disabled={busy || images.length >= 10 || !apiMode} onChange={event => { const files = Array.from(event.target.files || []); event.target.value = ""; void upload(files); }} />
      </label>
    </div>
    {error && <p role="alert" className="mb-3 text-sm text-danger">{error}</p>}
    {images.length ? <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
      {images.map((src, index) => <li key={src} className="overflow-hidden rounded-md border border-border bg-white">
        <div className="relative aspect-square bg-section"><Image src={src} alt={`Ảnh sản phẩm ${index + 1}`} fill sizes="(min-width: 1280px) 200px, (min-width: 640px) 30vw, 45vw" className="object-contain p-2" quality={85} />
          {index === 0 && <span className="absolute left-2 top-2 rounded bg-blue-brand px-2 py-1 text-xs font-medium text-white">Ảnh đại diện</span>}
        </div>
        <div className="flex items-center justify-between border-t border-border px-1 py-1.5">
          <button type="button" className="bt-icon-button" aria-label={`Chọn ảnh ${index + 1} làm đại diện`} title="Đặt làm ảnh đại diện" disabled={busy || index === 0} onClick={() => onChange([src, ...images.filter(image => image !== src)])}><Star size={16} fill={index === 0 ? "currentColor" : "none"} /></button>
          <button type="button" className="bt-icon-button" aria-label={`Di chuyển ảnh ${index + 1} sang trái`} title="Di chuyển sang trái" disabled={busy || index === 0} onClick={() => move(index, index - 1)}><ArrowLeft size={15} /></button>
          <button type="button" className="bt-icon-button" aria-label={`Di chuyển ảnh ${index + 1} sang phải`} title="Di chuyển sang phải" disabled={busy || index === images.length - 1} onClick={() => move(index, index + 1)}><ArrowRight size={15} /></button>
          <button type="button" className="bt-icon-button text-danger" aria-label={`Xóa ảnh ${index + 1}`} title="Xóa khỏi bộ ảnh" disabled={busy} onClick={() => onChange(images.filter(image => image !== src))}><Trash2 size={16} /></button>
        </div>
      </li>)}
    </ol> : <div className="flex min-h-36 items-center justify-center gap-2 border border-dashed border-border bg-section text-sm text-text-muted"><ImagePlus size={20} />Chưa có ảnh</div>}
  </>;
}

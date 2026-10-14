"use client";

import { Modal } from "@/components/ui";
import type { Product } from "@/lib/catalog";
import { ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import { useState } from "react";
import Image from "next/image";

export function ProductGallery({ product }: { product: Product }) {
  const [photo, setPhoto] = useState(0);
  const [zoom, setZoom] = useState(false);
  const movePhoto = (direction: number) => setPhoto((current) => (current + direction + product.gallery.length) % product.gallery.length);

  return (
    <>
      <section aria-label="Hình ảnh sản phẩm" className="grid gap-2 sm:grid-cols-[80px_minmax(0,1fr)]">
        <div className="order-2 flex gap-2 overflow-x-auto sm:order-1 sm:max-h-[500px] sm:flex-col sm:overflow-y-auto sm:overflow-x-visible scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent hover:scrollbar-thumb-text-muted">
          {product.gallery.map((image, index) => (
            <button
              key={image}
              aria-label={`Xem ảnh ${index + 1}`}
              aria-pressed={photo === index}
              onClick={() => setPhoto(index)}
              className={`h-20 w-20 shrink-0 overflow-hidden rounded-lg border bg-section p-1.5 transition-all ${photo === index ? "border-brand ring-2 ring-brand/30 shadow-sm" : "border-border hover:border-brand/50"}`}
            >
              <Image alt="" src={image} data-image-src={image} width={72} height={72} sizes="72px" quality={85} className="h-full w-full object-contain" />
            </button>
          ))}
        </div>
        <div className="relative order-1 aspect-square overflow-hidden rounded-lg bg-section sm:order-2">
          <Image
            src={product.gallery[photo]}
            data-image-src={product.gallery[photo]}
            alt={product.name}
            fill
            sizes="(min-width: 1280px) 400px, (min-width: 1024px) 35vw, (min-width: 640px) 60vw, 100vw"
            quality={90}
            priority
            fetchPriority="high"
            className="h-full w-full object-contain p-4"
          />
          {product.featured && <span className="absolute left-3 top-3 rounded bg-section px-2 py-1 text-xs font-semibold text-primary">Nổi bật</span>}
          <button
            className="absolute bottom-3 right-3 bt-icon-button rounded-full bg-white shadow-card"
            aria-label="Phóng to ảnh"
            title="Phóng to ảnh"
            onClick={() => setZoom(true)}
          >
            <ZoomIn size={19} />
          </button>
          {product.gallery.length > 1 && (
            <>
              <button aria-label="Ảnh trước" className="absolute left-2 top-1/2 bt-icon-button -translate-y-1/2 rounded-full bg-white shadow-card" onClick={() => movePhoto(-1)}>
                <ChevronLeft size={18} />
              </button>
              <button aria-label="Ảnh tiếp theo" className="absolute right-2 top-1/2 bt-icon-button -translate-y-1/2 rounded-full bg-white shadow-card" onClick={() => movePhoto(1)}>
                <ChevronRight size={18} />
              </button>
            </>
          )}
        </div>
      </section>
      <Modal open={zoom} onClose={() => setZoom(false)} title={product.name}>
        <Image src={product.gallery[photo]} data-image-src={product.gallery[photo]} alt={product.name} width={1000} height={1000} sizes="(min-width: 640px) 640px, 100vw" quality={90} loading="eager" className="max-h-[65vh] w-full object-contain" />
      </Modal>
    </>
  );
}

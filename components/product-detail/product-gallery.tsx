"use client";

import { Modal } from "@/components/ui";
import type { Product } from "@/lib/catalog";
import { ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import Image from "next/image";

export function ProductGallery({ product }: { product: Product }) {
  const [photo, setPhoto] = useState(0);
  const [zoom, setZoom] = useState(false);
  const thumbnailRef = useRef<HTMLDivElement>(null);
  
  const movePhoto = (direction: number) => setPhoto((current) => (current + direction + product.gallery.length) % product.gallery.length);

  // Auto scroll thumbnail into view when photo changes
  useEffect(() => {
    if (thumbnailRef.current) {
      const thumbnail = thumbnailRef.current.children[photo] as HTMLElement;
      if (thumbnail) {
        thumbnail.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }
    }
  }, [photo]);

  return (
    <>
      <section aria-label="Hình ảnh sản phẩm" className="flex flex-col gap-3">
        {/* Main image */}
        <div className="relative aspect-square overflow-hidden rounded-xl bg-section shadow-sm">
          <Image
            src={product.gallery[photo]}
            data-image-src={product.gallery[photo]}
            alt={product.name}
            fill
            sizes="(min-width: 1280px) 500px, (min-width: 1024px) 40vw, (min-width: 640px) 60vw, 100vw"
            quality={90}
            priority
            fetchPriority="high"
            className="h-full w-full object-contain p-6 transition-opacity duration-300"
          />
          {product.featured && (
            <span className="absolute left-3 top-3 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-primary shadow-sm">
              Nổi bật
            </span>
          )}
          <button
            className="absolute bottom-4 right-4 bt-icon-button rounded-full bg-white shadow-md hover:shadow-lg transition-shadow"
            aria-label="Phóng to ảnh"
            title="Phóng to ảnh"
            onClick={() => setZoom(true)}
          >
            <ZoomIn size={20} />
          </button>
          {product.gallery.length > 1 && (
            <>
              <button
                aria-label="Ảnh trước"
                className="absolute left-3 top-1/2 bt-icon-button -translate-y-1/2 rounded-full bg-white/95 shadow-md hover:shadow-lg transition-all hover:scale-110"
                onClick={() => movePhoto(-1)}
              >
                <ChevronLeft size={20} />
              </button>
              <button
                aria-label="Ảnh tiếp theo"
                className="absolute right-3 top-1/2 bt-icon-button -translate-y-1/2 rounded-full bg-white/95 shadow-md hover:shadow-lg transition-all hover:scale-110"
                onClick={() => movePhoto(1)}
              >
                <ChevronRight size={20} />
              </button>
            </>
          )}
        </div>

        {/* Thumbnails - horizontal scroll */}
        {product.gallery.length > 1 && (
          <div className="relative">
            <div
              ref={thumbnailRef}
              className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent hover:scrollbar-thumb-text-muted"
            >
              {product.gallery.map((image, index) => (
                <button
                  key={image}
                  aria-label={`Xem ảnh ${index + 1}`}
                  aria-pressed={photo === index}
                  onClick={() => setPhoto(index)}
                  className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border-2 bg-section transition-all ${
                    photo === index
                      ? "border-brand shadow-md scale-105"
                      : "border-border hover:border-brand/50 hover:shadow-sm"
                  }`}
                >
                  <Image
                    alt=""
                    src={image}
                    data-image-src={image}
                    fill
                    sizes="80px"
                    quality={85}
                    className="object-contain p-1.5"
                  />
                  {photo === index && (
                    <div className="absolute inset-0 bg-brand/10" />
                  )}
                </button>
              ))}
            </div>
            
            {/* Scroll indicators */}
            {product.gallery.length > 5 && (
              <>
                <div className="absolute left-0 top-0 bottom-2 w-8 bg-gradient-to-r from-white to-transparent pointer-events-none" />
                <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none" />
              </>
            )}
          </div>
        )}
        
        {/* Image counter */}
        {product.gallery.length > 1 && (
          <div className="text-center text-sm text-text-muted">
            {photo + 1} / {product.gallery.length}
          </div>
        )}
      </section>
      
      <Modal open={zoom} onClose={() => setZoom(false)} title={product.name}>
        <Image
          src={product.gallery[photo]}
          data-image-src={product.gallery[photo]}
          alt={product.name}
          width={1000}
          height={1000}
          sizes="(min-width: 640px) 640px, 100vw"
          quality={90}
          loading="eager"
          className="max-h-[65vh] w-full object-contain"
        />
      </Modal>
    </>
  );
}

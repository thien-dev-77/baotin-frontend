"use client";

import { Modal } from "@/components/ui";
import type { Product } from "@/lib/catalog";
import { ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import Image from "next/image";
// @ts-ignore - Type definitions issue with @splidejs/react-splide package.json exports
import { Splide, SplideSlide, SplideTrack } from "@splidejs/react-splide";
import "@splidejs/react-splide/css/core";

export function ProductGallery({ product }: { product: Product }) {
  const [photo, setPhoto] = useState(0);
  const [zoom, setZoom] = useState(false);
  const mainSplideRef = useRef<any>(null);
  const thumbsSplideRef = useRef<any>(null);

  useEffect(() => {
    if (mainSplideRef.current && thumbsSplideRef.current) {
      const mainSplide = mainSplideRef.current.splide;
      const thumbsSplide = thumbsSplideRef.current.splide;

      if (mainSplide && thumbsSplide) {
        mainSplide.sync(thumbsSplide);
      }
    }
  }, []);

  const handleSlideChange = (splide: any) => {
    setPhoto(splide.index);
  };

  return (
    <>
      <section aria-label="Hình ảnh sản phẩm" className="flex flex-col gap-3">
        {/* Main image slider */}
        <Splide
          ref={mainSplideRef}
          hasTrack={false}
          options={{
            type: "fade",
            rewind: true,
            pagination: false,
            arrows: product.gallery.length > 1,
            drag: product.gallery.length > 1,
            keyboard: "global",
          }}
          onMoved={handleSlideChange}
          aria-label="Ảnh sản phẩm"
        >
          <div className="relative">
            <SplideTrack>
              {product.gallery.map((image, index) => (
                <SplideSlide key={image}>
                  <div className="relative aspect-square overflow-hidden rounded-xl bg-section shadow-sm">
                    <Image
                      src={image}
                      data-image-src={image}
                      alt={`${product.name} - Ảnh ${index + 1}`}
                      fill
                      sizes="(min-width: 1280px) 500px, (min-width: 1024px) 40vw, (min-width: 640px) 60vw, 100vw"
                      quality={90}
                      priority={index === 0}
                      className="h-full w-full object-contain p-6"
                    />
                  </div>
                </SplideSlide>
              ))}
            </SplideTrack>

            {product.featured && (
              <span className="absolute left-3 top-3 z-10 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white shadow-sm">
                Nổi bật
              </span>
            )}

            <button
              className="absolute bottom-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md transition-shadow hover:shadow-lg"
              aria-label="Phóng to ảnh"
              title="Phóng to ảnh"
              onClick={() => setZoom(true)}
            >
              <ZoomIn size={20} />
            </button>

            {product.gallery.length > 1 && (
              <div className="splide__arrows">
                <button className="splide__arrow splide__arrow--prev !left-3 !h-10 !w-10 !rounded-full !bg-white/95 !shadow-md transition-all hover:!scale-110 hover:!shadow-lg">
                  <ChevronLeft size={20} className="text-primary" />
                </button>
                <button className="splide__arrow splide__arrow--next !right-3 !h-10 !w-10 !rounded-full !bg-white/95 !shadow-md transition-all hover:!scale-110 hover:!shadow-lg">
                  <ChevronRight size={20} className="text-primary" />
                </button>
              </div>
            )}
          </div>
        </Splide>

        {/* Thumbnails slider */}
        {product.gallery.length > 1 && (
          <>
            <Splide
              ref={thumbsSplideRef}
              options={{
                type: "slide",
                rewind: true,
                gap: "0.5rem",
                pagination: false,
                arrows: false,
                fixedWidth: 80,
                fixedHeight: 80,
                isNavigation: true,
                focus: "center",
                updateOnMove: true,
                trimSpace: false,
                breakpoints: {
                  640: {
                    fixedWidth: 70,
                    fixedHeight: 70,
                  },
                },
              }}
              aria-label="Danh sách ảnh sản phẩm"
            >
              {product.gallery.map((image, index) => (
                <SplideSlide key={image}>
                  <button
                    className={`relative h-20 w-20 overflow-hidden rounded-lg border-2 bg-section transition-all ${
                      photo === index
                        ? "border-brand shadow-md"
                        : "border-border hover:border-brand/50 hover:shadow-sm"
                    }`}
                    onClick={() => {
                      if (mainSplideRef.current?.splide) {
                        mainSplideRef.current.splide.go(index);
                      }
                    }}
                  >
                    <Image
                      alt={`Ảnh ${index + 1}`}
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
                </SplideSlide>
              ))}
            </Splide>

            {/* Image counter */}
            <div className="text-center text-sm text-text-muted">
              {photo + 1} / {product.gallery.length}
            </div>
          </>
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

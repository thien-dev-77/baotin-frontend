"use client";

import { Modal } from "@/components/ui";
import type { Product } from "@/lib/catalog";
import { ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { ProductImage as Image } from "@/components/product-image";
import { DEFAULT_PRODUCT_IMAGE } from "@/lib/product-media";
import { Splide, SplideSlide, SplideTrack } from "@splidejs/react-splide";
import type { Splide as SplideCore } from "@splidejs/splide";
import "@splidejs/react-splide/css/core";

export function ProductGallery({ product }: { product: Product }) {
  const images = Array.from(new Set((product.gallery?.length ? product.gallery : [product.image]).filter(Boolean)));
  return <Gallery key={product.id} product={product} images={images.length ? images : [DEFAULT_PRODUCT_IMAGE]} />;
}

function Gallery({ product, images }: { product: Product; images: string[] }) {
  const [photo, setPhoto] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [imageRatios, setImageRatios] = useState<Record<string, number>>({});
  const activeRatio = imageRatios[images[photo]] ?? 1;
  const mainSplideRef = useRef<InstanceType<typeof Splide>>(null);
  const thumbsSplideRef = useRef<InstanceType<typeof Splide>>(null);

  useEffect(() => {
    if (mainSplideRef.current && thumbsSplideRef.current) {
      const mainSplide = mainSplideRef.current.splide;
      const thumbsSplide = thumbsSplideRef.current.splide;

      if (mainSplide && thumbsSplide) {
        mainSplide.sync(thumbsSplide);
      }
    }
  }, []);

  const handleSlideChange = (splide: SplideCore) => {
    setPhoto(splide.index);
  };

  return (
    <>
      <section aria-label="Hình ảnh sản phẩm" className="bt-product-gallery flex min-w-0 flex-col gap-3">
        {/* Main image slider */}
        <Splide
          ref={mainSplideRef}
          className="bt-product-gallery-main min-w-0 w-full"
          hasTrack={false}
          options={{
            type: "fade",
            rewind: true,
            pagination: false,
            arrows: images.length > 1,
            drag: images.length > 1,
            keyboard: "focused",
            i18n: { prev: "Ảnh trước", next: "Ảnh tiếp" },
          }}
          onMoved={handleSlideChange}
          aria-label="Ảnh sản phẩm"
        >
          <div className="relative">
            <SplideTrack>
              {images.map((image, index) => (
                <SplideSlide key={image}>
                  <div
                    className="bt-product-gallery-frame relative w-full overflow-hidden rounded-xl bg-section shadow-sm"
                    style={{ aspectRatio: activeRatio }}
                  >
                    <Image
                      src={image}
                      alt={`${product.name} - Ảnh ${index + 1}`}
                      fill
                      sizes="(min-width: 1280px) 500px, (min-width: 1024px) 40vw, (min-width: 640px) 60vw, 100vw"
                      quality={90}
                      priority={index === 0}
                      className="h-full w-full object-contain"
                      onLoad={({ currentTarget }) => {
                        if (!currentTarget.naturalWidth || !currentTarget.naturalHeight) return;
                        const ratio = currentTarget.naturalWidth / currentTarget.naturalHeight;
                        setImageRatios(current => current[image] === ratio ? current : { ...current, [image]: ratio });
                      }}
                    />
                  </div>
                </SplideSlide>
              ))}
            </SplideTrack>

            {product.featured && (
              <span className="absolute left-3 top-3 z-10 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-primary shadow-sm">
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

            {images.length > 1 && (
              <div className="splide__arrows">
                <button type="button" className="splide__arrow splide__arrow--prev">
                  <ChevronLeft size={20} className="text-primary" />
                </button>
                <button type="button" className="splide__arrow splide__arrow--next">
                  <ChevronRight size={20} className="text-primary" />
                </button>
              </div>
            )}
          </div>
        </Splide>

        {/* Thumbnails slider */}
        {images.length > 1 && (
          <>
            <Splide
              ref={thumbsSplideRef}
              className="bt-product-gallery-thumbs min-w-0 w-full"
              options={{
                type: "slide",
                rewind: true,
                gap: "0.5rem",
                pagination: false,
                arrows: false,
                fixedWidth: 80,
                fixedHeight: 80,
                isNavigation: true,
                focus: 0,
                updateOnMove: true,
                trimSpace: true,
                breakpoints: {
                  640: {
                    fixedWidth: 70,
                    fixedHeight: 70,
                  },
                },
              }}
              aria-label="Danh sách ảnh sản phẩm"
            >
              {images.map((image, index) => (
                <SplideSlide key={`thumb-${index}`}>
                  <button
                    type="button"
                    className={`relative block h-full w-full overflow-hidden rounded-lg border-2 bg-section transition-all ${
                      photo === index
                        ? "border-brand shadow-md"
                        : "border-border hover:border-brand/50 hover:shadow-sm"
                    }`}
                    onClick={() => {
                      if (mainSplideRef.current?.splide) {
                        mainSplideRef.current.splide.go(index);
                      }
                    }}
                    aria-label={`Xem ảnh ${index + 1}`}
                    aria-pressed={photo === index}
                  >
                    <Image
                      alt={`Ảnh ${index + 1}`}
                      src={image}
                      fill
                      sizes="80px"
                      quality={75}
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
              {Math.min(photo + 1, images.length)} / {images.length}
            </div>
          </>
        )}
      </section>

      <Modal open={zoom} onClose={() => setZoom(false)} title={product.name}>
        <Image
          src={images[photo] || images[0]}
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

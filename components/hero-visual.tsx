"use client";

import { heroSlides } from "@/lib/home-data";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";
import Image from "next/image";
// @ts-ignore - Type definitions issue with @splidejs/react-splide package.json exports
import { Splide, SplideSlide, SplideTrack } from "@splidejs/react-splide";
import "@splidejs/react-splide/css/core";

function slideSizes(width: number, height: number) {
  // Panorama covers a taller frame: account for cropped pixels when choosing srcset.
  const scale = (width / height) / (16 / 7);
  return `(min-width: 1024px) ${Math.ceil(408 * width / height)}px, (min-width: 640px) calc(${100 * scale}vw - ${32 * scale}px), calc(${100 * scale}vw - ${24 * scale}px)`;
}

export function HeroVisual({ slides = heroSlides }: { slides?: { image: string; width: number; height: number; href: string; alt: string }[] }) {
  const splideRef = useRef<any>(null);

  if (!slides || slides.length === 0) return null;

  return (
    <section className="bt-home-hero-banner" aria-label="Ảnh giải pháp nội thất Bảo Tín">
      <Splide
        ref={splideRef}
        hasTrack={false}
        options={{
          type: "loop",
          autoplay: true,
          interval: 5000,
          pauseOnHover: true,
          pauseOnFocus: true,
          resetProgress: false,
          arrows: slides.length > 1,
          pagination: slides.length > 1,
          drag: slides.length > 1,
          keyboard: "global",
        }}
        aria-label="Trình chiếu banner"
      >
        <SplideTrack>
          {slides.map((slide, index) => (
            <SplideSlide key={`${index}-${slide.image}`}>
              <Link 
                href={slide.href} 
                prefetch={false} 
                aria-label={slide.alt} 
                className="bt-home-hero-link"
              >
                <Image
                  src={slide.image}
                  alt={slide.alt}
                  fill
                  sizes={slideSizes(slide.width, slide.height)}
                  quality={90}
                  priority={index === 0}
                  draggable={false}
                  className="bt-home-hero-image"
                />
              </Link>
            </SplideSlide>
          ))}
        </SplideTrack>

        {slides.length > 1 && (
          <div className="splide__arrows bt-home-hero-arrows">
            <button className="splide__arrow splide__arrow--prev bt-home-hero-arrow bt-home-hero-prev">
              <ChevronLeft size={19} aria-hidden="true" />
            </button>
            <button className="splide__arrow splide__arrow--next bt-home-hero-arrow bt-home-hero-next">
              <ChevronRight size={19} aria-hidden="true" />
            </button>
          </div>
        )}

        {slides.length > 1 && (
          <ul className="splide__pagination bt-home-hero-controls"></ul>
        )}
      </Splide>
    </section>
  );
}

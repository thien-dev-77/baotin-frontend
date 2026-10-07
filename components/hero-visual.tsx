"use client";

import { heroSlides } from "@/lib/home-data";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import Image from "next/image";
import { useProgress } from "@bprogress/next";

function slideSizes(width: number, height: number) {
  // Panorama covers a taller frame: account for cropped pixels when choosing srcset.
  const scale = (width / height) / (16 / 7);
  return `(min-width: 1024px) ${Math.ceil(408 * width / height)}px, (min-width: 640px) calc(${100 * scale}vw - ${32 * scale}px), calc(${100 * scale}vw - ${24 * scale}px)`;
}

export function HeroVisual({ slides = heroSlides }: { slides?: { image: string; width: number; height: number; href: string; alt: string }[] }) {
  const { stop } = useProgress();
  const [active, setActive] = useState(0);
  const [visited, setVisited] = useState([0]);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);
  const current = active < slides.length ? active : 0;
  const slide = slides[current];
  const selectSlide = (index: number) => {
    setVisited((current) => current.includes(index) ? current : [...current, index]);
    setActive(index);
  };
  const goTo = (direction: number) => selectSlide((current + direction + slides.length) % slides.length);
  if (!slide) return null;

  return <section className="bt-home-hero-banner" aria-label="Ảnh giải pháp nội thất Bảo Tín" aria-roledescription="Trình chiếu"
    onKeyDown={(event) => {
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        goTo(event.key === "ArrowLeft" ? -1 : 1);
      }
    }}>
    <Link href={slide.href} prefetch={false} aria-label={slide.alt} className="bt-home-hero-link"
      onPointerDown={(event) => {
        swiped.current = false;
        touchStart.current = event.pointerType === "touch" ? { x: event.clientX, y: event.clientY } : null;
      }}
      onPointerUp={(event) => {
        const start = touchStart.current;
        touchStart.current = null;
        if (!start) return;
        const dx = event.clientX - start.x;
        const dy = event.clientY - start.y;
        if (Math.abs(dx) > 44 && Math.abs(dx) > Math.abs(dy)) {
          swiped.current = true;
          goTo(dx < 0 ? 1 : -1);
        }
      }}
      onPointerCancel={() => { touchStart.current = null; }}
      onClick={(event) => { if (swiped.current) { event.preventDefault(); stop(); swiped.current = false; } }}>
      {slides.map((item, index) => (visited.includes(index) || current === index) && <Image key={`${index}-${item.image}`} src={item.image} data-image-src={item.image} alt={item.alt} fill sizes={slideSizes(item.width, item.height)} quality={90} priority={index === 0} aria-hidden={current !== index} data-active={current === index} draggable={false} className="bt-home-hero-image" />)}
    </Link>
    <button type="button" className="bt-home-hero-arrow bt-home-hero-prev" aria-label="Ảnh trước" title="Ảnh trước" onClick={() => goTo(-1)}><ChevronLeft size={19} aria-hidden="true" /></button>
    <button type="button" className="bt-home-hero-arrow bt-home-hero-next" aria-label="Ảnh tiếp theo" title="Ảnh tiếp theo" onClick={() => goTo(1)}><ChevronRight size={19} aria-hidden="true" /></button>
    <div className="bt-home-hero-controls">
      {slides.map((item, index) => <button key={`${index}-${item.image}`} type="button" aria-label={`Chọn slide ${index + 1}`} title={`Slide ${index + 1}`} aria-pressed={current === index} onClick={() => selectSlide(index)}><span /></button>)}
    </div>
    <p className="sr-only" aria-live="polite" aria-atomic="true">Ảnh {current + 1} / {slides.length}: {slide.alt}</p>
  </section>;
}

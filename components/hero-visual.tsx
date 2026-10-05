"use client";

import { heroSlides } from "@/lib/home-data";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";

export function HeroVisual() {
  const [active, setActive] = useState(0);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);
  const slide = heroSlides[active];
  const goTo = (direction: number) => setActive((current) => (current + direction + heroSlides.length) % heroSlides.length);

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
      onClick={(event) => { if (swiped.current) { event.preventDefault(); swiped.current = false; } }}>
      {heroSlides.map((item, index) => <img key={item.image} src={item.image} alt={item.alt} aria-hidden={active !== index} data-active={active === index} fetchPriority={index === 0 ? "high" : "low"} draggable={false} className="bt-home-hero-image" />)}
    </Link>
    <button type="button" className="bt-home-hero-arrow bt-home-hero-prev" aria-label="Ảnh trước" title="Ảnh trước" onClick={() => goTo(-1)}><ChevronLeft size={19} aria-hidden="true" /></button>
    <button type="button" className="bt-home-hero-arrow bt-home-hero-next" aria-label="Ảnh tiếp theo" title="Ảnh tiếp theo" onClick={() => goTo(1)}><ChevronRight size={19} aria-hidden="true" /></button>
    <div className="bt-home-hero-controls">
      {heroSlides.map((item, index) => <button key={item.image} type="button" aria-label={`Chọn slide ${index + 1}`} title={`Slide ${index + 1}`} aria-pressed={active === index} onClick={() => setActive(index)}><span /></button>)}
    </div>
    <p className="sr-only" aria-live="polite" aria-atomic="true">Ảnh {active + 1} / {heroSlides.length}: {slide.alt}</p>
  </section>;
}

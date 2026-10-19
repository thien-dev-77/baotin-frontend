"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { slugify } from "@/lib/catalog";
import { useCommerce } from "./commerce-provider";

const PANEL_WIDTH = 224;
const VIEWPORT_MARGIN = 12;
const HOVER_CLOSE_DELAY = 160;

export function BrandMenu({ inline = false, onNavigate }: { inline?: boolean; onNavigate?: () => void }) {
  const { brands } = useCommerce();
  const pathname = usePathname();
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusOnOpen = useRef<"first" | "last" | null>(null);
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState({ left: 0, top: 0, width: PANEL_WIDTH, maxHeight: 0 });
  const brandLinks = Array.from(new Map(brands.map(name => [slugify(name), name.trim()])).entries())
    .filter(([slug, name]) => slug && name)
    .map(([slug, name]) => ({ name, href: `/brand/${slug}` }))
    .sort((a, b) => a.name.localeCompare(b.name, "vi"));

  function cancelClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
  }

  function closeMenu() {
    cancelClose();
    setOpen(false);
  }

  function focusItem(position: "first" | "last") {
    const links = panel.current?.querySelectorAll<HTMLAnchorElement>("a");
    links?.[position === "first" ? 0 : links.length - 1]?.focus();
  }

  function openMenu(focus: "first" | "last" | null = null) {
    cancelClose();
    const rect = trigger.current?.getBoundingClientRect();
    if (!inline && rect) {
      const width = Math.min(PANEL_WIDTH, window.innerWidth - VIEWPORT_MARGIN * 2);
      setPlacement({
        left: Math.max(VIEWPORT_MARGIN, Math.min(rect.left, window.innerWidth - width - VIEWPORT_MARGIN)),
        top: rect.bottom,
        width,
        maxHeight: Math.max(0, window.innerHeight - rect.bottom - VIEWPORT_MARGIN),
      });
    }
    focusOnOpen.current = focus;
    if (open && focus) focusItem(focus);
    setOpen(true);
  }

  function leave() {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), HOVER_CLOSE_DELAY);
  }

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      if (inline) panel.current?.scrollIntoView({ block: "nearest" });
      if (focusOnOpen.current) focusItem(focusOnOpen.current);
      focusOnOpen.current = null;
    });
    const outside = (event: Event) => {
      if (event.target instanceof Node && !root.current?.contains(event.target) && !panel.current?.contains(event.target)) setOpen(false);
    };
    const scroll = (event: Event) => {
      if (!inline && event.target instanceof Node && !panel.current?.contains(event.target)) setOpen(false);
    };
    const resize = () => setOpen(false);
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setOpen(false); }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("focusin", outside);
    document.addEventListener("scroll", scroll, true);
    document.addEventListener("keydown", escape);
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("focusin", outside);
      document.removeEventListener("scroll", scroll, true);
      document.removeEventListener("keydown", escape);
      window.removeEventListener("resize", resize);
    };
  }, [open, inline]);

  const content = open && <div ref={panel} className={`bt-brand-panel${inline ? " bt-brand-panel--inline" : ""}`} style={inline ? undefined : placement}
    onPointerEnter={cancelClose} onPointerLeave={inline ? undefined : leave}>
    <div id={`${id}-panel`} role="menu" aria-labelledby={`${id}-trigger`} className="bt-brand-list">
      {brandLinks.map(({ name, href }) => <Link key={href} role="menuitem" tabIndex={-1} href={href} prefetch={false}
        className="bt-brand-link" aria-current={pathname === href ? "page" : undefined}
        onClick={() => { closeMenu(); onNavigate?.(); }}>{name}</Link>)}
      {!brandLinks.length && <p role="presentation" className="bt-brand-empty">Chưa có thương hiệu</p>}
    </div>
  </div>;

  return <div ref={root} className={`bt-brand-menu${inline ? " bt-brand-menu--inline" : ""}`}
    onPointerEnter={event => { if (!inline && event.pointerType === "mouse") openMenu(); }}
    onPointerLeave={inline ? undefined : leave}
    onKeyDown={event => {
      if (event.key === "Escape" && open) {
        event.preventDefault(); event.stopPropagation(); closeMenu(); trigger.current?.focus(); return;
      }
      if (event.key === "Tab" && open) {
        if (panel.current?.contains(event.target as Node)) trigger.current?.focus();
        closeMenu(); return;
      }
      if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      if (event.target === trigger.current) { openMenu(event.key === "ArrowUp" || event.key === "End" ? "last" : "first"); return; }
      const links = Array.from(panel.current?.querySelectorAll<HTMLAnchorElement>("a") || []);
      const index = links.indexOf(document.activeElement as HTMLAnchorElement);
      const next = event.key === "Home" ? 0 : event.key === "End" ? links.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + links.length) % links.length;
      links[next]?.focus();
    }}>
    <button ref={trigger} id={`${id}-trigger`} type="button" className="bt-header-nav-link bt-brand-trigger"
      aria-expanded={open} aria-haspopup="menu" aria-controls={open ? `${id}-panel` : undefined}
      data-active={pathname.startsWith("/brand/")}
      onClick={event => { if (open) closeMenu(); else openMenu(event.detail === 0 ? "first" : null); }}>
      Thương hiệu <ChevronDown size={14} strokeWidth={1.8} aria-hidden="true" />
    </button>
    {inline ? content : content && createPortal(content, document.body)}
  </div>;
}

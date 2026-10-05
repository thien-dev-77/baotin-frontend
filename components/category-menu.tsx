"use client";

import {
  BadgePercent,
  Boxes,
  ChevronDown,
  ChevronRight,
  Menu,
  Newspaper,
  X
} from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CategoryLinks } from "@/components/category-links";

const shortcuts = [
  { label: "Sản phẩm bán chạy", icon: Boxes, href: "/search" },
  { label: "Khuyến mãi", icon: BadgePercent, href: "/promotions" },
  { label: "Tin công nghệ", icon: Newspaper, href: "/guides" }
];

export function CategoryMenu() {
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<{ backdropTop: number; maxHeight: number } | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const focusOnOpen = useRef<"first" | "last" | null>(null);
  const menuId = useId();
  const titleId = useId();
  const pathname = usePathname();

  function closeMenu(restoreFocus = true) {
    setOpen(false);
    if (restoreFocus) trigger.current?.focus({ preventScroll: true });
  }

  function focusItem(position: "first" | "last") {
    const links = panel.current?.querySelectorAll<HTMLAnchorElement>('[role="menuitem"]');
    links?.[position === "first" ? 0 : links.length - 1]?.focus();
  }

  function openMenu(focus: "first" | "last" | null = null) {
    const rect = trigger.current?.getBoundingClientRect();
    if (rect) {
      setPlacement({
        backdropTop: root.current?.closest("header")?.getBoundingClientRect().bottom ?? rect.bottom,
        maxHeight: Math.max(0, window.innerHeight - rect.bottom - 24)
      });
    }
    focusOnOpen.current = focus;
    if (open && focus) focusItem(focus);
    setOpen(true);
  }

  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      if (focusOnOpen.current) focusItem(focusOnOpen.current);
      focusOnOpen.current = null;
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        trigger.current?.focus({ preventScroll: true });
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onResize = () => { setOpen(false); };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  return (
    <div ref={root} className="bt-category-menu" data-state={open ? "open" : "closed"} onKeyDown={(event) => { if (event.key === "Tab") closeMenu(false); }}>
      <button
        ref={trigger}
        type="button"
        aria-controls={menuId}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            openMenu(event.key === "ArrowDown" ? "first" : "last");
          }
        }}
        className="bt-category-trigger"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={(event) => { if (open) closeMenu(); else openMenu(event.detail === 0 ? "first" : null); }}
      >
        <Menu size={16} strokeWidth={1.8} aria-hidden="true" />
        Danh mục sản phẩm
        <ChevronDown size={14} strokeWidth={1.8} className="bt-category-trigger-chevron" aria-hidden="true" />
      </button>

      <div aria-hidden="true" className="bt-category-backdrop" style={{ top: placement?.backdropTop }} onPointerDown={(event) => { event.preventDefault(); closeMenu(); }} />
      <div ref={panel} className="bt-category-panel" aria-hidden={!open} style={{ maxHeight: placement?.maxHeight }}
        onKeyDown={(event) => {
          if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
          event.preventDefault();
          const links = Array.from(panel.current?.querySelectorAll<HTMLAnchorElement>('[role="menuitem"]') || []);
          const index = links.indexOf(document.activeElement as HTMLAnchorElement);
          const next = event.key === "Home" ? 0 : event.key === "End" ? links.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + links.length) % links.length;
          links[next]?.focus();
        }}>
        <div className="bt-category-heading">
          <p id={titleId}>Danh mục sản phẩm</p>
          <button type="button" tabIndex={-1} className="bt-category-close" title="Đóng danh mục" aria-label="Đóng danh mục" onClick={() => closeMenu()}>
            <X size={16} strokeWidth={1.8} aria-hidden="true" />
          </button>
        </div>
        <div id={menuId} role="menu" aria-labelledby={titleId} className="bt-category-scroll">
          <div role="group" aria-label="Nhóm sản phẩm">
            <CategoryLinks menu onNavigate={() => closeMenu()} />
          </div>
          <div role="separator" className="bt-category-separator" />
          <div role="group" aria-label="Khám phá thêm">
            {shortcuts.map(({ label, href, icon: Icon }) => <Link key={href} role="menuitem" tabIndex={-1} prefetch={false} href={href} aria-current={pathname === href ? "page" : undefined} className="bt-category-item bt-category-shortcut" onClick={() => closeMenu()}>
              <Icon size={18} strokeWidth={1.7} aria-hidden="true" className="bt-category-icon" />
              <span>{label}</span>
              <ChevronRight size={15} strokeWidth={1.7} aria-hidden="true" className="bt-category-chevron" />
            </Link>)}
          </div>
        </div>
      </div>
    </div>
  );
}

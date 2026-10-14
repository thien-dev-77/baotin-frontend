"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import { categoryRoots, MAX_CATEGORY_DEPTH } from "@/lib/category-tree";
import type { Category } from "@/lib/types";
import { CategoryIcon } from "./category-icon";

const HOVER_OPEN_DELAY = 80;
const HOVER_CLOSE_DELAY = 180;
const PANEL_WIDTH = 272;
const PANEL_GAP = 4;
const ROOT_GAP = 8;
const VIEWPORT_MARGIN = 12;
const PANEL_MAX_HEIGHT = 480;
const PREVIEW_ITEMS = 2;
const HOVER_MEDIA = "(min-width: 1024px) and (hover: hover) and (pointer: fine)";

type Entry = { id: string; name: string; href: string; category?: Category };
type Panel = { entry: Entry; anchor: HTMLElement; left: number; width: number; top: number; minTop: number; maxHeight: number; focusFirst: boolean };
const categoryEntry = (category: Category): Entry => ({ id: category.slug, name: category.name, href: `/category/${category.slug}`, category });

function childEntries(entry: Entry, categories: Category[], level: number): Entry[] {
  if (!entry.category || level >= MAX_CATEGORY_DEPTH - 1) return [];
  const children = categories.filter(category => category.parentSlug === entry.category!.slug);
  if (children.length) return children.map(categoryEntry);
  return entry.category.subcategories.filter(name => name.trim()).map((name, index) => ({ id: `${entry.id}-group-${index}`, name, href: `${entry.href}?subcategory=${encodeURIComponent(name)}` }));
}

export function CategoryFlyoutLinks({ categories, showChildPreview = false, onNavigate }: { categories: Category[]; showChildPreview?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const prefix = useId();
  const roots = useRef<HTMLDivElement>(null);
  const panelElements = useRef(new Map<number, HTMLElement>());
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [panels, setPanels] = useState<Panel[]>([]);
  const visibleCategories = categories.filter(category => category.visible !== false);

  const cancelTimers = useCallback(() => {
    if (openTimer.current) clearTimeout(openTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
    openTimer.current = null; closeTimer.current = null;
  }, []);
  const closeAll = useCallback(() => {
    cancelTimers();
    setPanels(previous => previous.length ? [] : previous);
  }, [cancelTimers]);

  useEffect(() => { closeAll(); }, [pathname, categories, closeAll]);
  useEffect(() => {
    const inside = (target: EventTarget | null) => target instanceof Node && (roots.current?.contains(target) || Array.from(panelElements.current.values()).some(panel => panel.contains(target)));
    const outside = (event: Event) => { if (!inside(event.target)) closeAll(); };
    const scroll = (event: Event) => {
      if (event.target instanceof Element && event.target.closest("[data-category-flyout]")) return;
      closeAll();
    };
    const escape = (event: globalThis.KeyboardEvent) => { if (event.key === "Escape") closeAll(); };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("focusin", outside);
    document.addEventListener("scroll", scroll, true);
    document.addEventListener("keydown", escape);
    window.addEventListener("resize", closeAll);
    return () => {
      cancelTimers();
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("focusin", outside);
      document.removeEventListener("scroll", scroll, true);
      document.removeEventListener("keydown", escape);
      window.removeEventListener("resize", closeAll);
    };
  }, [cancelTimers, closeAll]);

  function open(entry: Entry, level: number, anchor: HTMLElement, focusFirst = false) {
    cancelTimers();
    if (!childEntries(entry, visibleCategories, level).length) { setPanels(previous => previous.slice(0, level)); return; }
    const sidebar = roots.current?.closest(".bt-home-category-sidebar");
    if (!sidebar) return;
    const rootLeft = sidebar.getBoundingClientRect().right + ROOT_GAP;
    // Reserve room for all remaining levels instead of stacking panels over each other.
    const columns = MAX_CATEGORY_DEPTH - 1;
    const width = Math.min(PANEL_WIDTH, (window.innerWidth - VIEWPORT_MARGIN - rootLeft - PANEL_GAP * (columns - 1)) / columns);
    const minTop = Math.max(VIEWPORT_MARGIN, (document.querySelector("header")?.getBoundingClientRect().bottom || 0) + ROOT_GAP);
    const panel: Panel = { entry, anchor, left: rootLeft + level * (width + PANEL_GAP), width, top: anchor.getBoundingClientRect().top, minTop, maxHeight: Math.min(PANEL_MAX_HEIGHT, window.innerHeight - minTop - VIEWPORT_MARGIN), focusFirst };
    setPanels(previous => [...previous.slice(0, level), panel]);
  }
  function hover(event: PointerEvent<HTMLDivElement>, entry: Entry, level: number) {
    if (event.pointerType !== "mouse" || !window.matchMedia(HOVER_MEDIA).matches) return;
    cancelTimers();
    const anchor = event.currentTarget;
    openTimer.current = setTimeout(() => open(entry, level, anchor), HOVER_OPEN_DELAY);
  }
  function leave() {
    cancelTimers();
    closeTimer.current = setTimeout(closeAll, HOVER_CLOSE_DELAY);
  }
  function closeFrom(level: number) {
    cancelTimers();
    const anchor = panels[level]?.anchor;
    setPanels(previous => previous.slice(0, level));
    anchor?.querySelector<HTMLAnchorElement>("[data-category-link]")?.focus({ preventScroll: true });
  }
  function navigate() { closeAll(); onNavigate?.(); }

  function row(entry: Entry, level: number) {
    const children = childEntries(entry, visibleCategories, level);
    const active = panels[level]?.entry.id === entry.id;
    const panelId = `${prefix}-panel-${level}`;
    function keyboard(event: KeyboardEvent<HTMLDivElement>) {
      if (event.key === "ArrowRight" && children.length) { event.preventDefault(); event.stopPropagation(); open(entry, level, event.currentTarget, true); return; }
      if (event.key === "ArrowLeft" || event.key === "Escape") { event.preventDefault(); event.stopPropagation(); closeFrom(Math.max(0, level - 1)); return; }
      if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const links = Array.from(event.currentTarget.parentElement?.querySelectorAll<HTMLAnchorElement>(":scope > [data-category-row] [data-category-link]") || []);
      const index = links.findIndex(link => event.currentTarget.contains(link));
      const next = event.key === "Home" ? 0 : event.key === "End" ? links.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + links.length) % links.length;
      links[next]?.focus();
    }
    return <div key={entry.id} data-category-row data-active={active} className="bt-category-flyout-row" onPointerEnter={event => hover(event, entry, level)} onKeyDown={keyboard}>
      <div className="bt-category-flyout-row-main">
        <Link href={entry.href} prefetch={false} data-category-link aria-current={pathname === entry.href ? "page" : undefined} onClick={navigate} className={`bt-category-item min-w-0 flex-1${level ? " bt-category-flyout-link" : ""}`}>
          {!level && entry.category && <CategoryIcon slug={entry.category.slug} />}
          <span>{entry.name}</span>
          {!children.length && !level && <ChevronRight size={16} strokeWidth={1.7} aria-hidden="true" className="bt-category-chevron" />}
        </Link>
        {children.length > 0 && <button type="button" aria-expanded={active} aria-controls={active ? panelId : undefined} aria-label={`${active ? "Thu gọn" : "Mở"} danh mục con ${entry.name}`} title={`${active ? "Thu gọn" : "Mở"} danh mục con`} className="bt-icon-button shrink-0" onClick={event => {
          if (active) { closeFrom(level); return; }
          open(entry, level, event.currentTarget.closest<HTMLElement>("[data-category-row]")!, true);
        }}><ChevronRight size={16} aria-hidden="true" /></button>}
      </div>
      {showChildPreview && !level && children.length > 0 && <p className="bt-home-category-preview" title={children.map(child => child.name).join(", ")}>{children.slice(0, PREVIEW_ITEMS).map(child => child.name).join(" · ")}</p>}
    </div>;
  }

  return <>
    <div ref={roots} className="bt-category-flyout-roots" onPointerLeave={leave}>{categoryRoots(visibleCategories).map(entry => row(categoryEntry(entry), 0))}</div>
    {panels.length > 0 && createPortal(panels.map((panel, level) => <FlyoutPanel key={panel.entry.id} panel={panel} id={`${prefix}-panel-${level}`} register={element => {
      if (element) panelElements.current.set(level, element); else panelElements.current.delete(level);
    }} onPointerEnter={cancelTimers} onPointerLeave={leave} onScroll={() => setPanels(previous => previous.slice(0, level + 1))}>
      {childEntries(panel.entry, visibleCategories, level).map(entry => row(entry, level + 1))}
    </FlyoutPanel>), document.body)}
  </>;
}

function FlyoutPanel({ panel, id, register, onPointerEnter, onPointerLeave, onScroll, children }: { panel: Panel; id: string; register: (element: HTMLElement | null) => void; onPointerEnter: () => void; onPointerLeave: () => void; onScroll: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const [top, setTop] = useState(panel.top);
  useLayoutEffect(() => {
    const height = ref.current?.getBoundingClientRect().height || 0;
    setTop(Math.max(panel.minTop, Math.min(panel.top, window.innerHeight - VIEWPORT_MARGIN - height)));
    if (panel.focusFirst) ref.current?.querySelector<HTMLAnchorElement>("[data-category-link]")?.focus({ preventScroll: true });
  }, [panel]);
  return <nav ref={element => { ref.current = element; register(element); }} id={id} data-category-flyout aria-label={`Danh mục con ${panel.entry.name}`} className="bt-category-flyout-panel" style={{ left: panel.left, top, width: panel.width, maxHeight: panel.maxHeight }} onPointerEnter={onPointerEnter} onPointerLeave={onPointerLeave} onScroll={onScroll}>
    <div className="bt-category-flyout-items">{children}</div>
  </nav>;
}

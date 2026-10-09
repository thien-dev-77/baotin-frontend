"use client";

import Image from "next/image";
import { money, normalize, priceFor, slugify } from "@/lib/catalog";
import { apiMode } from "@/lib/api-client";
import { useApiResource } from "@/lib/use-api-resource";
import { readCatalogPage } from "@/lib/commerce-api";
import type { CatalogPageResponse } from "@/lib/api-types";
import { useCommerce } from "@/components/commerce-provider";
import { Modal } from "@/components/ui";
import { Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "@bprogress/next/app";
import { useEffect, useId, useRef, useState } from "react";

export function SearchBox({ large = false, compactButton = false, initialValue = "" }: { large?: boolean; compactButton?: boolean; initialValue?: string }) {
  const { customer, ready, products: catalog, categories: categoryCatalog, brands } = useCommerce();
  const router = useRouter();
  const [query, setQuery] = useState(initialValue);
  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [active, setActive] = useState(-1);
  const [debounced, setDebounced] = useState(initialValue);
  useEffect(() => { const timer = setTimeout(() => setDebounced(query.trim()), 250); return () => clearTimeout(timer); }, [query]);
  const suggestions = useApiResource<CatalogPageResponse>(`/catalog/search?q=${encodeURIComponent(debounced)}&pageSize=5`, apiMode && ready && !!debounced && (open || mobile), undefined, readCatalogPage);
  const ref = useRef<HTMLDivElement>(null);
  const listId = useId();
  const suppressFocus = useRef(false);
  const term = normalize(query.trim());
  const matchingProducts = apiMode && term ? debounced === query.trim() ? suggestions.data?.products || [] : [] : catalog.filter(p => normalize(`${p.name} ${p.code} ${p.brand}`).includes(term)).slice(0, 5);
  const items = [
    ...matchingProducts.map((p) => ({ section: "Sản phẩm", name: p.name, detail: `Mã: ${p.code}`, price: money(priceFor(p, customer)), image: p.image, href: `/products/${p.slug}` })),
    ...categoryCatalog.filter((c) => normalize(c.name).includes(term)).slice(0, 3).map((c) => ({ section: "Danh mục", name: c.name, detail: "", price: "", image: c.image, href: `/category/${c.slug}` })),
    ...brands.filter((brand) => normalize(brand).includes(term)).slice(0, 2).map((brand) => ({ section: "Thương hiệu", name: brand, detail: "", price: "", image: "", href: `/brand/${slugify(brand)}` }))
  ];
  useEffect(() => { const handler = (event: PointerEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false); }; document.addEventListener("pointerdown", handler); return () => document.removeEventListener("pointerdown", handler); }, []);
  const close = () => { suppressFocus.current = true; requestAnimationFrame(() => { suppressFocus.current = false; }); setOpen(false); setMobile(false); setActive(-1); };
  const navigate = (href: string) => { close(); router.push(href); };
  const keyboard = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); setOpen(true); if (!mobile && window.matchMedia("(max-width: 639px)").matches) setMobile(true); setActive((current) => items.length ? current === -1 ? event.key === "ArrowDown" ? 0 : items.length - 1 : (current + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length : -1); }
    if (event.key === "Escape") { event.preventDefault(); close(); }
    if (event.key === "Enter" && active >= 0 && items[active]) { event.preventDefault(); navigate(items[active].href); }
  };
  const searchForm = (overlay = false) => <form role="search" onSubmit={(event) => { event.preventDefault(); navigate(`/search?q=${encodeURIComponent(query.trim())}`); }} className={`flex w-full items-center rounded-lg border border-slate-300 bg-white focus-within:border-blue-brand focus-within:ring-2 focus-within:ring-blue-brand/20 ${large ? "h-[48px]" : "h-10"}`}><Search aria-hidden="true" className="ml-3 shrink-0 text-text-secondary" size={18} /><input autoFocus={overlay} role="combobox" aria-label="Tìm sản phẩm, mã hàng, thương hiệu" aria-expanded={open || mobile} aria-controls={listId} aria-autocomplete="list" aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined} className="h-full min-w-0 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-text-muted" placeholder="Tìm sản phẩm, mã hàng, thương hiệu..." value={query} onChange={(event) => { setQuery(event.target.value); setActive(-1); setOpen(true); if (!overlay && window.matchMedia("(max-width: 639px)").matches) setMobile(true); }} onKeyDown={keyboard} onClick={() => { suppressFocus.current = false; if (!overlay && window.matchMedia("(max-width: 639px)").matches) setMobile(true); else setOpen(true); }} onFocus={() => { if (suppressFocus.current) { suppressFocus.current = false; return; } if (!overlay && window.matchMedia("(max-width: 639px)").matches) setMobile(true); else setOpen(true); }} /><button className={`mr-1 flex h-[calc(100%-8px)] shrink-0 items-center justify-center rounded-md bg-blue-brand px-3 text-xs font-semibold text-white hover:bg-blue-hover ${large ? "sm:px-5 sm:text-sm" : ""}`}>{compactButton ? "Tìm kiếm" : "Tìm sản phẩm"}</button></form>;
  const results = <div id={listId} role="listbox" aria-label="Gợi ý tìm kiếm" className={`${mobile ? "max-h-[calc(100dvh-160px)]" : "max-h-[420px]"} overflow-y-auto`} aria-busy={suggestions.loading}>{apiMode && term && (suggestions.loading || debounced !== query.trim()) && <p role="status" className="px-3 py-2 text-xs text-text-secondary">Đang tìm sản phẩm…</p>}{apiMode && term && suggestions.error && <div role="alert" className="px-3 py-2 text-xs text-danger">{suggestions.error} <button type="button" className="underline" onClick={() => void suggestions.reload()}>Thử lại</button></div>}{items.length ? items.map((item, index) => <div key={item.href}>{index === 0 || items[index - 1].section !== item.section ? <p className="bg-section px-3 py-2 text-xs font-semibold text-text-secondary">{item.section}</p> : null}<Link id={`${listId}-${index}`} role="option" aria-selected={active === index} href={item.href} onClick={close} className={`flex items-center gap-3 px-3 py-2 ${active === index ? "bg-section-blue" : "hover:bg-section"}`}>{item.image && <Image src={item.image} alt="" width={40} height={40} className="h-10 w-10 rounded bg-section object-contain" quality={85} sizes="40px" data-image-src={item.image} />}<span className="min-w-0 flex-1"><span className="line-clamp-2 text-sm font-medium text-primary">{item.name}</span>{item.detail && <span className="block text-xs text-text-muted">{item.detail}</span>}</span>{item.price && <span className="shrink-0 text-xs font-semibold text-danger">{item.price}</span>}</Link></div>) : !suggestions.loading && !suggestions.error && debounced === query.trim() && <p className="p-4 text-sm text-text-secondary">Không có gợi ý phù hợp.</p>}<button onClick={() => navigate(`/search?q=${encodeURIComponent(query.trim())}`)} className="w-full border-t border-border px-3 py-3 text-left text-sm font-semibold text-blue-brand">Xem tất cả kết quả</button></div>;
  return <div ref={ref} className="relative w-full">{searchForm()}{open && !mobile && <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-lg border border-border bg-white shadow-card-hover">{results}</div>}<Modal open={mobile} onClose={close} title="Tìm kiếm sản phẩm" fullscreen>{searchForm(true)}<div className="mt-3">{results}</div></Modal></div>;
}

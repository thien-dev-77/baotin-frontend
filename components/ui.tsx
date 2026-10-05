"use client";

import { AlertCircle, ChevronLeft, ChevronRight, Minus, Plus, RefreshCw, Search, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef } from "react";

export function Button({ variant = "primary", className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" }) {
  return <button className={`${variant === "primary" ? "bt-button-primary" : variant === "secondary" ? "bt-button-secondary" : "bt-button-ghost"} ${className}`} {...props} />;
}
export function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return <nav aria-label="Đường dẫn" className="mb-5 flex flex-wrap items-center gap-1.5 text-xs text-text-secondary"><Link href="/" className="hover:text-blue-brand">Trang chủ</Link>{items.map((item, index) => <span key={`${item.label}-${index}`} className="inline-flex items-center gap-1.5"><ChevronRight size={13} aria-hidden="true" />{item.href ? <Link href={item.href} className="hover:text-blue-brand">{item.label}</Link> : <span aria-current="page" className="text-primary">{item.label}</span>}</span>)}</nav>;
}
export function PageHeading({ title, description, children }: { title: string; description?: string; children?: React.ReactNode }) {
  return <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-bold leading-tight text-primary">{title}</h1>{description && <p className="mt-2 text-sm leading-6 text-text-secondary">{description}</p>}</div>{children}</div>;
}
export function EmptyState({ title, description, href, action, icon }: { title: string; description?: string; href?: string; action?: string; icon?: React.ReactNode }) {
  return <div className="flex min-h-[260px] flex-col items-center justify-center px-4 py-10 text-center"><div className="mb-4 text-blue-brand">{icon || <Search size={36} strokeWidth={1.5} />}</div><h2 className="text-lg font-semibold text-primary">{title}</h2>{description && <p className="mt-2 max-w-md text-sm leading-6 text-text-secondary">{description}</p>}{href && <Link href={href} className="bt-button-primary mt-5">{action || "Xem sản phẩm"}</Link>}</div>;
}
export function QuantityStepper({ value, onChange, max = 999, label = "Số lượng" }: { value: number; onChange: (value: number) => void; max?: number; label?: string }) {
  return <div className="inline-flex h-9 w-[104px] shrink-0 items-center rounded-md border border-border bg-white"><button type="button" className="flex h-full w-8 items-center justify-center text-blue-brand disabled:text-text-muted" disabled={value <= 1} onClick={() => onChange(value - 1)} aria-label={`Giảm ${label}`}><Minus size={14} /></button><input aria-label={label} type="number" min={1} max={max} value={value} onChange={(event) => onChange(Math.max(1, Math.min(max, Math.floor(Number(event.target.value)) || 1)))} className="quantity-input h-full w-10 bg-transparent text-center text-sm outline-none" /><button type="button" className="flex h-full w-8 items-center justify-center text-blue-brand disabled:text-text-muted" disabled={value >= max} onClick={() => onChange(value + 1)} aria-label={`Tăng ${label}`}><Plus size={14} /></button></div>;
}
export function ErrorState({ retry }: { retry: () => void }) {
  return <div role="alert" className="flex min-h-[380px] flex-col items-center justify-center px-4 py-10 text-center"><AlertCircle size={38} className="text-danger" /><h1 className="mt-4 text-xl font-bold text-primary">Chưa thể tải nội dung</h1><p className="mt-2 text-sm text-text-secondary">Vui lòng thử lại hoặc liên hệ Bảo Tín để được hỗ trợ.</p><Button onClick={retry} className="mt-5"><RefreshCw size={16} />Thử lại</Button></div>;
}
export function Field({ label, required, error, children, htmlFor }: { label: string; required?: boolean; error?: string; children: React.ReactNode; htmlFor?: string }) {
  const text = <span className="mb-1.5 block">{label}{required && <span className="ml-1 text-danger">*</span>}</span>;
  const content = <>{children}{error && <span className="mt-1 block text-xs text-danger">{error}</span>}</>;
  return htmlFor ? <div className="block min-w-0 text-sm font-medium text-primary"><label htmlFor={htmlFor}>{text}</label>{content}</div> : <label className="block min-w-0 text-sm font-medium text-primary">{text}{content}</label>;
}
export function Modal({ open, onClose, title, children, drawer = false, sheet = false, fullscreen = false }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; drawer?: boolean; sheet?: boolean; fullscreen?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open]);
  return <dialog ref={ref} aria-labelledby={titleId} onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => { if (event.target === ref.current) { const rect = ref.current!.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose(); } }} className={`bt-dialog${drawer ? " bt-drawer" : ""}${sheet ? " bt-sheet" : ""}${fullscreen ? " bt-fullscreen" : ""}`}><div className="flex items-center justify-between gap-3 border-b border-border p-4"><h2 id={titleId} className="text-base font-bold text-primary">{title}</h2><button type="button" onClick={onClose} className="bt-icon-button" aria-label="Đóng"><X size={20} /></button></div><div className="p-4">{open ? children : null}</div></dialog>;
}
export function Tabs({ options, value, onChange }: { options: string[]; value: string; onChange: (value: string) => void }) {
  return <div className="scrollbar-hide flex gap-1 overflow-x-auto border-b border-border" role="tablist">{options.map((option, index) => <button key={option} type="button" role="tab" aria-selected={value === option} tabIndex={value === option ? 0 : -1} onClick={() => onChange(option)} onKeyDown={(event) => { if (event.key === "ArrowRight" || event.key === "ArrowLeft") { event.preventDefault(); const next = options[(index + (event.key === "ArrowRight" ? 1 : -1) + options.length) % options.length]; onChange(next); const buttons = event.currentTarget.parentElement?.querySelectorAll("button"); buttons?.[options.indexOf(next)]?.focus(); } }} className={`shrink-0 border-b-2 px-3 py-3 text-sm ${value === option ? "border-blue-brand font-semibold text-blue-brand" : "border-transparent text-text-secondary hover:text-blue-brand"}`}>{option}</button>)}</div>;
}
export function Pagination({ page, total, onChange }: { page: number; total: number; onChange: (page: number) => void }) {
  if (total <= 1) return null;
  return <nav aria-label="Phân trang" className="mt-7 flex justify-center gap-1"><button className="bt-icon-button" disabled={page === 1} onClick={() => onChange(page - 1)} aria-label="Trang trước"><ChevronLeft size={18} /></button>{Array.from({ length: total }, (_, index) => index + 1).map((number) => <button key={number} aria-current={page === number ? "page" : undefined} className={`flex h-9 w-9 items-center justify-center rounded-md text-sm ${page === number ? "bg-blue-brand font-semibold text-white" : "hover:bg-section"}`} onClick={() => onChange(number)}>{number}</button>)}<button className="bt-icon-button" disabled={page === total} onClick={() => onChange(page + 1)} aria-label="Trang sau"><ChevronRight size={18} /></button></nav>;
}

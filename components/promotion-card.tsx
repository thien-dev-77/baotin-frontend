"use client";
import { ArrowRight } from "lucide-react";

export function PromotionCard({ title, image, description, selected, onSelect }: { title: string; image: string; description: string; selected: boolean; onSelect: () => void }) {
  return <button type="button" aria-pressed={selected} onClick={onSelect} className={`flex items-center gap-3 rounded-lg border p-3 text-left transition ${selected ? "border-blue-brand bg-section-blue" : "border-border bg-white hover:border-blue-brand"}`}><img src={image} alt="" className="h-20 w-20 shrink-0 rounded-md object-cover" /><span className="min-w-0 flex-1"><strong className="text-sm text-primary">{title}</strong><span className="mt-1 block text-xs leading-5 text-text-secondary">{description}</span></span><ArrowRight size={18} className="shrink-0 text-blue-brand" /></button>;
}

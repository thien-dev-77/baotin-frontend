"use client";

import { useId, useState } from "react";
import { X } from "lucide-react";
import { availableMaterialGroups } from "@/lib/material-groups";

const COLLAPSED_OPTIONS = 6;

export function CatalogMaterialFilter({ values, selected, legacySelected, onChange, onRemoveLegacy }: {
  values: readonly string[];
  selected: string[];
  legacySelected: string[];
  onChange: (values: string[]) => void;
  onRemoveLegacy: (value: string) => void;
}) {
  const id = useId();
  const [expanded, setExpanded] = useState(false);
  const options = availableMaterialGroups(values, selected);
  const shown = options.filter((option, index) => expanded || index < COLLAPSED_OPTIONS || selected.includes(option.value));
  const hidden = options.length - shown.length;
  const count = selected.length + legacySelected.length;
  if (!options.length && !count) return null;

  return <details open className="border-b border-border pb-4" data-material-filter>
    <summary className="cursor-pointer text-sm font-semibold text-primary">Chất liệu{count > 0 && <span className="ml-2 rounded bg-section px-1.5 py-0.5 text-xs">{count}</span>}</summary>
    <div className="mt-3">
      <div className="mb-2 flex items-center justify-between gap-2 text-xs text-text-muted">
        <span>Có thể chọn nhiều loại</span>
        {count > 0 && <button type="button" onClick={() => onChange([])} className="min-h-8 shrink-0 font-medium text-primary underline underline-offset-4">Bỏ chọn</button>}
      </div>
      {legacySelected.length > 0 && <div className="mb-2 space-y-1.5">
        {legacySelected.map(value => <button key={value} type="button" title={value} aria-label={`Bỏ lọc chất liệu ${value}`} onClick={() => onRemoveLegacy(value)} className="flex w-full items-start justify-between gap-2 rounded-md border border-border bg-section p-2 text-left text-xs text-primary">
          <span className="line-clamp-2 break-words">{value}</span><X size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
        </button>)}
      </div>}
      <div id={id} role="group" aria-label="Chất liệu" className="max-h-64 space-y-1 overflow-y-auto overscroll-contain pr-1">
        {shown.map(option => <label key={option.value} className={`flex min-h-9 cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] leading-5 transition hover:bg-section ${selected.includes(option.value) ? "bg-section font-medium text-primary" : "text-text-secondary"}`}>
          <input type="checkbox" className="h-4 w-4 shrink-0 accent-brand" checked={selected.includes(option.value)} onChange={() => onChange(selected.includes(option.value) ? selected.filter(value => value !== option.value) : [...selected, option.value])} />
          <span>{option.label}</span>
        </label>)}
      </div>
      {(hidden > 0 || expanded) && <button type="button" aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded(!expanded)} className="mt-2 min-h-8 text-xs font-medium text-primary underline underline-offset-4">{expanded ? "Thu gọn" : `Xem thêm (${hidden})`}</button>}
    </div>
  </details>;
}

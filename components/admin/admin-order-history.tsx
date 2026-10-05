"use client";

import { Clock3 } from "lucide-react";
import { useAdmin } from "@/components/admin/admin-provider";
import { warehouseTime } from "@/lib/admin-warehouse";

export function AdminOrderHistory({ id }: { id: string }) {
  const { warehouse } = useAdmin();
  const history = warehouse[id]?.history || [];
  return <section className="mt-5 border-t border-border pt-4" aria-label="Lịch sử thao tác mẫu">
    <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary"><Clock3 size={16} />Lịch sử thao tác mẫu</h3>
    {history.length ? <ol className="space-y-4">{[...history].reverse().map((event, index) => <li key={`${event.at}-${index}`} className="border-l-2 border-border pl-3"><div className="flex flex-wrap items-baseline justify-between gap-1"><span className="text-xs font-medium text-primary">{event.label}</span><time dateTime={event.at} className="text-[11px] text-text-muted">{warehouseTime(event.at)}</time></div>{event.note && <p className="mt-1 break-words text-xs leading-5 text-text-secondary">{event.note}</p>}<p className="mt-1 text-[11px] text-text-muted">Nhân viên demo</p></li>)}</ol> : <p className="text-xs text-text-muted">Chưa có thao tác mới.</p>}
  </section>;
}

"use client";

import { Search } from "lucide-react";
import { useState } from "react";
import { Pagination } from "@/components/ui";

export function AdminHeading({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return <div className="mb-6 flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-[22px] font-bold leading-7 text-primary">{title}</h1>{subtitle && <p className="mt-1.5 text-sm text-text-secondary">{subtitle}</p>}</div>{children}</div>;
}
export function AdminStatus({ value }: { value: string }) {
  const color = ["Riêng tư", "Ẩn danh mục"].includes(value) ? "bg-section text-text-secondary" : ["Hoàn tất", "Đã duyệt", "Đã đối chiếu", "Đang hoạt động", "Đang bán", "Công khai", "Hiển thị", "Còn hàng"].includes(value) ? "bg-emerald-50 text-emerald-700" : ["Đã hủy", "Từ chối", "Tạm ngưng", "Quá hạn", "Vượt hạn mức", "Hết hàng", "Thiếu hàng"].includes(value) ? "bg-red-50 text-red-700" : ["Chờ xác nhận", "Chờ duyệt", "Chờ đối chiếu", "Sắp hết"].includes(value) ? "bg-amber-50 text-amber-800" : "bg-section text-primary";
  return <span className={`inline-flex whitespace-nowrap rounded px-2 py-1 text-[11px] font-medium leading-4 ${color}`}>{value}</span>;
}
export function AdminSearch({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return <label className="relative min-w-0 basis-full flex-1 sm:basis-auto sm:max-w-sm"><Search size={16} className="pointer-events-none absolute left-3 top-3 text-text-muted" /><span className="sr-only">{placeholder}</span><input type="search" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="bt-input !pl-9" /></label>;
}
export function AdminTable({ headings, children, empty = false, loading = false, className = "" }: { headings: React.ReactNode[]; children: React.ReactNode; empty?: boolean; loading?: boolean; className?: string }) {
  return <div className="overflow-auto rounded-md border border-border bg-white" tabIndex={0} role="region" aria-label="Bảng dữ liệu" aria-busy={loading || undefined}><table className={`bt-admin-table${headings.at(-1) === "Thao tác" ? " bt-admin-table-actions" : ""} ${className}`}><thead><tr>{headings.map((heading, i) => <th key={`${heading}-${i}`} scope="col">{heading}</th>)}</tr></thead><tbody>{loading ? Array.from({ length: 5 }, (_, row) => <tr key={row}>{headings.map((_, column) => <td key={column}><span className="block h-4 w-24 animate-pulse rounded bg-section" /></td>)}</tr>) : empty ? <tr><td colSpan={headings.length} className="!py-12 !text-center text-text-muted">Không có dữ liệu phù hợp.</td></tr> : children}</tbody></table></div>;
}
export function AdminPagination({ count, page, onChange, pageSize = 10, onPageSize }: { count: number; page: number; onChange: (value: number) => void; pageSize?: number; onPageSize?: (size: number) => void }) {
  return <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-text-muted"><div className="flex flex-wrap items-center gap-3"><span>{count ? `${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, count)} / ${count} kết quả` : "0 kết quả"}</span>{onPageSize && <label className="flex items-center gap-2">Số dòng<select aria-label="Số dòng mỗi trang" className="bt-input !h-8 !w-auto" value={pageSize} onChange={event => onPageSize(Number(event.target.value))}>{[10, 25, 50].map(size => <option key={size}>{size}</option>)}</select></label>}</div><div className="max-w-full [&_nav]:!mt-0 [&_nav]:flex-wrap"><Pagination page={page} total={Math.ceil(count / pageSize)} onChange={onChange} /></div></div>;
}
export function useAdminFilters(initialFilter = "all") {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState(initialFilter);
  const [page, setPage] = useState(1);
  return { query, filter, page, setPage, setQuery: (value: string) => { setQuery(value); setPage(1); }, setFilter: (value: string) => { setFilter(value); setPage(1); } };
}

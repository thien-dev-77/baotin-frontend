"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, ClipboardCheck, Clock3, ShoppingBag, UsersRound, Wallet } from "lucide-react";
import { useAdmin } from "@/components/admin/admin-provider";
import { AdminHeading } from "@/components/admin/admin-ui";
import { AdminOrderTable } from "@/components/admin/admin-order-table";
import { AdminOrderDialog } from "@/components/admin/admin-order-dialog";
import { adminDate, dateBefore } from "@/lib/admin-preview";
import { hasShortage } from "@/lib/admin-warehouse";
import { money } from "@/lib/catalog";

export function AdminDashboard() {
  const { branch, days, scopedOrders, scopedCustomers, scopedApprovals, warehouse, warehouseOrders, today } = useAdmin();
  const [selected, setSelected] = useState<string | null>(null);
  const valid = scopedOrders.filter((item) => item.status !== "Đã hủy");
  const pending = scopedOrders.filter((item) => item.status === "Chờ xác nhận").length;
  const approvals = scopedApprovals.filter((item) => item.status === "Chờ duyệt").length;
  const debt = scopedCustomers.reduce((sum, item) => sum + item.debt, 0);
  const total = valid.reduce((sum, item) => sum + item.total, 0);
  const compactMoney = (value: number) => new Intl.NumberFormat("vi-VN", { notation: "compact", style: "currency", currency: "VND", maximumFractionDigits: 1 }).format(value);
  const kpis = [
    { label: "Giá trị đơn hàng", value: money(total), mobileValue: compactMoney(total), note: `${valid.length} đơn · Không gồm đơn hủy`, icon: ShoppingBag, href: "/admin/orders", color: "text-blue-brand bg-section-blue" },
    { label: "Chờ xác nhận", value: String(pending), mobileValue: String(pending), note: "Inside Sales xử lý", icon: Clock3, href: `/admin/orders?status=${encodeURIComponent("Chờ xác nhận")}`, color: "text-amber-700 bg-amber-50" },
    { label: "Công nợ hiện tại", value: money(debt), mobileValue: compactMoney(debt), note: `${scopedCustomers.filter((item) => item.overdue > 0).length} khách có nợ quá hạn`, icon: Wallet, href: "/admin/credit", color: "text-emerald-700 bg-emerald-50" },
    { label: "Yêu cầu chờ duyệt", value: String(approvals), mobileValue: String(approvals), note: "Giá và công nợ ngoại lệ", icon: ClipboardCheck, href: "/admin/approvals", color: "text-red-600 bg-red-50" }
  ];
  const queues = [
    { label: "Đơn chờ xác nhận", count: pending, icon: ShoppingBag, href: `/admin/orders?status=${encodeURIComponent("Chờ xác nhận")}` },
    { label: "Đơn chờ soạn hàng", count: warehouseOrders.filter((item) => item.status === "Chờ soạn hàng").length, icon: Clock3, href: `/admin/warehouse?status=${encodeURIComponent("Chờ soạn hàng")}` },
    { label: "Kho báo thiếu hàng", count: warehouseOrders.filter((item) => hasShortage(warehouse[item.id])).length, icon: ClipboardCheck, href: "/admin/warehouse?status=issues" },
    { label: "Khách B2B chờ duyệt", count: scopedCustomers.filter((item) => item.status === "Chờ duyệt").length, icon: UsersRound, href: `/admin/customers?status=${encodeURIComponent("Chờ duyệt")}` },
    { label: "Công nợ quá hạn", count: scopedCustomers.filter((item) => item.overdue > 0).length, icon: Wallet, href: "/admin/credit?status=overdue" }
  ];
  const step = days === 7 ? 1 : 5;
  const periods = Array.from({ length: days === 7 ? 7 : 6 }, (_, index) => {
    const start = dateBefore(days - 1 - index * step, today);
    const end = dateBefore(days - step - index * step, today);
    return { label: adminDate(start).slice(0, 5), start, end, value: valid.filter((item) => item.date >= start && item.date <= end).reduce((sum, item) => sum + item.total, 0) };
  });
  const max = Math.max(...periods.map((item) => item.value), 1);
  return <>
    <AdminHeading title="Tổng quan vận hành" subtitle={`${branch} · ${adminDate(dateBefore(days - 1, today))} - ${adminDate(today)}`} />
    <div className="mb-7 grid grid-cols-2 gap-3 xl:grid-cols-4">{kpis.map(({ label, value, mobileValue, note, icon: Icon, href, color }) => <Link href={href} key={label} className="min-w-0 rounded-md border border-border bg-white p-3 transition-colors hover:border-blue-brand/40 sm:p-4"><div className="flex min-h-8 items-center justify-between gap-2"><span className="text-xs font-medium text-text-secondary">{label}</span><span className={`hidden h-8 w-8 shrink-0 items-center justify-center rounded sm:flex ${color}`}><Icon size={17} /></span></div><p className="mt-2 break-words text-xl font-bold leading-8 tabular-nums text-primary sm:mt-3 sm:text-[25px]"><span className="sm:hidden" title={value}>{mobileValue}</span><span className="hidden sm:inline">{value}</span></p><p className="mt-2 text-xs leading-5 text-text-muted">{note}</p></Link>)}</div>
    <div className="mb-7 grid gap-7 xl:grid-cols-[minmax(0,1.5fr)_minmax(260px,1fr)]">
      <section className="min-w-0 border-y border-border bg-white p-4 sm:p-5" aria-label="Biểu đồ giá trị đơn hàng">
        <div className="flex flex-wrap items-baseline justify-between gap-2"><h2 className="text-sm font-semibold text-primary">Giá trị đơn theo {days === 7 ? "ngày" : "kỳ"}</h2><span className="text-xs text-text-muted">Đơn vị: VNĐ</span></div>
        <p className="mt-2 text-xs text-text-muted">Cao nhất: {money(max === 1 ? 0 : max)}</p>
        <div className="bt-admin-chart mt-4" role="img" aria-label={periods.map((item) => `${item.label}: ${money(item.value)}`).join("; ")}>{periods.map((item) => <div key={item.start} className="bt-admin-chart-column"><div className="bt-admin-chart-track"><div className="bt-admin-chart-bar" style={{ height: `${item.value / max * 100}%` }} title={`${adminDate(item.start)}${step > 1 ? ` - ${adminDate(item.end)}` : ""}: ${money(item.value)}`} /></div><span className="mt-2 text-[11px] text-text-muted">{item.label}</span></div>)}</div>
      </section>
      <section aria-labelledby="admin-queue-title"><h2 id="admin-queue-title" className="mb-3 text-sm font-semibold text-primary">Cần xử lý</h2><div className="divide-y divide-border border-y border-border bg-white">{queues.map(({ label, count, icon: Icon, href }) => <Link href={href} key={label} className="flex min-h-14 items-center gap-3 px-4 py-3 text-sm hover:bg-section-blue"><Icon size={17} className="shrink-0 text-text-muted" /><span className="flex-1 text-primary">{label}</span><strong className="tabular-nums text-blue-brand">{count}</strong><ArrowRight size={15} className="text-text-muted" /></Link>)}</div></section>
    </div>
    <section><div className="mb-3 flex items-center justify-between gap-3"><h2 className="text-sm font-semibold text-primary">Đơn hàng gần đây</h2><Link href="/admin/orders" className="flex items-center gap-1 text-xs font-medium text-blue-brand">Xem tất cả <ArrowRight size={14} /></Link></div><AdminOrderTable orders={scopedOrders.slice(0, 5)} onSelect={setSelected} /></section>
    <AdminOrderDialog id={selected} onClose={() => setSelected(null)} />
  </>;
}

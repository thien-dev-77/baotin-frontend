"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarDays, Download, Eye, Plus } from "lucide-react";
import { Button, Field, Modal, Tabs } from "@/components/ui";
import { useAdmin } from "@/components/admin/admin-provider";
import { AdminHeading, AdminPagination, AdminSearch, AdminStatus, AdminTable, useAdminFilters } from "@/components/admin/admin-ui";
import { AdminReceiptForm } from "@/components/admin/admin-receipt-form";
import { AdminReceiptDetail } from "@/components/admin/admin-receipt-detail";
import { collectible, paymentSummary } from "@/lib/admin-accounting";
import { adminDate, dateBefore, downloadAdminCsv } from "@/lib/admin-preview";
import { money, normalize } from "@/lib/catalog";

export function AdminAccounting() {
  const { branch, days, orders, receipts, paymentDueDates, setPaymentDueDate, today } = useAdmin();
  const [tab, setTab] = useState("Phiếu thu");
  const filters = useAdminFilters();
  const [newOrder, setNewOrder] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [dueOrder, setDueOrder] = useState<string | null>(null);
  const [date, setDate] = useState("");
  const [error, setError] = useState("");
  const collectibleOrders = orders.filter((item) => item.branch === branch && collectible(item));
  const periodReceipts = receipts.filter((item) => item.branch === branch && item.date >= dateBefore(days - 1, today));
  const receiptRows = periodReceipts.filter((item) => normalize(`${item.id} ${item.orderId} ${item.reference} ${orders.find((order) => order.id === item.orderId)?.customerName}`).includes(normalize(filters.query)) && (filters.filter === "all" || item.status === filters.filter)).reverse();
  const orderRows = collectibleOrders.filter((order) => {
    const summary = paymentSummary(order, receipts);
    return summary.remaining > 0 && normalize(`${order.id} ${order.customerName}`).includes(normalize(filters.query)) && (filters.filter === "all" || (filters.filter === "overdue" ? !!paymentDueDates[order.id] && paymentDueDates[order.id] < today : order.credit && !paymentDueDates[order.id]));
  });
  const count = tab === "Phiếu thu" ? receiptRows.length : orderRows.length;
  const page = Math.min(filters.page, Math.max(1, Math.ceil(count / 10)));
  const order = orders.find((item) => item.id === newOrder && item.branch === branch && collectible(item));
  const receipt = receipts.find((item) => item.id === selected && item.branch === branch);
  const due = orders.find((item) => item.id === dueOrder && item.branch === branch && item.credit && collectible(item));
  function changeTab(value: string) { setTab(value); filters.setQuery(""); filters.setFilter("all"); }
  function exportRows() {
    if (tab === "Phiếu thu") downloadAdminCsv("bao-tin-phieu-thu-mau.csv", [["Phiếu thu", "Đơn hàng", "Ngày thu", "Hình thức", "Chứng từ", "Số tiền", "Trạng thái"], ...receiptRows.map((item) => [item.id, item.orderId, item.date, item.method, item.reference, item.amount, item.status])]);
    else downloadAdminCsv("bao-tin-don-can-thu-mau.csv", [["Đơn hàng", "Khách", "Giá trị đơn", "Đã đối chiếu", "Chờ đối chiếu", "Còn phải thu", "Hạn thanh toán"], ...orderRows.map((item) => { const summary = paymentSummary(item, receipts); return [item.id, item.customerName, item.total, summary.paid, summary.pending, summary.remaining, paymentDueDates[item.id] || ""]; })]);
  }
  return <>
    <AdminHeading title="Thu tiền & đối chiếu" subtitle={`${branch} · ${adminDate(today)}`}><Button variant="secondary" disabled={!count} onClick={exportRows}><Download size={16} />Xuất CSV</Button></AdminHeading>
    <dl className="mb-6 grid gap-4 border-y border-border bg-white px-4 py-5 sm:grid-cols-3">{[[`Đã đối chiếu · ${days} ngày`, periodReceipts.filter((item) => item.status === "Đã đối chiếu").reduce((sum, item) => sum + item.amount, 0)], [`Chờ đối chiếu · ${days} ngày`, periodReceipts.filter((item) => item.status === "Chờ đối chiếu").reduce((sum, item) => sum + item.amount, 0)], ["Còn phải thu · tất cả đơn", collectibleOrders.reduce((sum, item) => sum + paymentSummary(item, receipts).remaining, 0)]].map(([label, value]) => <div key={label}><dt className="text-xs text-text-muted">{label}</dt><dd className="mt-2 text-xl font-bold tabular-nums text-primary">{money(Number(value))}</dd></div>)}</dl>
    <div className="mb-4"><Tabs options={["Phiếu thu", "Đơn cần thu"]} value={tab} onChange={changeTab} /></div>
    <div className="mb-4 flex flex-wrap items-center gap-3"><AdminSearch value={filters.query} onChange={filters.setQuery} placeholder="Tìm phiếu, mã đơn, khách, chứng từ..." /><select aria-label="Tình trạng thu tiền" value={filters.filter} onChange={(event) => filters.setFilter(event.target.value)} className="bt-input !w-auto"><option value="all">Tất cả</option>{tab === "Phiếu thu" ? ["Chờ đối chiếu", "Đã đối chiếu", "Đã hủy"].map((status) => <option key={status}>{status}</option>) : <><option value="overdue">Quá hạn</option><option value="missing">Chưa có hạn thanh toán</option></>}</select></div>
    {tab === "Phiếu thu" ? <AdminTable headings={["Phiếu thu / đơn", "Ngày thu", "Hình thức / chứng từ", "Số tiền", "Trạng thái", "Thao tác"]} empty={!receiptRows.length}>{receiptRows.slice((page - 1) * 10, page * 10).map((item) => <tr key={item.id}><td><button className="font-semibold text-blue-brand" onClick={() => setSelected(item.id)}>{item.id}</button><span className="mt-1 block text-xs text-text-muted">{item.orderId}</span></td><td className="whitespace-nowrap">{adminDate(item.date)}</td><td>{item.method}<span className="mt-1 block max-w-48 break-words text-xs text-text-muted">{item.reference}</span></td><td className="whitespace-nowrap font-semibold tabular-nums">{money(item.amount)}</td><td><AdminStatus value={item.status} /></td><td><button className="bt-icon-button" onClick={() => setSelected(item.id)} aria-label={`Xem phiếu ${item.id}`} title="Xem phiếu thu"><Eye size={17} /></button></td></tr>)}</AdminTable> : <AdminTable headings={["Đơn hàng / khách", "Giá trị đơn", "Đã đối chiếu", "Chờ đối chiếu", "Còn phải thu", "Hạn thanh toán", "Thao tác"]} empty={!orderRows.length}>{orderRows.slice((page - 1) * 10, page * 10).map((item) => { const summary = paymentSummary(item, receipts); const dueDate = paymentDueDates[item.id]; return <tr key={item.id}><td><Link href={`/admin/orders?order=${item.id}`} className="font-semibold text-blue-brand">{item.id}</Link><span className="mt-1 block text-xs text-text-muted">{item.customerName}</span></td><td className="whitespace-nowrap tabular-nums">{money(item.total)}</td><td className="whitespace-nowrap tabular-nums">{money(summary.paid)}</td><td className="whitespace-nowrap tabular-nums">{money(summary.pending)}</td><td className="whitespace-nowrap font-semibold tabular-nums">{money(summary.remaining)}</td><td>{dueDate ? <><span className="block whitespace-nowrap">{adminDate(dueDate)}</span>{dueDate < today && <AdminStatus value="Quá hạn" />}</> : <span className="text-xs text-text-muted">{item.credit ? "Chưa thiết lập" : "—"}</span>}</td><td><div className="flex gap-1"><button className="bt-icon-button" disabled={!summary.available} onClick={() => setNewOrder(item.id)} aria-label={`Lập phiếu ${item.id}`} title="Lập phiếu thu"><Plus size={17} /></button>{item.credit && <button className="bt-icon-button" onClick={() => { setDueOrder(item.id); setDate(dueDate || ""); setError(""); }} aria-label={`Hạn thanh toán ${item.id}`} title="Hạn thanh toán"><CalendarDays size={17} /></button>}</div></td></tr>; })}</AdminTable>}
    <AdminPagination count={count} page={page} onChange={filters.setPage} />
    <Modal open={!!order} onClose={() => setNewOrder(null)} title="Lập phiếu thu">{order && <AdminReceiptForm key={order.id} order={order} onSave={() => { setNewOrder(null); changeTab("Phiếu thu"); }} />}</Modal>
    <Modal open={!!receipt} onClose={() => setSelected(null)} title="Chi tiết phiếu thu">{receipt && <AdminReceiptDetail key={receipt.id} receipt={receipt} onClose={() => setSelected(null)} />}</Modal>
    <Modal open={!!due} onClose={() => setDueOrder(null)} title="Hạn thanh toán">{due && <form onSubmit={async (event) => { event.preventDefault(); const result = await setPaymentDueDate(due.id, date); if (result) setError(result); else setDueOrder(null); }}><p className="mb-4 text-sm text-primary">{due.id} · {due.customerName}</p><Field label="Ngày đến hạn" required><input className="bt-input" type="date" min={due.date} required value={date} onChange={(event) => setDate(event.target.value)} /></Field>{error && <p role="alert" className="mt-4 text-sm text-danger">{error}</p>}<div className="mt-5 flex justify-end"><Button type="submit" disabled={!date}><CalendarDays size={16} />Lưu hạn thanh toán</Button></div></form>}</Modal>
  </>;
}

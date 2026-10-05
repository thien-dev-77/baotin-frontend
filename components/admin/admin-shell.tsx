"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogOut, Box, Building2, ClipboardCheck, ExternalLink, LayoutDashboard, Menu, Package, ReceiptText, RotateCcw, ShoppingBag, UsersRound, Wallet, Warehouse } from "lucide-react";
import { Button, Modal } from "@/components/ui";
import { useAdmin } from "@/components/admin/admin-provider";
import { type Branch } from "@/lib/admin-preview";
import { apiMode } from "@/lib/api-client";
import { useCommerce } from "@/components/commerce-provider";

const links = [
  { href: "/admin", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Đơn hàng", icon: ShoppingBag },
  { href: "/admin/warehouse", label: "Kho hàng", icon: Warehouse },
  { href: "/admin/products", label: "Sản phẩm", icon: Package },
  { href: "/admin/customers", label: "Khách hàng B2B", icon: UsersRound },
  { href: "/admin/credit", label: "Công nợ", icon: Wallet },
  { href: "/admin/accounting", label: "Thu tiền & đối chiếu", icon: ReceiptText },
  { href: "/admin/approvals", label: "Yêu cầu duyệt", icon: ClipboardCheck }
];
export function AdminShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { ready, branch, setBranch, days, setDays, scopedApprovals, scopedOrders, warehouseOrders, reset, allowedBranches } = useAdmin();
  const { sessionUser, logout } = useCommerce();
  const [menu, setMenu] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const active = (href: string) => path === href || (href !== "/admin" && path.startsWith(`${href}/`));
  const page = links.find((item) => active(item.href))?.label || "Quản trị";
  const navigation = <nav aria-label="Quản trị nội bộ" className="space-y-1">
    {links.filter((item) => !apiMode || sessionUser?.role !== "warehouse" || item.href === "/admin/warehouse").map(({ href, label, icon: Icon }) => {
      const count = href === "/admin/approvals" ? scopedApprovals.filter((item) => item.status === "Chờ duyệt").length : href === "/admin/orders" ? scopedOrders.filter((item) => item.status === "Chờ xác nhận").length : href === "/admin/warehouse" ? warehouseOrders.length : 0;
      return <Link key={href} href={href} aria-current={active(href) ? "page" : undefined} onClick={() => setMenu(false)} className={`flex min-h-11 items-center gap-3 rounded-md px-3 text-sm ${active(href) ? "bg-section-blue font-semibold text-blue-brand" : "text-text-secondary hover:bg-section"}`}>
        <Icon size={18} aria-hidden="true" /><span className="flex-1">{label}</span>{count > 0 && <span className="min-w-5 rounded bg-white px-1.5 text-center text-xs text-blue-brand">{count}</span>}
      </Link>;
    })}
  </nav>;
  return <div className="bt-admin">
    <a href="#admin-content" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:bg-white focus:p-3">Đến nội dung</a>
    <aside className="bt-admin-sidebar">
      <Link href="/admin" aria-label="Bảo Tín quản trị" className="flex items-center gap-2.5 px-2 py-1"><span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-white"><Box size={23} /></span><span><strong className="block text-xl text-primary">BẢO TÍN</strong><span className="text-xs text-text-secondary">Quản trị nội bộ</span></span></Link>
      <p className="mb-2 mt-8 px-3 text-xs font-medium text-text-muted">VẬN HÀNH</p>
      {navigation}
      <div className="mt-auto border-t border-border pt-4"><Link href="/" className="flex items-center gap-3 rounded-md px-3 py-3 text-sm text-text-secondary hover:bg-section"><ExternalLink size={17} />Website bán hàng</Link><p className="px-3 py-2 text-xs text-text-muted">Bảo Tín · B2B & B2C</p></div>
    </aside>
    <div className="bt-admin-workspace">
      <header className="bt-admin-topbar">
        <div className="flex min-w-0 items-center gap-2"><button type="button" className="bt-icon-button lg:hidden" title="Menu quản trị" aria-label="Mở menu quản trị" onClick={() => setMenu(true)}><Menu size={20} /></button><span className="hidden text-xs text-text-muted sm:inline">Quản trị /</span><span className="truncate text-sm font-semibold text-primary">{page}</span></div>
        <div className="flex shrink-0 items-center gap-3"><span className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-800">Dữ liệu mẫu</span><button type="button" className="bt-icon-button" aria-label="Đăng xuất" title={sessionUser?.name || "Đăng xuất"} onClick={logout}><LogOut size={16} /></button><span title="Quản trị viên" className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">BT</span></div>
      </header>
      <div className="bt-admin-scope">
        <label className="flex items-center gap-2 text-sm text-text-secondary"><Building2 size={16} /><span className="sr-only">Chi nhánh</span><select aria-label="Chi nhánh" value={branch} onChange={(event) => setBranch(event.target.value as Branch)} className="bt-input !h-9 !w-auto !pr-7">{allowedBranches.map((item) => <option key={item}>{item}</option>)}</select></label>
        {path === "/admin/warehouse" ? <span className="text-xs text-text-secondary">Đơn chưa bàn giao</span> : <label><span className="sr-only">Kỳ báo cáo</span><select aria-label="Kỳ báo cáo" title="Kỳ báo cáo" value={days} onChange={(event) => setDays(Number(event.target.value))} className="bt-input !h-9 !w-auto"><option value={7}>7 ngày</option><option value={30}>30 ngày</option></select></label>}
        <span className="ml-auto hidden text-xs text-text-muted md:block">Chưa kết nối KiotViet</span>
        <button type="button" onClick={() => { if (apiMode) void reset(); else setConfirmReset(true); }} aria-label={apiMode ? "Làm mới dữ liệu" : "Khôi phục dữ liệu mẫu"} title={apiMode ? "Làm mới dữ liệu" : "Khôi phục dữ liệu mẫu"} className="bt-icon-button"><RotateCcw size={16} /></button>
      </div>
      <main id="admin-content" className="bt-admin-content" aria-busy={!ready}>
        {ready ? (apiMode && sessionUser?.role === "warehouse" && !path.startsWith("/admin/warehouse") ? <Link href="/admin/warehouse" className="bt-button-primary">Mở kho hàng</Link> : children) : <div role="status" className="py-20 text-center text-sm text-text-secondary">Đang tải dữ liệu mẫu...</div>}
      </main>
    </div>
    <Modal open={menu} onClose={() => setMenu(false)} title="Bảo Tín · Quản trị" drawer>{navigation}<Link href="/" onClick={() => setMenu(false)} className="mt-4 flex items-center gap-2 border-t border-border py-4 text-sm text-blue-brand"><ExternalLink size={16} />Website bán hàng</Link></Modal>
    <Modal open={confirmReset} onClose={() => setConfirmReset(false)} title="Khôi phục dữ liệu mẫu"><p className="mb-5 text-sm leading-6 text-text-secondary">Các thay đổi đơn hàng, yêu cầu duyệt và trạng thái trong bản quản trị mẫu sẽ được khôi phục. Giỏ hàng và tài khoản khách B2B không bị ảnh hưởng.</p><div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setConfirmReset(false)}>Hủy</Button><Button onClick={() => { reset(); setConfirmReset(false); }}><RotateCcw size={16} />Khôi phục</Button></div></Modal>
  </div>;
}

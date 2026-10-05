"use client";
import { useCommerce } from "@/components/commerce-provider";
import { CommerceLoading } from "@/components/checkout-flow";
import { Breadcrumb, Button, EmptyState, Modal } from "@/components/ui";
import { Building2, ClipboardList, Heart, LayoutDashboard, LogOut, MapPin, Menu, Package, Settings, UserRound, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const navigation = [
  { href: "/account", label: "Tổng quan", icon: LayoutDashboard }, { href: "/account/orders", label: "Đơn hàng", icon: ClipboardList },
  { href: "/account/products", label: "Sản phẩm thường mua", icon: Package }, { href: "/account/favorites", label: "Danh sách yêu thích", icon: Heart },
  { href: "/account/company", label: "Thông tin công ty", icon: Building2 }, { href: "/account/addresses", label: "Địa chỉ giao hàng", icon: MapPin },
  { href: "/account/credit", label: "Công nợ", icon: Wallet }, { href: "/account/settings", label: "Cài đặt", icon: Settings }
];
export function AccountShell({ children }: { children: React.ReactNode }) {
  const { customer, ready, logout } = useCommerce();
  const path = usePathname(); const router = useRouter(); const [drawer, setDrawer] = useState(false);
  if (!ready) return <CommerceLoading />;
  if (!customer) return <main className="bt-container bt-page"><Breadcrumb items={[{ label: "Tài khoản B2B" }]} /><EmptyState icon={<UserRound size={38} />} title="Đăng nhập tài khoản B2B" description="Xem giá dành cho đối tác, lịch sử đơn hàng và thông tin công nợ." href={`/login?next=${encodeURIComponent(path)}`} action="Đăng nhập B2B" /></main>;
  const menu = <nav className="space-y-1" aria-label="Tài khoản B2B">{navigation.map(({ href, label, icon: Icon }) => <Link href={href} key={href} onClick={() => setDrawer(false)} aria-current={path === href || (href !== "/account" && path.startsWith(href + "/")) ? "page" : undefined} className={`flex items-center gap-3 rounded-md px-3 py-3 text-sm ${path === href || (href !== "/account" && path.startsWith(href + "/")) ? "bg-section-blue font-semibold text-blue-brand" : "text-text-secondary hover:bg-section"}`}><Icon size={18} />{label}</Link>)}<button className="flex w-full items-center gap-3 border-t border-border px-3 py-3 text-sm text-text-secondary" onClick={() => { logout(); router.push("/login"); }}><LogOut size={18} />Đăng xuất</button></nav>;
  return <main className="bt-container bt-page"><Breadcrumb items={[{ label: "Tài khoản B2B", href: path === "/account" ? undefined : "/account" }, ...(path === "/account" ? [] : [{ label: navigation.find((item) => path.startsWith(item.href) && item.href !== "/account")?.label || "Chi tiết đơn hàng" }])]} /><Button variant="secondary" className="mb-4 lg:hidden" onClick={() => setDrawer(true)}><Menu size={18} />Menu tài khoản</Button><div className="grid items-start gap-6 lg:grid-cols-[225px_minmax(0,1fr)]"><aside className="hidden border-r border-border pr-5 lg:block"><div className="mb-5 flex items-center gap-3 px-2"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-section-blue text-blue-brand"><Building2 size={20} /></div><div className="min-w-0"><p className="truncate text-sm font-semibold text-primary">{customer.company}</p><p className="text-xs text-text-muted">Khách hàng B2B</p></div></div>{menu}</aside><div className="min-w-0">{children}</div></div><Modal open={drawer} onClose={() => setDrawer(false)} title="Tài khoản B2B" drawer>{menu}</Modal></main>;
}

"use client";
import { CategoryMenu } from "@/components/category-menu";
import { Logo } from "@/components/logo";
import { SearchBox } from "@/components/search-box";
import { Modal } from "@/components/ui";
import { useCommerce } from "@/components/commerce-provider";
import { categoryCatalog } from "@/lib/catalog";
import { heroActions, trustBadges } from "@/lib/home-data";
import { Heart, Menu, ShoppingCart, ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type HeaderService = { title: string; description: string; href: string; icon: LucideIcon };

function HeaderServiceLink({ action, compact = false, accent = false }: { action: HeaderService; compact?: boolean; accent?: boolean }) {
  const Icon = action.icon;
  return <Link href={action.href} aria-label={action.title} title={`${action.title} - ${action.description}`} className={`bt-header-service-link${compact ? " bt-header-service-link--compact" : ""}${accent ? " bt-header-service-link--accent" : ""}`}>
    <Icon size={compact ? 16 : 20} strokeWidth={1.8} aria-hidden="true" />
    <span className="bt-header-service-copy"><span className="bt-header-service-title">{action.title}</span><span className="bt-header-service-description">{action.description}</span></span>
  </Link>;
}

export function SiteHeader() {
  const { cart, customer, ready } = useCommerce();
  const [mobile, setMobile] = useState(false);
  const count = cart.reduce((sum, line) => sum + line.quantity, 0);
  const services = heroActions.map((action) => action.primary ? { ...action, title: customer ? "Tài khoản B2B" : action.title, href: customer ? "/account" : action.href } : action);
  const actions = [
    { label: "Giỏ hàng", href: "/cart", icon: ShoppingCart },
    { label: "Yêu thích", href: "/wishlist", icon: Heart }
  ];
  return <>
    <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-white focus:p-3">Đến nội dung chính</a>
    <header aria-busy={!ready} className="sticky top-0 z-40 border-b border-border bg-white">
      <div className="bt-header-promises"><div className="bt-container">{trustBadges.map(({ label, icon: Icon }) => <span key={label}><Icon size={13} strokeWidth={1.8} aria-hidden="true" />{label}</span>)}</div></div>
      <div className="border-b border-border"><div className="bt-container flex h-16 items-center gap-4">
        <Link href="/" aria-label="Bảo Tín - Trang chủ" className="shrink-0"><Logo /></Link>
        <div className="hidden min-w-0 flex-1 lg:block"><SearchBox compactButton /></div>
        <nav aria-label="Tài khoản và hỗ trợ" className="ml-auto hidden items-center gap-3 lg:flex">
          <HeaderServiceLink action={services[0]} />
          <HeaderServiceLink action={services[2]} />
          {actions.map(({ label, href, icon: Icon }) => <Link key={href} href={href} title={label} className="relative flex shrink-0 flex-col items-center gap-0.5 text-[11px] font-medium text-primary hover:text-blue-brand"><Icon size={21} strokeWidth={1.8} aria-hidden="true" /><span>{label}</span>{href === "/cart" && count > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-bold text-white">{count}</span>}</Link>)}
          <HeaderServiceLink action={services[1]} accent />
        </nav>
        <div className="ml-auto flex items-center gap-3 lg:hidden"><Link href="/cart" aria-label={`Giỏ hàng, ${count} sản phẩm`} className="relative bt-icon-button"><ShoppingCart size={23} />{count > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[9px] text-white">{count}</span>}</Link><button className="bt-icon-button border border-border" onClick={() => setMobile(true)} aria-label="Mở menu"><Menu size={21} /></button></div>
      </div><div className="bt-container lg:hidden"><SearchBox compactButton /><nav aria-label="Liên kết nhanh" className="bt-header-mobile-services">{services.map((action) => <HeaderServiceLink key={action.href} action={action} compact />)}</nav></div></div>
      <div className="hidden lg:block"><div className="bt-container flex h-10 items-center gap-4"><CategoryMenu /><nav aria-label="Danh mục sản phẩm" className="scrollbar-hide flex min-w-0 flex-1 items-center gap-4 overflow-x-auto">{categoryCatalog.map((category) => <Link key={category.slug} href={`/category/${category.slug}`} className="shrink-0 whitespace-nowrap text-xs font-medium text-primary hover:text-blue-brand">{category.name}</Link>)}</nav><Link className="shrink-0 text-xs font-medium text-primary" href="/brand/hafele">Thương hiệu</Link><Link className="shrink-0 text-xs font-semibold text-danger" href="/promotions">Khuyến mãi</Link></div></div>
    </header>
    <Modal open={mobile} onClose={() => setMobile(false)} title="Danh mục & tài khoản" drawer><nav className="space-y-1">{categoryCatalog.map((category) => <Link onClick={() => setMobile(false)} key={category.slug} href={`/category/${category.slug}`} className="flex items-center justify-between border-b border-border py-3 text-sm"><span>{category.name}</span><ChevronRight size={16} /></Link>)}{[...services.map((action) => ({ label: action.title, href: action.href })), ...actions, { label: "Khuyến mãi", href: "/promotions" }, { label: "Hướng dẫn chọn sản phẩm", href: "/guides" }, { label: "Liên hệ", href: "/contact" }].map((item) => <Link key={item.href} href={item.href} onClick={() => setMobile(false)} className="block py-3 text-sm font-semibold text-primary">{item.label}</Link>)}</nav></Modal>
  </>;
}

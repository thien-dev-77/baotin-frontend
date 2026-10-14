"use client";
import { CategoryMenu } from "@/components/category-menu";
import { Logo } from "@/components/logo";
import { SearchBox } from "@/components/search-box";
import { Modal } from "@/components/ui";
import { useCommerce } from "@/components/commerce-provider";
import { heroActions } from "@/lib/home-data";
import { BadgeCheck, FileText, Headset, Heart, Menu, Phone, ShieldCheck, ShoppingCart, UserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { NotificationBell } from "./notifications";
import { CategoryLinks } from "./category-links";
import { ZaloIcon } from "./zalo-icon";
import { slugify } from "@/lib/catalog";
import { storeContact } from "@/lib/store-contact";
import { usePathname } from "next/navigation";

type HeaderService = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  isZalo?: boolean;
};

const quoteAction: HeaderService = {
  title: "Nhận báo giá",
  description: "B2B & B2C",
  href: storeContact.zaloHref,
  icon: FileText,
};

const utilityLinks = [
  { label: "Hỗ trợ B2B", href: "/contact#consultation", icon: Headset },
  { label: "Tài liệu kỹ thuật", href: "/guides", icon: FileText },
  { label: "Chính sách B2B", href: "/policies/cong-no", icon: BadgeCheck },
];

function CartBadge({ count }: { count: number }) {
  return <span aria-hidden="true" className="bt-header-cart-badge">{count > 99 ? "99+" : count}</span>;
}

function HeaderServiceLink({
  action,
  compact = false,
  textLink = false,
}: {
  action: HeaderService;
  compact?: boolean;
  textLink?: boolean;
}) {
  const Icon = action.icon;
  return (
    <Link
      href={action.href}
      prefetch={false}
      target={action.href === storeContact.zaloHref ? "_blank" : undefined}
      rel={action.href === storeContact.zaloHref ? "noopener noreferrer" : undefined}
      aria-label={action.title}
      title={`${action.title} - ${action.description}`}
      className={`bt-header-service-link${compact ? " bt-header-service-link--compact" : ""}${textLink ? " bt-header-service-link--text" : ""}${action.isZalo ? " bt-header-service-link--zalo" : ""}`}
    >
      {action.isZalo ? <ZaloIcon size={compact ? 20 : 24} /> : <Icon size={compact ? 16 : 20} strokeWidth={1.8} aria-hidden="true" />}
      <span className="bt-header-service-copy">
        <span className="bt-header-service-title">{action.title}</span>
        <span className="bt-header-service-description">
          {action.description}
        </span>
      </span>
    </Link>
  );
}

export function SiteHeader() {
  const { cart, customer, ready, brands } = useCommerce();
  const pathname = usePathname();
  const [mobile, setMobile] = useState(false);
  const count = cart.reduce((sum, line) => sum + line.quantity, 0);
  const services = heroActions.map((action) =>
    action.primary
      ? {
          ...action,
          title: customer ? "Tài khoản B2B" : action.title,
          href: customer ? "/account" : action.href,
        }
      : action,
  );
  const actions = [
    { label: customer ? "Tài khoản" : "Đăng nhập", accessibleName: services[0].title, href: services[0].href, icon: UserRound },
    { label: "Yêu thích", accessibleName: "Yêu thích", href: "/wishlist", icon: Heart },
    { label: "Giỏ hàng", accessibleName: `Giỏ hàng, ${count} sản phẩm`, href: "/cart", icon: ShoppingCart },
  ];
  const navigation = [
    { label: "Sản phẩm", href: "/catalog" },
    { label: "Đặt hàng B2B", href: "/account/products" },
    { label: "Thương hiệu", href: brands.length ? `/brand/${slugify(brands[0])}` : "/catalog" },
    { label: "Khuyến mãi", href: "/promotions" },
    { label: "Tài liệu kỹ thuật", href: "/guides" },
    { label: "Liên hệ", href: "/contact" },
  ];
  const quickServices = [services[0], quoteAction, services[1]];
  // Keep both Zalo actions in the drawer even though they share the same URL.
  const drawerLinks = Array.from(new Map([
    ...actions, ...services.map(action => ({ label: action.title, href: action.href })),
    { label: quoteAction.title, href: quoteAction.href }, ...navigation,
    { label: "Chính sách B2B", href: "/policies/cong-no" },
  ].map(item => [item.href === storeContact.zaloHref ? `${item.href}#${item.label}` : item.href, item])).values());
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-white focus:p-3"
      >
        Đến nội dung chính
      </a>
      <header
        aria-busy={!ready}
        className="bt-site-header sticky top-0 z-40 border-b border-border bg-white"
      >
        <div className="bt-header-promises">
          <div className="bt-container bt-header-top-row">
            <p className="bt-header-tagline"><ShieldCheck size={14} strokeWidth={1.8} aria-hidden="true" /><span>Hệ thống phân phối thiết bị bếp & phụ kiện nội thất</span></p>
            <nav className="bt-header-utilities" aria-label="Hỗ trợ khách hàng">
              {utilityLinks.map(({ label, href, icon: Icon }) => <Link key={href} href={href} prefetch={false} className="bt-header-utility-link"><Icon size={14} strokeWidth={1.8} aria-hidden="true" />{label}</Link>)}
              <HeaderServiceLink action={services[1]} compact />
            </nav>
          </div>
        </div>
        <div className="border-b border-border">
          <div className="bt-container bt-header-main-row">
            <Link
              href="/"
              aria-label="Bảo Tín - Trang chủ"
              className="bt-header-brand"
            >
              <Logo sizes="(min-width: 1280px) 220px, (max-width: 639px) 152px, 192px" />
            </Link>
            <div className="bt-header-desktop-search">
              <SearchBox compactButton iconButton />
            </div>
            <nav
              aria-label="Tài khoản và hỗ trợ"
              className="bt-header-account-nav"
            >
              {actions.map(({ label, accessibleName, href, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  prefetch={false}
                  aria-label={accessibleName}
                  title={label}
                  className="bt-header-account-link"
                >
                  <Icon size={24} strokeWidth={1.8} aria-hidden="true" />
                  <span>{label}</span>
                  {href === "/cart" && <CartBadge count={count} />}
                </Link>
              ))}
              <NotificationBell withLabel />
            </nav>
            <div className="ml-auto flex items-center gap-3 lg:hidden">
              <NotificationBell />
              <Link
                href="/cart"
                prefetch={false}
                aria-label={`Giỏ hàng, ${count} sản phẩm`}
                className="relative bt-icon-button"
              >
                <ShoppingCart size={23} />
                <CartBadge count={count} />
              </Link>
              <button
                className="bt-icon-button border border-border"
                onClick={() => setMobile(true)}
                aria-label="Mở menu"
              >
                <Menu size={21} />
              </button>
            </div>
          </div>
          <div className="bt-container lg:hidden">
            <SearchBox compactButton iconButton />
            <nav
              aria-label="Liên kết nhanh"
              className="bt-header-mobile-services"
            >
              {quickServices.map((action) => (
                <HeaderServiceLink key={action.href} action={action} compact textLink={action === quoteAction} />
              ))}
            </nav>
          </div>
        </div>
        <div className="hidden lg:block">
          <div className="bt-container bt-header-navigation-row">
            <CategoryMenu />
            <nav
              aria-label="Điều hướng chính"
              className="bt-header-navigation scrollbar-hide"
            >
              {navigation.map(({ label, href }) => (
                <Link
                  key={label}
                  href={href}
                  prefetch={false}
                  aria-current={pathname === href ? "page" : undefined}
                  className="bt-header-nav-link"
                >
                  {label}
                </Link>
              ))}
            </nav>
            <HeaderServiceLink action={quoteAction} textLink />
            <a href={storeContact.phoneHref} className="bt-header-hotline"><Phone size={15} strokeWidth={1.8} aria-hidden="true" /><span>Hotline: <strong>{storeContact.displayPhone}</strong></span></a>
          </div>
        </div>
      </header>
      <Modal
        open={mobile}
        onClose={() => setMobile(false)}
        title="Danh mục & tài khoản"
        drawer
      >
        <nav className="space-y-1">
          <CategoryLinks onNavigate={() => setMobile(false)} />
          {drawerLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              onClick={() => setMobile(false)}
              target={item.href === storeContact.zaloHref ? "_blank" : undefined}
              rel={item.href === storeContact.zaloHref ? "noopener noreferrer" : undefined}
              className="block py-3 text-sm font-semibold text-primary"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </Modal>
    </>
  );
}

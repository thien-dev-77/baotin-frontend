import { ArrowRight, BadgePercent, Boxes, ChevronRight, Menu } from "lucide-react";
import Link from "next/link";
import { CategoryLinks } from "@/components/category-links";

const shortcuts = [
  { label: "Khuyến mãi", icon: BadgePercent, href: "/promotions" },
  { label: "Sản phẩm bán chạy", icon: Boxes, href: "/search" },
];

export function HomeCategorySidebar() {
  return <aside className="bt-home-category-sidebar" aria-labelledby="home-categories-title">
    <div className="bt-home-category-heading">
      <Menu size={17} strokeWidth={1.8} aria-hidden="true" />
      <h2 id="home-categories-title">Danh mục sản phẩm</h2>
    </div>
    <nav aria-label="Danh mục bên cạnh banner" className="bt-home-category-links">
      <CategoryLinks flyout />
    </nav>
    <div className="bt-home-category-shortcuts">
      {shortcuts.map(({ label, icon: Icon, href }) => <Link key={href} href={href} prefetch={false} className="bt-category-item">
        <Icon size={21} strokeWidth={1.7} aria-hidden="true" className="bt-category-icon" />
        <span>{label}</span>
        <ChevronRight size={16} strokeWidth={1.7} aria-hidden="true" className="bt-category-chevron" />
      </Link>)}
    </div>
    <Link href="/categories" prefetch={false} className="bt-home-category-all">Xem tất cả danh mục<ArrowRight size={16} aria-hidden="true" /></Link>
  </aside>;
}

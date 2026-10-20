import { ArrowRight, Menu } from "lucide-react";
import Link from "next/link";
import { CategoryLinks } from "@/components/category-links";

export function HomeCategorySidebar() {
  return <aside className="bt-home-category-sidebar" aria-labelledby="home-categories-title">
    <div className="bt-home-category-heading">
      <Menu size={17} strokeWidth={1.8} aria-hidden="true" />
      <h2 id="home-categories-title">Danh mục sản phẩm</h2>
    </div>
    <nav aria-label="Danh mục bên cạnh banner" className="bt-home-category-links">
      <CategoryLinks flyout />
    </nav>
    <Link href="/categories" prefetch={false} className="bt-home-category-all">Xem tất cả danh mục<ArrowRight size={16} aria-hidden="true" /></Link>
  </aside>;
}

import { Menu } from "lucide-react";
import { CategoryLinks } from "@/components/category-links";

export function HomeCategorySidebar() {
  return <aside className="bt-home-category-sidebar" aria-labelledby="home-categories-title">
    <div className="bt-home-category-heading">
      <Menu size={17} strokeWidth={1.8} aria-hidden="true" />
      <h2 id="home-categories-title">Danh mục sản phẩm</h2>
    </div>
    <nav aria-label="Danh mục bên cạnh banner" className="bt-home-category-links">
      <CategoryLinks />
    </nav>
  </aside>;
}

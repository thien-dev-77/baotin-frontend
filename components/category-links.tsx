"use client";

import { Cable, ChevronRight, CookingPot, DoorOpen, Grip, Lightbulb, Package, Rows3, Shirt, Wrench, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCommerce } from "./commerce-provider";

const categoryIcons: Record<string, LucideIcon> = { "phu-kien-bep": CookingPot, "led-tu-ke": Lightbulb, "ray-truot": Rows3, "ban-le": DoorOpen, "tay-nam": Grip, khoa: Cable, "phu-kien-tu-ao": Shirt, "phu-kien-lap-dat": Wrench };

export function CategoryLinks({ menu = false, onNavigate }: { menu?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const { categories } = useCommerce();

  return <>{categories.map((category) => {
    const Icon = categoryIcons[category.slug] || Package;
    const href = `/category/${category.slug}`;
    return <Link key={category.slug} role={menu ? "menuitem" : undefined} tabIndex={menu ? -1 : undefined} prefetch={false} href={href} aria-current={pathname === href ? "page" : undefined} className="bt-category-item" onClick={onNavigate}>
      <Icon size={21} strokeWidth={1.7} aria-hidden="true" className="bt-category-icon" />
      <span>{category.name}</span>
      <ChevronRight size={16} strokeWidth={1.7} aria-hidden="true" className="bt-category-chevron" />
    </Link>;
  })}</>;
}

"use client";

import { Cable, ChevronRight, CookingPot, DoorOpen, Grip, Lightbulb, Rows3, Shirt, Wrench } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { categoryCatalog } from "@/lib/catalog";

const categoryIcons = [CookingPot, Lightbulb, Rows3, DoorOpen, Grip, Cable, Shirt, Wrench];

export function CategoryLinks({ menu = false, onNavigate }: { menu?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();

  return <>{categoryCatalog.map((category, index) => {
    const Icon = categoryIcons[index];
    const href = `/category/${category.slug}`;
    return <Link key={category.slug} role={menu ? "menuitem" : undefined} tabIndex={menu ? -1 : undefined} prefetch={false} href={href} aria-current={pathname === href ? "page" : undefined} className="bt-category-item" onClick={onNavigate}>
      <Icon size={21} strokeWidth={1.7} aria-hidden="true" className="bt-category-icon" />
      <span>{category.name}</span>
      <ChevronRight size={16} strokeWidth={1.7} aria-hidden="true" className="bt-category-chevron" />
    </Link>;
  })}</>;
}

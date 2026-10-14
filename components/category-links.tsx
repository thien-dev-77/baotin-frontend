"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCommerce } from "./commerce-provider";
import { useState } from "react";
import { categoryRoots, MAX_CATEGORY_DEPTH } from "@/lib/category-tree";
import type { Category } from "@/lib/types";
import { CategoryIcon } from "./category-icon";
import { CategoryFlyoutLinks } from "./category-flyout-links";

const CATEGORY_PREVIEW_ITEMS = 2;

export function CategoryLinks({ menu = false, flyout = false, showChildPreview = false, onNavigate }: { menu?: boolean; flyout?: boolean; showChildPreview?: boolean; onNavigate?: () => void }) {
  const { categories } = useCommerce();
  if (flyout) return <CategoryFlyoutLinks categories={categories} showChildPreview={showChildPreview} onNavigate={onNavigate} />;
  return <>{categoryRoots(categories).map(category => <CategoryBranch key={category.slug} category={category} categories={categories} depth={0} menu={menu} showChildPreview={showChildPreview} onNavigate={onNavigate} />)}</>;
}

function CategoryBranch({ category, categories, depth, menu, showChildPreview = false, onNavigate }: { category: Category; categories: Category[]; depth: number; menu?: boolean; showChildPreview?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const children = depth + 1 < MAX_CATEGORY_DEPTH ? categories.filter(item => item.parentSlug === category.slug) : [];
  const previewNames = showChildPreview && !depth && !expanded ? (children.length ? children.map(child => child.name) : category.subcategories).filter(name => name.trim()) : [];
  return <div className="bt-category-branch">
    <div className="flex items-center">
      <Link role={menu ? "menuitem" : undefined} tabIndex={menu ? -1 : undefined} prefetch={false} href={`/category/${category.slug}`} aria-current={pathname === `/category/${category.slug}` ? "page" : undefined} className={`bt-category-item min-w-0 flex-1${depth ? " bt-category-child-link" : ""}`} onClick={onNavigate} onKeyDown={event => {
        if (event.key === "ArrowRight" && children.length) { event.preventDefault(); setExpanded(true); }
        if (event.key === "ArrowLeft") { event.preventDefault(); setExpanded(false); }
      }}>
        {!depth && <CategoryIcon slug={category.slug} />}
        <span>{category.name}</span>
        {!children.length && <ChevronRight size={16} strokeWidth={1.7} aria-hidden="true" className="bt-category-chevron" />}
      </Link>
      {!!children.length && <button type="button" role={menu ? "menuitem" : undefined} tabIndex={menu ? -1 : undefined} aria-expanded={expanded} aria-label={`${expanded ? "Thu gọn" : "Mở"} danh mục con ${category.name}`} title={`${expanded ? "Thu gọn" : "Mở"} danh mục con`} className="bt-icon-button shrink-0" onClick={() => setExpanded(!expanded)}><ChevronRight size={16} className={expanded ? "rotate-90" : ""} aria-hidden="true" /></button>}
    </div>
    {previewNames.length > 0 && <p className="bt-home-category-preview" title={previewNames.join(", ")}>{previewNames.slice(0, CATEGORY_PREVIEW_ITEMS).join(" · ")}</p>}
    {expanded && <div className="bt-category-tree-children">{children.map(child => <CategoryBranch key={child.slug} category={child} categories={categories} depth={depth + 1} menu={menu} onNavigate={onNavigate} />)}</div>}
  </div>;
}

import type { Category } from "./types";

export const MAX_CATEGORY_DEPTH = 4;

export function categoryTrail(categories: readonly Category[], slug: string): Category[] {
  const bySlug = new Map(categories.map(category => [category.slug, category]));
  const trail: Category[] = [];
  const seen = new Set<string>();
  let current = bySlug.get(slug);
  while (current) {
    if (seen.has(current.slug)) return [];
    seen.add(current.slug); trail.unshift(current);
    if (!current.parentSlug) return trail;
    current = bySlug.get(current.parentSlug);
  }
  return [];
}

export function categoryDescendants(categories: readonly Category[], slug: string): string[] {
  const result = new Set([slug]);
  const pending = [slug];
  for (let index = 0; index < pending.length; index++) {
    for (const category of categories) {
      if (category.parentSlug !== pending[index] || result.has(category.slug)) continue;
      result.add(category.slug); pending.push(category.slug);
    }
  }
  return Array.from(result);
}

export const categoryRoots = (categories: readonly Category[]) => categories.filter(category => !category.parentSlug);
export const categoryLabel = (categories: readonly Category[], slug: string) => categoryTrail(categories, slug).map(category => category.name).join(" / ");

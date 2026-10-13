import type { Category, Product } from "./types";
import { categoryTrail } from "./category-tree";

export const HOME_SHOWCASE_LIMIT = 10;

export function homeShowcaseProducts(products: Product[], categories: Category[]) {
  const representatives = new Map<string, Product>();
  for (const product of products) {
    const trail = categoryTrail(categories, product.category);
    if (!product.name.trim() || !product.image || product.price <= 0 || !trail.length || trail.some(category => category.visible === false)) continue;
    const group = product.variantGroupId || product.id;
    const previous = representatives.get(group);
    if (!previous || Number(product.featured) > Number(previous.featured) || product.featured === previous.featured && product.id === group) representatives.set(group, product);
  }
  const groups = new Map<string, Product[]>();
  for (const product of Array.from(representatives.values())) {
    const root = categoryTrail(categories, product.category)[0].slug;
    const group = groups.get(root) || [];
    group.push(product);
    groups.set(root, group);
  }
  const recommended: Product[] = [];
  const queues = Array.from(groups.values());
  for (let index = 0; recommended.length < HOME_SHOWCASE_LIMIT && queues.some(queue => queue.length > index); index++) {
    for (const queue of queues) {
      if (queue[index]) recommended.push(queue[index]);
      if (recommended.length === HOME_SHOWCASE_LIMIT) break;
    }
  }
  const selected = Array.from(representatives.values()).filter(product => product.featured).slice(0, HOME_SHOWCASE_LIMIT);
  return { featured: selected.length ? selected : recommended, recommended };
}

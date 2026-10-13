import type { Category } from "./types";

export type AdminCategory = Category & {
  visible: boolean;
  sortOrder: number;
  revision: number;
  productCount: number;
};
export type CategoryDirectory = { items: AdminCategory[] };
export const MAX_BULK_CATEGORIES = 500;
export type SelectedCategory = Pick<AdminCategory, "slug" | "revision" | "name">;
export type CategoryBulkResult = { updated: number; visible: boolean; categories: { slug: string; revision: number; visible: boolean }[] };

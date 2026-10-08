import type { Category } from "./types";

export type AdminCategory = Category & {
  visible: boolean;
  sortOrder: number;
  revision: number;
  productCount: number;
};
export type CategoryDirectory = { items: AdminCategory[] };

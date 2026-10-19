import type { AdminApproval, AdminCustomer, AdminOrder, Category, Order, Product, SessionUser } from "./types";
import type { WarehouseRecord } from "./admin-warehouse";
import type { Receipt } from "./admin-accounting";
import type { CustomerDirectory } from "./customer-management";
import type { ProductFacetQuery } from "./product-filter-attributes";

export type AdminBrowseResource = "products" | "orders" | "customers" | "approvals" | "receipts" | "warehouse";
export type AdminPageInfo = { resource: AdminBrowseResource; total: number; page: number; pageSize: number; totalPages: number; ids: string[] };
export type AdminBrowsePage = Partial<ApiAdminState> & { pagination: AdminPageInfo; brands?: string[]; directory?: CustomerDirectory; summary?: { debt: number; overdue: number; overLimit: number }; warehouseSummary?: { total: number; waiting: number; picking: number; ready: number; issues: number } };
export type AdminDashboardSummary = {
  today: string; since: string; days: number; recentOrders: AdminOrder[];
  periods: { start: string; end: string; value: number }[];
  metrics: { total: number; validOrders: number; pendingOrders: number; approvals: number; debt: number; overdueCustomers: number; pendingCustomers: number; warehouseWaiting: number; shortages: number };
};

export type ApiAdminState = {
  products: (Product & { published: boolean; revision?: number })[]; customers: AdminCustomer[];
  categories?: Category[];
  orders: AdminOrder[]; approvals: AdminApproval[]; warehouse: Record<string, WarehouseRecord>;
  receipts: Receipt[]; paymentDueDates: Record<string, string>; today: string;
  stockByBranch?: Record<string, Record<string, number>>;
};
export type ApiSession = { user: SessionUser | null };
export type CatalogResponse = { products: Product[]; categories: Category[]; brands?: string[] };
export type CatalogFacets = Record<"brand" | "material" | "color" | "size" | "origin", string[]> & Partial<Record<ProductFacetQuery, string[]>>;
export type CatalogPageResponse = CatalogResponse & { total: number; page: number; pageSize: number; totalPages: number; facets: CatalogFacets };
export type CheckoutDraft = {
  items: { productId: string; quantity: number }[];
  customer: Order["customer"]; delivery: string; payment: string; note: string; coupon: string; expectedTotal?: number;
};
export type Quote = { items: Order["items"]; subtotal: number; shipping: number; discount: number; total: number };

import type { ApiAdminState } from "../lib/api-types";
import type { CustomerDirectory } from "../lib/customer-management";
import type { Product } from "../lib/types";
import { normalize } from "../lib/catalog";
import { categoryDescendants } from "../lib/category-tree";

type Fixture = Omit<Partial<ApiAdminState>, "products"> & { products?: Product[] };
export function adminReadFixture(url: URL, state: Fixture, directory?: CustomerDirectory) {
  const path = url.pathname.slice("/api/backend".length);
  const query = url.searchParams;
  const branch = query.get("branch") || "Quy Nhơn";
  const allOrders = (state.orders || []).filter(row => row.branch === branch);
  if (path.startsWith("/admin/orders/") && path !== "/admin/orders/quote") {
    const order = allOrders.find(row => row.id === decodeURIComponent(path.split("/")[3]));
    return { ...state, orders: order ? [order] : [], products: (state.products || []).filter(product => order?.items.some(item => item.productId === product.id)), customers: (state.customers || []).filter(customer => customer.id === order?.customerId) };
  }
  if (path === "/admin/dashboard") {
    const valid = allOrders.filter(order => order.status !== "Đã hủy");
    return { today: state.today, since: state.today, days: Number(query.get("days") || 7), periods: [{ start: state.today, end: state.today, value: valid.reduce((sum, order) => sum + order.total, 0) }], recentOrders: valid.slice(0, 5), metrics: { total: valid.reduce((sum, order) => sum + order.total, 0), validOrders: valid.length, pendingOrders: valid.filter(order => order.status === "Chờ xác nhận").length, approvals: (state.approvals || []).filter(row => row.status === "Chờ duyệt").length, debt: (state.customers || []).filter(row => row.branch === branch).reduce((sum, row) => sum + row.debt, 0), overdueCustomers: 0, pendingCustomers: 0, warehouseWaiting: 0, shortages: 0 } };
  }
  if (path !== "/admin/browse") return undefined;
  const resource = query.get("resource") || "products";
  const search = normalize(query.get("q") || "");
  const status = query.get("status") || "all";
  const match = (text: string) => search.split(/\s+/).every(term => normalize(text).includes(term));
  const size = Number(query.get("pageSize") || 10);
  let rows: { id: string }[] = [];
  if (resource === "products") {
    const categorySlugs = query.get("category") ? categoryDescendants(state.categories || [], query.get("category")!) : [];
    rows = (state.products || []).filter(product => match(`${product.name} ${product.code} ${product.alternateCode || ""} ${product.brand}`) && (!query.get("category") || categorySlugs.includes(product.category)) && (!query.get("subcategory") || product.subcategory === query.get("subcategory")) && (status === "all" || (status === "published" ? (product as ApiAdminState["products"][number]).published : !(product as ApiAdminState["products"][number]).published)));
  }
  if (resource === "orders" || resource === "warehouse") rows = allOrders.filter(order => match(`${order.id} ${order.customerName}`) && (resource !== "warehouse" || ["Chờ soạn hàng", "Đang soạn", "Sẵn sàng giao"].includes(order.status)) && (status === "all" || (status === "issues" ? !!state.warehouse?.[order.id]?.issue && !state.warehouse[order.id].issue?.resolvedAt : order.status === status)) && (!query.get("from") || order.date >= query.get("from")!) && (!query.get("to") || order.date <= query.get("to")!));
  const customers = directory?.items || state.customers || [];
  if (resource === "customers") rows = customers.filter(customer => customer.branch === branch && match(`${customer.name} ${customer.id} ${customer.contact} ${customer.phone} ${customer.email}`) && (status === "all" || (status === "overdue" ? customer.overdue > 0 : status === "overlimit" ? customer.debt > customer.limit : customer.status === status)) && (!query.get("group") || customer.group === query.get("group")) && (!query.get("sales") || (query.get("sales") === "unassigned" ? !customer.assignedSalesId : customer.assignedSalesId === query.get("sales"))) && (!query.get("pilot") || !!customer.pilot === (query.get("pilot") === "pilot")));
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / size));
  const page = Math.min(Math.max(1, Number(query.get("page") || 1)), totalPages);
  const items = rows.slice((page - 1) * size, page * size);
  const key = resource === "warehouse" ? "orders" : resource;
  return { ...state, [key]: items, pagination: { resource, total, page, pageSize: size, totalPages, ids: items.map(row => row.id) }, ...(resource === "customers" ? { directory: { items, groups: directory?.groups || Array.from(new Set(customers.map(row => row.group))), assignees: directory?.assignees || [] } } : {}) };
}

import { catalog, type Product } from "@/lib/catalog";
import { readWarehouseRecord, type WarehouseRecord } from "@/lib/admin-warehouse";
import { readSalesData, readSalesOrder, type SalesDetails, type SalesOrderData } from "@/lib/admin-sales";
import { applyApprovedPrice, approvalMatchesOrder, latestOrderApprovals, readApprovalRequest, type ApprovalSnapshot, type ApprovalType } from "@/lib/admin-approval";
import { collectible, readReceipts, validAccountingDate, type Receipt } from "@/lib/admin-accounting";

export const previewDate = "2026-10-04";
export const branches = ["Quy Nhơn", "Tuy Hòa", "Nha Trang"] as const;
export type Branch = typeof branches[number];
export const orderStages = ["Chờ xác nhận", "Chờ soạn hàng", "Đang soạn", "Sẵn sàng giao", "Đang giao", "Hoàn tất", "Đã hủy"] as const;
export type AdminOrderStatus = typeof orderStages[number];
export type CustomerStatus = "Chờ duyệt" | "Đang hoạt động" | "Tạm ngưng";
export type ApprovalStatus = "Chờ duyệt" | "Đã duyệt" | "Từ chối";
export type AdminCustomer = { id: string; name: string; contact: string; phone: string; group: string; branch: Branch; status: CustomerStatus; limit: number; debt: number; overdue: number };
export type AdminOrder = { id: string; customerId: string | null; customerName: string; branch: Branch; date: string; channel: "B2B" | "B2C"; source: string; status: AdminOrderStatus; items: { productId: string; quantity: number; unitPrice: number }[]; total: number; credit: boolean; approvalId?: string; cancelReason?: string; details?: SalesDetails };
export type AdminApproval = { id: string; orderId: string; customerId: string; branch: Branch; type: ApprovalType; requestedBy: string; reason: string; status: ApprovalStatus; decisionReason?: string; createdAt?: string; snapshot?: ApprovalSnapshot };

export const adminCustomers: AdminCustomer[] = [
  { id: "KH001", name: "Xưởng nội thất Minh An", contact: "Nguyễn Minh An", phone: "0901 000 101", group: "Xưởng nội thất", branch: "Quy Nhơn", status: "Đang hoạt động", limit: 50000000, debt: 12400000, overdue: 0 },
  { id: "KH002", name: "Nội thất An Phát", contact: "Trần Hoàng Phát", phone: "0901 000 102", group: "Thiết kế - thi công", branch: "Quy Nhơn", status: "Đang hoạt động", limit: 25000000, debt: 28500000, overdue: 3200000 },
  { id: "KH003", name: "Xưởng gỗ Thành Đạt", contact: "Lê Thành Đạt", phone: "0901 000 103", group: "Xưởng nội thất", branch: "Quy Nhơn", status: "Chờ duyệt", limit: 0, debt: 0, overdue: 0 },
  { id: "KH004", name: "Đội thi công Hùng Sơn", contact: "Phạm Hùng Sơn", phone: "0901 000 104", group: "Thợ - đội thi công", branch: "Quy Nhơn", status: "Đang hoạt động", limit: 15000000, debt: 4500000, overdue: 1500000 },
  { id: "KH005", name: "Nội thất Mộc Việt", contact: "Võ Thanh Bình", phone: "0901 000 105", group: "Xưởng nội thất", branch: "Tuy Hòa", status: "Đang hoạt động", limit: 40000000, debt: 8200000, overdue: 0 },
  { id: "KH006", name: "Kiến trúc Nam Phương", contact: "Đặng Hải Nam", phone: "0901 000 106", group: "Thiết kế - thi công", branch: "Nha Trang", status: "Đang hoạt động", limit: 30000000, debt: 19400000, overdue: 2200000 },
  { id: "KH007", name: "Xưởng nội thất Đại Lộc", contact: "Nguyễn Đại Lộc", phone: "0901 000 107", group: "Xưởng nội thất", branch: "Tuy Hòa", status: "Chờ duyệt", limit: 0, debt: 0, overdue: 0 }
];

export function dateBefore(days: number, reference = previewDate) {
  const date = new Date(`${reference}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}
export function adminDate(date: string) {
  return new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(`${date.slice(0, 10)}T12:00:00Z`));
}

const orderFixtures: [string | null, Branch, number, AdminOrderStatus][] = [
  ["KH001", "Quy Nhơn", 0, "Chờ xác nhận"], ["KH002", "Quy Nhơn", 0, "Chờ xác nhận"],
  [null, "Quy Nhơn", 0, "Chờ xác nhận"], ["KH004", "Quy Nhơn", 1, "Chờ soạn hàng"],
  ["KH001", "Quy Nhơn", 1, "Đang soạn"], [null, "Quy Nhơn", 2, "Sẵn sàng giao"],
  ["KH004", "Quy Nhơn", 3, "Đang giao"], ["KH001", "Quy Nhơn", 4, "Hoàn tất"],
  [null, "Quy Nhơn", 6, "Hoàn tất"], ["KH001", "Quy Nhơn", 8, "Hoàn tất"],
  ["KH004", "Quy Nhơn", 15, "Đã hủy"], [null, "Quy Nhơn", 20, "Hoàn tất"],
  ["KH005", "Tuy Hòa", 0, "Chờ xác nhận"], ["KH005", "Tuy Hòa", 2, "Đang giao"],
  [null, "Tuy Hòa", 4, "Hoàn tất"], ["KH006", "Nha Trang", 0, "Chờ xác nhận"],
  ["KH006", "Nha Trang", 2, "Chờ soạn hàng"], [null, "Nha Trang", 5, "Hoàn tất"]
];
export const adminOrders: AdminOrder[] = orderFixtures.map(([customerId, branch, days, status], i) => {
  const customer = adminCustomers.find((item) => item.id === customerId);
  const selected = [catalog[i % 6], catalog[(i + 3) % 6]];
  const items = selected.map((product, j) => ({ productId: product.id, quantity: customerId ? 5 + (i % 5) * 3 + j : 1 + j, unitPrice: product.price }));
  return {
    id: `BT2610${String(i + 1).padStart(4, "0")}`, customerId, customerName: customer?.name || ["Nguyễn Thu Hà", "Trần Văn Dũng", "Lê Ngọc Mai"][i % 3],
    branch, date: dateBefore(days), channel: customerId ? "B2B" : "B2C", source: customerId ? "Website B2B" : "Website B2C", status, items,
    total: items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0), credit: i === 1,
    approvalId: i === 0 ? "YC001" : i === 1 ? "YC002" : i === 15 ? "YC003" : undefined,
    cancelReason: status === "Đã hủy" ? "Khách điều chỉnh tiến độ công trình." : undefined
  };
});
export const adminApprovals: AdminApproval[] = [
  { id: "YC001", orderId: "BT26100001", customerId: "KH001", branch: "Quy Nhơn", type: "Giá đặc biệt", requestedBy: "Inside Sales Quy Nhơn", reason: "Khách đề nghị giá dự án cho đơn phụ kiện tủ bếp. Cần duyệt trước khi xác nhận đơn.", status: "Chờ duyệt" },
  { id: "YC002", orderId: "BT26100002", customerId: "KH002", branch: "Quy Nhơn", type: "Công nợ", requestedBy: "Kế toán Quy Nhơn", reason: "Khách đang vượt hạn mức và có khoản quá hạn; đề nghị xem xét ngoại lệ cho đơn này.", status: "Chờ duyệt" },
  { id: "YC003", orderId: "BT26100016", customerId: "KH006", branch: "Nha Trang", type: "Giá đặc biệt", requestedBy: "Inside Sales Nha Trang", reason: "Đề nghị giá riêng cho công trình đang thi công.", status: "Chờ duyệt" }
];

export type AdminPreviewOverrides = {
  orders: Record<string, { status: AdminOrderStatus; cancelReason?: string }>;
  customers: Record<string, CustomerStatus>;
  approvals: Record<string, { status: ApprovalStatus; decisionReason: string }>;
  published: Record<string, boolean>;
  warehouse: Record<string, WarehouseRecord>;
  salesOrders: AdminOrder[];
  orderEdits: Record<string, SalesOrderData>;
  approvalRequests: AdminApproval[];
  receipts: Receipt[];
  paymentDueDates: Record<string, string>;
};
export const emptyAdminOverrides: AdminPreviewOverrides = { orders: {}, customers: {}, approvals: {}, published: {}, warehouse: {}, salesOrders: [], orderEdits: {}, approvalRequests: [], receipts: [], paymentDueDates: {} };

export function readAdminOverrides(raw: string): AdminPreviewOverrides {
  const parsed = JSON.parse(raw);
  const result: AdminPreviewOverrides = { ...emptyAdminOverrides, orders: {}, customers: {}, approvals: {}, published: {}, warehouse: {}, salesOrders: [], orderEdits: {}, approvalRequests: [], receipts: [], paymentDueDates: {} };
  if (Array.isArray(parsed?.salesOrders)) for (const rawOrder of parsed.salesOrders.slice(0, 500)) {
    const order = readSalesOrder(rawOrder, adminCustomers, catalog, branches, previewDate);
    if (order && !result.salesOrders.some((item) => item.id === order.id)) result.salesOrders.push(order);
  }
  for (const base of [...adminOrders, ...result.salesOrders]) {
    const customer = adminCustomers.find((item) => item.id === base.customerId);
    const edit = !base.approvalId ? readSalesData(parsed?.orderEdits?.[base.id], customer, catalog, base) : null;
    if (edit) result.orderEdits[base.id] = edit;
    const order = { ...base, ...edit };
    const value = parsed?.orders?.[order.id];
    if (value && orderStages.includes(value.status) && (value.cancelReason === undefined || typeof value.cancelReason === "string")) result.orders[order.id] = { status: value.status, cancelReason: value.cancelReason };
    const record = readWarehouseRecord(parsed?.warehouse?.[order.id], order);
    if (record) result.warehouse[order.id] = record;
  }
  for (const customer of adminCustomers) {
    const value = parsed?.customers?.[customer.id];
    if (["Chờ duyệt", "Đang hoạt động", "Tạm ngưng"].includes(value)) result.customers[customer.id] = value;
  }
  const requestOrders = [...adminOrders, ...result.salesOrders].map((order) => ({ ...order, ...result.orderEdits[order.id] }));
  if (Array.isArray(parsed?.approvalRequests)) for (const rawRequest of parsed.approvalRequests.slice(0, 500)) {
    const request = readApprovalRequest(rawRequest, requestOrders, adminCustomers);
    if (request && !result.approvalRequests.some((item) => item.id === request.id)) result.approvalRequests.push(request);
  }
  for (const approval of [...adminApprovals, ...result.approvalRequests]) {
    const value = parsed?.approvals?.[approval.id];
    if (value && ["Chờ duyệt", "Đã duyệt", "Từ chối"].includes(value.status) && typeof value.decisionReason === "string") result.approvals[approval.id] = { status: value.status, decisionReason: value.decisionReason };
  }
  for (const product of catalog) if (typeof parsed?.published?.[product.id] === "boolean") result.published[product.id] = parsed.published[product.id];
  const decisions = [...adminApprovals, ...result.approvalRequests].map((item) => ({ ...item, ...result.approvals[item.id] }));
  const accountingOrders = requestOrders.map((order) => applyApprovedPrice({ ...order, ...result.orders[order.id] }, decisions));
  result.receipts = readReceipts(parsed?.receipts, accountingOrders, previewDate);
  for (const order of accountingOrders) {
    const date = parsed?.paymentDueDates?.[order.id];
    if (order.credit && collectible(order) && typeof date === "string" && validAccountingDate(date) && date >= order.date) result.paymentDueDates[order.id] = date;
  }
  return result;
}

export function orderBlocker(order: AdminOrder, customers: AdminCustomer[], approvals: AdminApproval[], products: Product[]) {
  const customer = customers.find((item) => item.id === order.customerId);
  if (customer && customer.status !== "Đang hoạt động") return "Tài khoản B2B chưa được kích hoạt hoặc đang tạm ngưng.";
  if (order.items.some((item) => item.quantity > (products.find((product) => product.id === item.productId)?.stock || 0))) return "Tồn kho không đủ cho số lượng đặt hàng.";
  const linked = latestOrderApprovals(order, approvals);
  if (linked.some((item) => !approvalMatchesOrder(item, order))) return "Nội dung đơn không khớp yêu cầu, cần gửi lại đề nghị.";
  if (linked.some((item) => item.status === "Từ chối")) return "Yêu cầu ngoại lệ đã bị từ chối.";
  if (linked.some((item) => item.status === "Chờ duyệt")) return "Cần duyệt ngoại lệ trước khi xác nhận đơn.";
  const creditApproval = linked.find((item) => item.type === "Công nợ" && item.status === "Đã duyệt");
  const creditAllowed = creditApproval && (creditApproval.snapshot?.kind !== "credit" || order.total <= creditApproval.snapshot.amount);
  if (order.credit && customer && (customer.overdue > 0 || customer.debt + order.total > customer.limit) && !creditAllowed) return "Công nợ vượt hạn mức hoặc quá hạn, cần duyệt ngoại lệ.";
  return "";
}

export function downloadAdminCsv(name: string, rows: (string | number)[][]) {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/^[=+@-]/, "'$&").replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

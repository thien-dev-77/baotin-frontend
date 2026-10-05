"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { catalog } from "@/lib/catalog";
import { useCommerce } from "@/components/commerce-provider";
import { adminApprovals, adminCustomers, adminOrders, dateBefore, emptyAdminOverrides, orderBlocker, orderStages, previewDate, readAdminOverrides, type AdminPreviewOverrides, type Branch, type CustomerStatus } from "@/lib/admin-preview";
import { appendWarehouseEvent, hasShortage, isPicked, isWarehouseOrder, warehouseBlocker } from "@/lib/admin-warehouse";
import { validateSalesDraft, type SalesDraft } from "@/lib/admin-sales";
import { applyApprovedPrice, approvalDecisionBlocker, approvalRejectionBlocker, buildApprovalRequest, latestOrderApprovals, type ApprovalDraft } from "@/lib/admin-approval";
import { collectible, reconciliationBlocker, validateReceipt, validAccountingDate, type ReceiptDraft } from "@/lib/admin-accounting";
import { apiMode } from "@/lib/api-client";
import { ApiAdminProvider } from "./api-admin-provider";
import { branches } from "@/lib/admin-preview";
import type { ApiAdminState } from "../../shared/api";

function useAdminState() {
  const [overrides, setOverrides] = useState<AdminPreviewOverrides>(emptyAdminOverrides);
  const [ready, setReady] = useState(false);
  const [branch, setBranch] = useState<Branch>("Quy Nhơn");
  const [days, setDays] = useState(7);
  const { notice } = useCommerce();
  useEffect(() => {
    try {
      const raw = localStorage.getItem("baotin-admin-preview-v1");
      if (raw) setOverrides(readAdminOverrides(raw));
    } catch { /* Preview storage is optional and isolated from customer accounts. */ }
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) try { localStorage.setItem("baotin-admin-preview-v1", JSON.stringify(overrides)); } catch {}
  }, [overrides, ready]);

  const customers = useMemo(() => adminCustomers.map((item) => ({ ...item, status: overrides.customers[item.id] || item.status })), [overrides.customers]);
  const approvals = useMemo(() => adminApprovals.concat(overrides.approvalRequests || []).map((item) => ({ ...item, ...overrides.approvals[item.id] })), [overrides.approvals, overrides.approvalRequests]);
  const baseOrders = useMemo(() => [...(overrides.salesOrders || [])].reverse().concat(adminOrders).map((item) => {
    const order = { ...item, ...overrides.orderEdits?.[item.id], ...overrides.orders[item.id] };
    return { ...order, customerName: !order.customerId && order.details ? order.details.recipient : order.customerName };
  }), [overrides.orders, overrides.salesOrders, overrides.orderEdits]);
  const orders = useMemo(() => baseOrders.map((base) => {
    const linked = latestOrderApprovals(base, approvals);
    return { ...applyApprovedPrice(base, approvals), approvalId: linked.find((item) => item.status !== "Đã duyệt")?.id || linked[0]?.id || base.approvalId };
  }), [baseOrders, approvals]);
  const products = useMemo(() => catalog.map((item, i) => ({ ...item, published: overrides.published[item.id] ?? i % 7 !== 0 })), [overrides.published]);
  const scopedOrders = orders.filter((item) => item.branch === branch && item.date >= dateBefore(days - 1));
  const scopedCustomers = customers.filter((item) => item.branch === branch);
  const scopedApprovals = approvals.filter((item) => item.branch === branch).reverse();
  const warehouse = overrides.warehouse || {};
  const warehouseOrders = orders.filter((item) => item.branch === branch && isWarehouseOrder(item));
  const receipts = overrides.receipts || [];
  const paymentDueDates = overrides.paymentDueDates || {};

  function createReceipt(draft: ReceiptDraft): { id?: string; error?: string } {
    const order = orders.find((item) => item.id === draft.orderId && item.branch === branch);
    if (receipts.length >= 500) return { error: "Bản mẫu giới hạn 500 phiếu thu." };
    const error = validateReceipt(draft, order, receipts, previewDate);
    if (error || !order) return { error };
    let number = 1;
    while (receipts.some((item) => item.id === `PTM${String(number).padStart(4, "0")}`)) number++;
    const id = `PTM${String(number).padStart(4, "0")}`;
    setOverrides((state) => ({ ...state, receipts: [...state.receipts || [], { ...draft, reference: draft.reference.trim(), note: draft.note.trim(), id, branch, status: "Chờ đối chiếu", createdAt: new Date().toISOString() }] }));
    notice(`Đã lập phiếu mẫu ${id}, chờ đối chiếu.`);
    return { id };
  }
  function reconcileReceipt(id: string, amount: number, reference: string, note: string): string {
    const receipt = receipts.find((item) => item.id === id && item.branch === branch);
    const order = orders.find((item) => item.id === receipt?.orderId);
    if (!receipt || !order || !collectible(order)) return "Phiếu thu hoặc đơn không còn hợp lệ.";
    const error = reconciliationBlocker(receipt, amount, reference, note, receipts);
    if (error) return error;
    setOverrides((state) => ({ ...state, receipts: state.receipts.map((item) => item.id === id ? { ...item, status: "Đã đối chiếu", reconciliation: { amount, reference: reference.trim(), note: note.trim(), at: new Date().toISOString() } } : item) }));
    notice(`Đã đối chiếu phiếu mẫu ${id}.`);
    return "";
  }
  function voidReceipt(id: string, reason: string): string {
    const receipt = receipts.find((item) => item.id === id && item.branch === branch && item.status !== "Đã hủy");
    if (!receipt || !reason.trim() || reason.trim().length > 500) return "Nhập lý do hủy hợp lệ, tối đa 500 ký tự.";
    setOverrides((state) => ({ ...state, receipts: state.receipts.map((item) => item.id === id ? { ...item, status: "Đã hủy", cancellation: { reason: reason.trim(), at: new Date().toISOString() } } : item) }));
    notice(`Đã hủy phiếu mẫu ${id}.`);
    return "";
  }
  function setPaymentDueDate(id: string, date: string): string {
    const order = orders.find((item) => item.id === id && item.branch === branch && item.credit && collectible(item));
    if (!order || !validAccountingDate(date) || date < order.date) return "Chọn hạn thanh toán hợp lệ, không trước ngày tạo đơn công nợ.";
    setOverrides((state) => ({ ...state, paymentDueDates: { ...state.paymentDueDates, [id]: date } }));
    notice("Đã lưu hạn thanh toán mẫu.");
    return "";
  }

  function saveSalesOrder(draft: SalesDraft, id?: string, reason = ""): { id?: string; error?: string } {
    const previous = id ? orders.find((item) => item.id === id) : undefined;
    if (id && (!previous || previous.branch !== branch || previous.status !== "Chờ xác nhận" || previous.approvalId || previous.customerId !== (draft.customerId || null) || previous.source !== draft.source)) return { error: "Chỉ sửa đơn chờ xác nhận của chi nhánh, chưa gắn yêu cầu duyệt." };
    if (id && !reason.trim()) return { error: "Nhập lý do sửa đơn." };
    if (!id && (overrides.salesOrders?.length || 0) >= 500) return { error: "Bản mẫu giới hạn 500 đơn tạo hộ. Khôi phục dữ liệu mẫu để thử lại." };
    const result = validateSalesDraft(draft, branch, customers, products, previous);
    if (!result.data) return { error: result.error };
    const data = result.data;
    const customer = customers.find((item) => item.id === draft.customerId);
    const next = Math.max(0, ...orders.filter((item) => item.id.startsWith("BTM2610")).map((item) => Number(item.id.slice(7)))) + 1;
    const orderId = id || `BTM2610${String(next).padStart(4, "0")}`;
    setOverrides((state) => ({ ...state,
      salesOrders: id ? state.salesOrders || [] : [...state.salesOrders || [], { id: orderId, customerId: customer?.id || null, customerName: customer?.name || data.details.recipient, branch, date: previewDate, channel: customer ? "B2B" : "B2C", source: draft.source, status: "Chờ xác nhận", ...data }],
      orderEdits: id ? { ...state.orderEdits, [id]: data } : state.orderEdits || {},
      warehouse: { ...state.warehouse, [orderId]: appendWarehouseEvent(state.warehouse?.[orderId], id ? "Đã sửa đơn" : "Inside Sales tạo đơn", id ? reason.trim() : draft.source) }
    }));
    notice(id ? `Đã lưu thay đổi ${orderId}.` : `Đã tạo ${orderId}, chờ xác nhận.`);
    return { id: orderId };
  }

  function advanceOrder(id: string) {
    const order = orders.find((item) => item.id === id);
    if (!order || ["Hoàn tất", "Đã hủy"].includes(order.status)) return;
    const blocker = order.status === "Chờ xác nhận" ? orderBlocker(order, customers, approvals, products) : warehouseBlocker(order, warehouse[id]);
    if (blocker) { notice(blocker); return; }
    const status = orderStages[orderStages.indexOf(order.status) + 1];
    setOverrides((state) => ({ ...state, orders: { ...state.orders, [id]: { status } }, warehouse: { ...state.warehouse, [id]: { ...appendWarehouseEvent(state.warehouse?.[id], status), ...(order.status === "Chờ soạn hàng" ? { checks: {} } : {}) } } }));
    notice(`${id}: ${status}.`);
  }
  function cancelOrder(id: string, reason: string) {
    const order = orders.find((item) => item.id === id);
    if (!order || !["Chờ xác nhận", "Chờ soạn hàng", "Đang soạn", "Sẵn sàng giao"].includes(order.status) || !reason.trim()) return;
    if (receipts.some((item) => item.orderId === id && item.status !== "Đã hủy")) { notice("Đơn có phiếu thu còn hiệu lực. Cần xử lý phiếu thu trước khi hủy đơn."); return; }
    setOverrides((state) => ({ ...state, orders: { ...state.orders, [id]: { status: "Đã hủy", cancelReason: reason.trim() } }, warehouse: { ...state.warehouse, [id]: appendWarehouseEvent(state.warehouse?.[id], "Đã hủy", reason.trim()) } }));
    notice(`Đã hủy đơn mẫu ${id}.`);
  }
  function createApproval(orderId: string, draft: ApprovalDraft): { id?: string; error?: string } {
    const order = orders.find((item) => item.id === orderId && item.branch === branch);
    const customer = customers.find((item) => item.id === order?.customerId);
    if (!order || !customer) return { error: "Chọn đơn B2B của chi nhánh đang làm việc." };
    if ((overrides.approvalRequests?.length || 0) >= 500) return { error: "Bản mẫu giới hạn 500 yêu cầu. Khôi phục dữ liệu mẫu để thử lại." };
    const result = buildApprovalRequest(order, customer, draft, approvals);
    if (!result.snapshot) return { error: result.error };
    let number = 1;
    while (approvals.some((item) => item.id === `YCM${String(number).padStart(4, "0")}`)) number++;
    const id = `YCM${String(number).padStart(4, "0")}`;
    const request = { id, orderId: order.id, customerId: customer.id, branch, type: draft.type, requestedBy: `Inside Sales ${branch}`, reason: draft.reason.trim(), status: "Chờ duyệt" as const, createdAt: new Date().toISOString(), snapshot: result.snapshot };
    setOverrides((state) => ({ ...state, approvalRequests: [...state.approvalRequests || [], request], warehouse: { ...state.warehouse, [order.id]: appendWarehouseEvent(state.warehouse?.[order.id], "Gửi yêu cầu duyệt", `${id} · ${draft.type}: ${draft.reason.trim()}`) } }));
    notice(`Đã gửi yêu cầu mẫu ${id}.`);
    return { id };
  }
  function decideApproval(id: string, approved: boolean, reason: string) {
    const approval = approvals.find((item) => item.id === id && item.status === "Chờ duyệt" && item.branch === branch);
    if (!reason.trim() || reason.trim().length > 500 || !approval) return;
    const order = orders.find((item) => item.id === approval.orderId);
    const customer = customers.find((item) => item.id === approval.customerId);
    const blocker = approved ? approvalDecisionBlocker(approval, order, customer, approvals) : approvalRejectionBlocker(approval, order, approvals);
    if (blocker) { notice(blocker); return; }
    setOverrides((state) => ({ ...state, approvals: { ...state.approvals, [id]: { status: approved ? "Đã duyệt" : "Từ chối", decisionReason: reason.trim() } }, warehouse: { ...state.warehouse, [approval.orderId]: appendWarehouseEvent(state.warehouse?.[approval.orderId], approved ? "Duyệt ngoại lệ" : "Từ chối ngoại lệ", `${id}: ${reason.trim()}`) } }));
    notice(approved ? "Đã duyệt yêu cầu mẫu." : "Đã từ chối yêu cầu mẫu.");
  }
  function setCustomerStatus(id: string, status: CustomerStatus) {
    if (!customers.some((item) => item.id === id)) return;
    setOverrides((state) => ({ ...state, customers: { ...state.customers, [id]: status } }));
    notice("Đã cập nhật trạng thái khách hàng mẫu.");
  }
  function setPublished(id: string, published: boolean) {
    if (!products.some((item) => item.id === id)) return;
    setOverrides((state) => ({ ...state, published: { ...state.published, [id]: published } }));
    notice("Đã cập nhật trạng thái sản phẩm mẫu.");
  }
  function setPicked(id: string, productId: string, picked: boolean) {
    const order = orders.find((item) => item.id === id);
    if (!order || !isWarehouseOrder(order) || (order.status !== "Đang soạn" && !hasShortage(warehouse[id])) || !order.items.some((item) => item.productId === productId)) return;
    setOverrides((state) => ({ ...state, warehouse: { ...state.warehouse, [id]: { ...appendWarehouseEvent(state.warehouse?.[id], picked ? "Đã kiểm đủ hàng" : "Bỏ xác nhận đủ hàng", productId), checks: { ...state.warehouse?.[id]?.checks, [productId]: picked } } } }));
  }
  function reportShortage(id: string, productId: string, quantity: number, note: string) {
    const order = orders.find((item) => item.id === id);
    const line = order?.items.find((item) => item.productId === productId);
    if (!order || !isWarehouseOrder(order) || hasShortage(warehouse[id]) || !line || !Number.isInteger(quantity) || quantity < 1 || quantity > line.quantity || !note.trim()) return;
    setOverrides((state) => ({ ...state, warehouse: { ...state.warehouse, [id]: { ...appendWarehouseEvent(state.warehouse?.[id], "Báo thiếu hàng", `${productId} · Thiếu ${quantity}: ${note.trim()}`), checks: { ...state.warehouse?.[id]?.checks, [productId]: false }, issue: { productId, quantity, note: note.trim(), reportedAt: new Date().toISOString() } } } }));
    notice("Đã ghi nhận báo thiếu hàng mẫu.");
  }
  function resolveShortage(id: string, note: string) {
    const order = orders.find((item) => item.id === id);
    const record = warehouse[id];
    const issue = record?.issue;
    if (!order || !isWarehouseOrder(order) || !issue || issue.resolvedAt || !note.trim() || !isPicked(order, record, issue.productId)) return;
    setOverrides((state) => ({ ...state, warehouse: { ...state.warehouse, [id]: { ...appendWarehouseEvent(state.warehouse?.[id], "Đã xử lý thiếu hàng", note.trim()), issue: { ...issue, resolvedAt: new Date().toISOString(), resolution: note.trim() } } } }));
    notice("Đã xử lý báo thiếu hàng mẫu.");
  }
  return { ready, today: previewDate, allowedBranches: [...branches], branch, setBranch, days, setDays, orders, scopedOrders, customers, scopedCustomers, approvals, scopedApprovals, products, warehouse, warehouseOrders, receipts, paymentDueDates, createReceipt, reconcileReceipt, voidReceipt, setPaymentDueDate, saveSalesOrder, createApproval, advanceOrder, cancelOrder, decideApproval, setCustomerStatus, setPublished, setPicked, reportShortage, resolveShortage, reset: () => { setOverrides(emptyAdminOverrides); notice("Đã khôi phục dữ liệu quản trị mẫu."); } };
}

type MockValue = ReturnType<typeof useAdminState>;
type ActionKey = "createReceipt" | "reconcileReceipt" | "voidReceipt" | "setPaymentDueDate" | "saveSalesOrder" | "createApproval" | "advanceOrder" | "cancelOrder" | "decideApproval" | "setCustomerStatus" | "setPublished" | "setPicked" | "reportShortage" | "resolveShortage" | "reset";
type Awaitable<T> = T extends (...args: infer A) => infer R ? (...args: A) => R | Promise<R | ([R] extends [void] ? string : never)> : T;
export type AdminValue = Omit<{ [K in keyof MockValue]: K extends ActionKey ? Awaitable<MockValue[K]> : MockValue[K] }, keyof ApiAdminState | "scopedOrders" | "scopedApprovals" | "warehouseOrders"> & ApiAdminState & { scopedOrders: ApiAdminState["orders"]; scopedApprovals: ApiAdminState["approvals"]; warehouseOrders: ApiAdminState["orders"] };
export const AdminContext = createContext<AdminValue | null>(null);
export function AdminProvider({ children }: { children: React.ReactNode }) {
  return apiMode ? <ApiAdminProvider>{children}</ApiAdminProvider> : <PreviewAdminProvider>{children}</PreviewAdminProvider>;
}
function PreviewAdminProvider({ children }: { children: React.ReactNode }) {
  const value = useAdminState();
  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}
export function useAdmin() {
  const value = useContext(AdminContext);
  if (!value) throw new Error("AdminProvider is required");
  return value;
}

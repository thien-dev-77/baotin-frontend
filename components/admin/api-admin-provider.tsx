"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LockKeyhole, LogIn, RefreshCw } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { useCommerce } from "@/components/commerce-provider";
import { Button, Field } from "@/components/ui";
import { isWarehouseOrder } from "@/lib/admin-warehouse";
import type { ApiAdminState } from "../../shared/api";
import type { Branch } from "../../shared/types";
import { AdminContext, type AdminValue } from "./admin-provider";

const empty: ApiAdminState = { products: [], customers: [], orders: [], approvals: [], warehouse: {}, receipts: [], paymentDueDates: {}, today: "" };

export function ApiAdminProvider({ children }: { children: React.ReactNode }) {
  const { ready: sessionReady, sessionUser, logout, notice, reloadCatalog } = useCommerce();
  const [state, setState] = useState(empty);
  const [ready, setReady] = useState(false);
  const [branch, setBranch] = useState<Branch>("Quy Nhơn");
  const [days, setDays] = useState(7);
  const [error, setError] = useState("");
  const saving = useRef(false);
  const staff = sessionUser && sessionUser.role !== "b2b";
  const reload = useCallback(async () => {
    try { setState(await api<ApiAdminState>("/admin/state")); setError(""); setReady(true); }
    catch (error) { setError(error instanceof Error ? error.message : "Không thể tải dashboard."); }
  }, []);
  useEffect(() => {
    setReady(false); setState(empty);
    if (!staff) return;
    setBranch(sessionUser.branches[0]);
    void reload();
    const focus = () => { void reload(); };
    window.addEventListener("focus", focus);
    return () => window.removeEventListener("focus", focus);
  }, [staff, sessionUser?.id, sessionUser?.branches, reload]);

  const command = async (action: string, id: string | undefined, payload: object, orderId = id) => {
    if (saving.current) return { error: "Đang lưu thao tác trước. Vui lòng đợi." };
    saving.current = true;
    try {
      const expectedRevision = state.orders.find((order) => order.id === orderId)?.revision;
      const result = await api<{ id: string; state: ApiAdminState }>("/admin/commands", { method: "POST", body: JSON.stringify({ action, id, branch, payload, expectedRevision }) });
      setState(result.state); notice("Đã lưu thay đổi.");
      if (action === "publish-product") void reloadCatalog().catch((error) => notice(error.message));
      return { id: result.id };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể lưu thay đổi.";
      notice(message); await reload(); return { error: message };
    } finally { saving.current = false; }
  };
  const simple = async (action: string, id: string, payload: object, orderId = id) => (await command(action, id, payload, orderId)).error || "";
  const date = new Date(`${state.today || "2026-10-04"}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days + 1);
  const since = date.toISOString().slice(0, 10);
  const value: AdminValue = {
    ...state, ready, branch, setBranch, days, setDays, allowedBranches: sessionUser?.branches || [],
    scopedOrders: state.orders.filter((order) => order.branch === branch && order.date >= since),
    scopedCustomers: state.customers.filter((customer) => customer.branch === branch),
    scopedApprovals: state.approvals.filter((approval) => approval.branch === branch).reverse(),
    warehouseOrders: state.orders.filter((order) => order.branch === branch && isWarehouseOrder(order)),
    saveSalesOrder: (draft, id, reason = "") => command("save-order", id, { ...draft, reason }),
    createApproval: (id, draft) => command("create-approval", id, draft),
    createReceipt: (draft) => command("create-receipt", undefined, draft, draft.orderId),
    reconcileReceipt: async (id, amount, reference, note) => (await command("reconcile-receipt", id, { amount, reference, note })).error || "",
    voidReceipt: async (id, reason) => (await command("void-receipt", id, { reason })).error || "",
    setPaymentDueDate: async (id, date) => (await command("due-date", id, { date })).error || "",
    advanceOrder: (id) => simple("advance-order", id, {}), cancelOrder: (id, reason) => simple("cancel-order", id, { reason }),
    decideApproval: (id, approved, reason) => simple("decide-approval", id, { approved, reason }, state.approvals.find((item) => item.id === id)?.orderId),
    setCustomerStatus: (id, status) => simple("customer-status", id, { status }),
    setPublished: (id, published) => simple("publish-product", id, { published }),
    setPicked: (id, productId, picked) => simple("pick-item", id, { productId, picked }),
    reportShortage: (id, productId, quantity, note) => simple("report-shortage", id, { productId, quantity, note }),
    resolveShortage: (id, note) => simple("resolve-shortage", id, { note }), reset: reload
  };
  if (!sessionReady) return <div role="status" className="p-10 text-center text-sm">Đang kiểm tra phiên đăng nhập...</div>;
  if (!sessionUser) return <StaffLogin />;
  if (!staff) return <div className="mx-auto max-w-md space-y-5 px-4 py-20"><LockKeyhole className="text-blue-brand" /><h1 className="text-xl font-bold text-primary">Tài khoản không có quyền quản trị</h1><Button onClick={logout}>Đổi tài khoản</Button><Link className="ml-4 text-sm text-blue-brand" href="/account">Tài khoản B2B</Link></div>;
  return <AdminContext.Provider value={value}>{error && <div role="alert" className="flex items-center justify-center gap-3 bg-red-50 p-3 text-sm text-danger">{error}<Button variant="secondary" onClick={() => { void reload(); }}><RefreshCw size={16} />Thử lại</Button></div>}{children}</AdminContext.Provider>;
}

function StaffLogin() {
  const { loginWithPassword } = useCommerce();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return <main className="mx-auto max-w-md px-5 py-20"><h1 className="text-2xl font-bold text-primary">Bảo Tín · Quản trị</h1><form className="mt-8 space-y-5" onSubmit={async (event) => {
    event.preventDefault(); if (busy) return;
    const data = new FormData(event.currentTarget); setBusy(true); setError("");
    try { await loginWithPassword(String(data.get("identity")), String(data.get("password"))); }
    catch (error) { setError(error instanceof Error ? error.message : "Đăng nhập không thành công."); }
    finally { setBusy(false); }
  }}><Field label="Email nhân viên" required><input className="bt-input" type="email" name="identity" autoComplete="username" required /></Field><Field label="Mật khẩu" required><input className="bt-input" type="password" name="password" autoComplete="current-password" required minLength={8} /></Field>{error && <p role="alert" className="text-sm text-danger">{error}</p>}<Button type="submit" disabled={busy} className="w-full"><LogIn size={17} />{busy ? "Đang đăng nhập..." : "Đăng nhập"}</Button></form><Link className="mt-6 block text-sm text-blue-brand" href="/">Về website bán hàng</Link></main>;
}

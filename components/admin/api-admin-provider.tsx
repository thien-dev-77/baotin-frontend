"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LockKeyhole, LogIn, RefreshCw } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { api } from "@/lib/api-client";
import { useCommerce } from "@/components/commerce-provider";
import { Button, Field } from "@/components/ui";
import { isWarehouseOrder } from "@/lib/admin-warehouse";
import type { ApiAdminState } from "@/lib/api-types";
import type { Branch, SessionUser } from "@/lib/types";
import { AdminContext, type AdminValue, type PendingAdminAction } from "./admin-provider";
import { PasswordInput } from "../password-form";
import { adminResources, AdminResourceCache, resourcesChangedBy, resourcesForAdminPage, type AdminResource } from "@/lib/admin-resources";
import { AdminReadCache } from "@/lib/admin-read-cache";

const fetchResources = (branch: Branch, resources: readonly AdminResource[]) => api<Partial<ApiAdminState>>(`/admin/resources?${new URLSearchParams({ branch, include: resources.join(",") })}`);

export function ApiAdminProvider({ children }: { children: React.ReactNode }) {
  const { ready: sessionReady, sessionUser, logout, notice, reloadCatalog } = useCommerce();
  // Session refreshes return new objects; reset only when access actually changes.
  const scopeKey = JSON.stringify(sessionUser ? { id: sessionUser.id, role: sessionUser.role, branches: sessionUser.branches } : null);
  const scope = useMemo(() => JSON.parse(scopeKey) as Pick<SessionUser, "id" | "role" | "branches"> | null, [scopeKey]);
  const path = usePathname();
  const requiredKey = resourcesForAdminPage(path).join(",");
  const required = useMemo(() => requiredKey ? requiredKey.split(",") as AdminResource[] : [], [requiredKey]);
  const cache = useMemo(() => new AdminResourceCache(scopeKey), [scopeKey]);
  const readCache = useMemo(() => new AdminReadCache(scopeKey), [scopeKey]);
  const revisions = useRef({ orders: new Map<string, number>(), customers: new Map<string, number>(), approvals: new Map<string, string>() });
  const activeCache = useRef(cache);
  const [, setCacheRevision] = useState(0);
  const [chosenBranch, setBranch] = useState<Branch>("Quy Nhơn");
  const branch = scope?.branches.includes(chosenBranch) ? chosenBranch : scope?.branches[0] || "Quy Nhơn";
  const state = cache.state(branch);
  const [days, setDays] = useState(7);
  const [resourceRevision, setResourceRevision] = useState(0);
  const [resourceLoads, setResourceLoads] = useState<Record<string, boolean>>({});
  const setResourceLoading = useCallback((id: string, loading: boolean) => {
    setResourceLoads(previous => {
      if (!!previous[id] === loading) return previous;
      const next = { ...previous };
      if (loading) next[id] = true;
      else delete next[id];
      return next;
    });
  }, []);
  const [error, setError] = useState<{ branch: Branch; message: string } | null>(null);
  const saving = useRef(false);
  const [pendingAction, setPendingAction] = useState<PendingAdminAction | null>(null);
  const scopeVersion = useRef(0);
  const [loggingOut, setLoggingOut] = useState(false);
  const staff = scope && scope.role !== "b2b";
  const loadedResources = cache.loaded(branch);
  const ready = required.every(resource => loadedResources.includes(resource));
  const refreshing = cache.pending(branch) || Object.values(resourceLoads).some(Boolean);
  const changed = useCallback(() => {
    if (activeCache.current === cache) setCacheRevision(revision => revision + 1);
  }, [cache]);
  const rememberData = useCallback((data: Partial<ApiAdminState>) => {
    if (activeCache.current !== cache) return;
    for (const order of data.orders || []) if (order.revision) revisions.current.orders.set(order.id, Math.max(order.revision, revisions.current.orders.get(order.id) || 0));
    for (const customer of data.customers || []) if (customer.revision) revisions.current.customers.set(customer.id, Math.max(customer.revision, revisions.current.customers.get(customer.id) || 0));
    for (const approval of data.approvals || []) revisions.current.approvals.set(approval.id, approval.orderId);
  }, [cache]);
  const ensureResources = useCallback(async (resources: readonly AdminResource[]) => {
    if (activeCache.current !== cache || !staff) return;
    try {
      await cache.load(branch, resources, fetchResources, changed);
      rememberData(cache.state(branch));
      if (activeCache.current === cache) setError(previous => previous?.branch === branch ? null : previous);
    } catch (error) {
      if (activeCache.current === cache) setError({ branch, message: error instanceof Error ? error.message : "Không thể tải dữ liệu quản trị." });
      throw error;
    }
  }, [cache, branch, changed, staff, rememberData]);
  const reload = useCallback(async () => {
    for (const target of scope?.branches || [branch]) cache.invalidate(target, adminResources);
    setResourceRevision(revision => revision + 1);
    await Promise.all([ensureResources(required).catch(() => undefined), readCache.refresh()]);
  }, [branch, cache, required, scope, ensureResources, readCache]);
  useEffect(() => {
    const scopes = scopeVersion;
    activeCache.current = cache;
    scopes.current++;
    setError(null); setPendingAction(null); setResourceLoads({}); saving.current = false;
    revisions.current = { orders: new Map(), customers: new Map(), approvals: new Map() };
    return () => { scopes.current++; };
  }, [cache]);
  useEffect(() => { void ensureResources(required).catch(() => undefined); }, [required, ensureResources]);

  const command = async (action: string, id: string | undefined, payload: object, orderId = id) => {
    if (saving.current) return { error: "Đang lưu thao tác trước. Vui lòng đợi." };
    saving.current = true;
    const currentScope = scopeVersion.current;
    setPendingAction({ action, id, payload });
    try {
      const expectedRevision = orderId ? revisions.current.orders.get(orderId) : undefined;
      const result = await api<{ id: string }>("/admin/commands", { method: "POST", body: JSON.stringify({ action, id, branch, payload, expectedRevision, returnState: false }) });
      if (currentScope !== scopeVersion.current) return { error: "Phiên quản trị đã thay đổi. Vui lòng kiểm tra lại dữ liệu." };
      const affected = resourcesChangedBy(action);
      const toRefresh = affected.filter(resource => cache.loaded(branch).includes(resource));
      for (const target of action === "publish-product" ? scope?.branches || [branch] : [branch]) cache.invalidate(target, affected);
      setResourceRevision(version => version + 1);
      await Promise.all([ensureResources(toRefresh).catch(() => undefined), readCache.refresh(path => {
        if (path.startsWith("/admin/browse?")) return affected.includes(new URLSearchParams(path.split("?")[1]).get("resource") as AdminResource) || (new URLSearchParams(path.split("?")[1]).get("resource") === "warehouse" && affected.includes("orders"));
        if (path.startsWith("/admin/orders/")) return affected.some(resource => ["orders", "products", "customers", "approvals", "receipts"].includes(resource));
        if (path.startsWith("/admin/dashboard")) return affected.some(resource => ["orders", "customers", "approvals"].includes(resource));
        return affected.some(resource => path.startsWith(`/admin/${resource}`));
      })]);
      if (currentScope !== scopeVersion.current) return { error: "Phiên quản trị đã thay đổi. Vui lòng kiểm tra lại dữ liệu." };
      notice("Đã lưu thay đổi.");
      if (action === "publish-product") void reloadCatalog().catch((error) => notice(error.message));
      return { id: result.id };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể lưu thay đổi.";
      if (currentScope === scopeVersion.current) { notice(message); await reload(); }
      return { error: message };
    } finally { if (currentScope === scopeVersion.current) { saving.current = false; setPendingAction(null); } }
  };
  const simple = async (action: string, id: string, payload: object, orderId = id) => (await command(action, id, payload, orderId)).error || "";
  const date = new Date(`${state.today || "2026-10-04"}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days + 1);
  const since = date.toISOString().slice(0, 10);
  const value: AdminValue = {
    ...state, products: state.products.map(product => ({ ...product, stock: state.stockByBranch?.[branch]?.[product.id] ?? product.stock })), ready, branch, setBranch, days, setDays, resourceRevision, pendingAction, refreshing, loadedResources, ensureResources, setResourceLoading, readCache, rememberData, allowedBranches: sessionUser?.branches || [],
    scopedOrders: state.orders.filter((order) => order.branch === branch && order.date >= since),
    scopedCustomers: state.customers.filter((customer) => customer.branch === branch),
    scopedApprovals: state.approvals.filter((approval) => approval.branch === branch).reverse(),
    warehouseOrders: state.orders.filter((order) => order.branch === branch && isWarehouseOrder(order)),
    saveSalesOrder: (draft, id, reason = "", expectedTotal) => command("save-order", id, { ...draft, reason, expectedTotal }),
    createApproval: (id, draft) => command("create-approval", id, draft),
    createReceipt: (draft) => command("create-receipt", undefined, draft, draft.orderId),
    reconcileReceipt: async (id, amount, reference, note) => (await command("reconcile-receipt", id, { amount, reference, note })).error || "",
    voidReceipt: async (id, reason) => (await command("void-receipt", id, { reason })).error || "",
    setPaymentDueDate: async (id, date) => (await command("due-date", id, { date })).error || "",
    advanceOrder: (id) => simple("advance-order", id, {}), cancelOrder: (id, reason) => simple("cancel-order", id, { reason }),
    decideApproval: (id, approved, reason) => simple("decide-approval", id, { approved, reason }, revisions.current.approvals.get(id)),
    setCustomerStatus: (id, status) => simple("customer-status", id, { status, revision: revisions.current.customers.get(id) }),
    setPublished: (id, published) => simple("publish-product", id, { published }),
    setPicked: (id, productId, picked) => simple("pick-item", id, { productId, picked }),
    reportShortage: (id, productId, quantity, note) => simple("report-shortage", id, { productId, quantity, note }),
    resolveShortage: (id, note) => simple("resolve-shortage", id, { note }), reset: reload
  };
  if (!sessionReady) return <div role="status" className="p-10 text-center text-sm">Đang kiểm tra phiên đăng nhập...</div>;
  if (!sessionUser) return <StaffLogin />;
  if (!staff) return <div className="mx-auto max-w-md space-y-5 px-4 py-20"><LockKeyhole className="text-blue-brand" /><h1 className="text-xl font-bold text-primary">Tài khoản không có quyền quản trị</h1><Button loading={loggingOut} onClick={async () => { setLoggingOut(true); try { await logout(); } finally { setLoggingOut(false); } }}>Đổi tài khoản</Button><Link className="ml-4 text-sm text-blue-brand" href="/account">Tài khoản B2B</Link></div>;
  return <AdminContext.Provider value={value}>{error?.branch === branch && <div role="alert" className="flex items-center justify-center gap-3 bg-red-50 p-3 text-sm text-danger">{error.message}<Button variant="secondary" loading={refreshing} onClick={() => { void reload(); }}><RefreshCw size={16} />Thử lại</Button></div>}{children}</AdminContext.Provider>;
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
  }}><Field label="Email nhân viên" required><input className="bt-input" type="email" name="identity" autoComplete="username" required /></Field><PasswordInput name="password" label="Mật khẩu" current />{error && <p role="alert" className="text-sm text-danger">{error}</p>}<Button type="submit" loading={busy} className="w-full"><LogIn size={17} />Đăng nhập</Button></form><Link className="mt-4 block text-sm text-blue-brand" href="/forgot-password">Quên mật khẩu?</Link><Link className="mt-6 block text-sm text-blue-brand" href="/">Về website bán hàng</Link></main>;
}

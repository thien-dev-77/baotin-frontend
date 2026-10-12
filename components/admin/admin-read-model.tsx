"use client";

import { useEffect } from "react";
import { AdminContext, useAdmin } from "./admin-provider";
import type { ApiAdminState } from "@/lib/api-types";

export function AdminReadModel({ data, children }: { data?: Partial<ApiAdminState>; children: React.ReactNode }) {
  const base = useAdmin();
  const remember = base.rememberData;
  useEffect(() => { if (data) remember?.(data); }, [data, remember]);
  const value = { ...base, ...(data || { products: [], orders: [], customers: [], approvals: [], receipts: [], warehouse: {}, paymentDueDates: {} }) };
  return <AdminContext.Provider value={{ ...value, scopedOrders: value.orders, scopedCustomers: value.customers, scopedApprovals: value.approvals, warehouseOrders: value.orders.filter(order => ["Chờ soạn hàng", "Đang soạn", "Sẵn sàng giao"].includes(order.status)) }}>{children}</AdminContext.Provider>;
}

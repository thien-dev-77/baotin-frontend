"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { Send } from "lucide-react";
import { api, apiMode } from "@/lib/api-client";
import { useApiResource } from "@/lib/use-api-resource";
import type { AdminApproval, AdminOrder } from "@/lib/admin-preview";
import { money } from "@/lib/catalog";
import { useCommerce } from "./commerce-provider";
import { Button, EmptyState, Field, PageHeading } from "./ui";
import { ResourceStatus } from "./admin/admin-resource";

export function AccountPriceRequests() {
  const { customer, products, notice } = useCommerce();
  const resource = useApiResource<{
    items: AdminApproval[];
    orders: AdminOrder[];
  }>("/account/price-requests", apiMode && customer?.status === "active");
  const [orderId, setOrderId] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState("");
  const order = resource.data?.orders.find((row) => row.id === orderId);
  if (customer?.status !== "active")
    return <EmptyState title="Tài khoản cần được kích hoạt" />;
  return (
    <section>
      <PageHeading title="Yêu cầu giá đặc biệt" />
      <ResourceStatus {...resource} />
      {resource.data && (
        <>
          <form
            className="mb-8 space-y-4 border-y border-border py-5"
            onSubmit={async (event) => {
              event.preventDefault();
              if (!order || lock.current) return;
              const form = new FormData(event.currentTarget);
              const prices = Object.fromEntries(
                order.items.map((line) => [
                  line.productId,
                  Number(form.get(`price-${line.productId}`)),
                ]),
              );
              lock.current = true;
              setBusy(true);
              setError("");
              try {
                await api("/account/price-requests", {
                  method: "POST",
                  body: JSON.stringify({
                    orderId: order.id,
                    revision: order.revision,
                    reason: String(form.get("reason")),
                    prices,
                  }),
                });
                notice("Đã gửi yêu cầu giá đặc biệt.");
                setOrderId("");
                await resource.reload();
              } catch (cause) {
                setError(
                  cause instanceof Error
                    ? cause.message
                    : "Không thể gửi yêu cầu.",
                );
              } finally {
                lock.current = false;
                setBusy(false);
              }
            }}
          >
            <Field label="Đơn đang chờ xác nhận">
              <select
                className="bt-input"
                aria-label="Chọn đơn hàng"
                value={orderId}
                disabled={busy}
                onChange={(event) => setOrderId(event.target.value)}
              >
                <option value="">Chọn đơn hàng</option>
                {resource.data.orders.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.id} · {money(row.total)}
                  </option>
                ))}
              </select>
            </Field>
            {order && (
              <div key={`${order.id}-${order.revision}`} className="space-y-3">
                {order.items.map((line) => (
                  <div
                    key={line.productId}
                    className="grid items-center gap-2 border-b border-border pb-3 sm:grid-cols-[1fr_160px]"
                  >
                    <div className="min-w-0">
                      <p className="break-words text-sm font-medium text-primary">
                        {products.find(
                          (product) => product.id === line.productId,
                        )?.name || line.productId}
                      </p>
                      <p className="mt-1 text-xs text-text-muted">
                        SL: {line.quantity} · Giá hiện tại:{" "}
                        {money(line.unitPrice)}
                      </p>
                    </div>
                    <Field label="Giá đề nghị / đơn vị">
                      <input
                        className="bt-input"
                        required
                        name={`price-${line.productId}`}
                        type="number"
                        min="1"
                        max={line.unitPrice}
                        step="1"
                        defaultValue={line.unitPrice}
                        disabled={busy}
                      />
                    </Field>
                  </div>
                ))}
                <Field label="Lý do đề nghị" required>
                  <textarea
                    className="bt-input !h-24"
                    name="reason"
                    required
                    minLength={5}
                    maxLength={500}
                    disabled={busy}
                  />
                </Field>
                <Button type="submit" loading={busy}>
                  <Send size={16} />
                  Gửi yêu cầu
                </Button>
              </div>
            )}
            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
          </form>
          <h2 className="mb-3 text-base font-semibold text-primary">
            Lịch sử yêu cầu
          </h2>
          {resource.data.items.length ? (
            <div className="divide-y divide-border">
              {resource.data.items.map((item) => (
                <article key={item.id} className="py-4">
                  <div className="flex flex-wrap justify-between gap-2">
                    <Link
                      className="text-sm font-semibold text-blue-brand"
                      href={`/account/orders/${item.orderId}`}
                    >
                      {item.orderId} · {item.type}
                    </Link>
                    <span className="text-sm text-primary">{item.status}</span>
                  </div>
                  <p className="mt-2 break-words text-sm text-text-secondary">
                    {item.reason}
                  </p>
                  {item.decisionReason && (
                    <p className="mt-1 text-sm text-primary">
                      Phản hồi: {item.decisionReason}
                    </p>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="Chưa có yêu cầu giá" />
          )}
        </>
      )}
    </section>
  );
}

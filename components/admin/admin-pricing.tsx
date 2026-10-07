"use client";

import { useState } from "react";
import { Pencil, Plus, Save, Trash2 } from "lucide-react";
import { api } from "@/lib/api-client";
import { useCommerce } from "../commerce-provider";
import { Button, Field, Modal } from "../ui";
import { useAdmin } from "./admin-provider";
import { AdminHeading } from "./admin-ui";
import { ResourceStatus, useAdminResource } from "./admin-resource";
import { money } from "@/lib/catalog";

export type PricePolicy = {
  id?: string;
  name: string;
  branch: string;
  scope: "default" | "group" | "customer";
  target: string;
  discount: number;
  prices: Record<string, number>;
  startsOn: string;
  endsOn: string | null;
  active: boolean;
  revision?: number;
};
export function AdminPricing() {
  const { branch, scopedCustomers, products, today } = useAdmin();
  const { sessionUser, notice, reloadCatalog } = useCommerce();
  const resource = useAdminResource<{ policies: PricePolicy[] }>(
    `/admin/pricing?branch=${encodeURIComponent(branch)}`,
  );
  const [editing, setEditing] = useState<PricePolicy | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sku, setSku] = useState("");
  const writable = ["admin", "boss"].includes(sessionUser?.role || "");
  const groups = Array.from(
    new Set(scopedCustomers.map((customer) => customer.group)),
  );
  const labels = {
    default: "Mặc định",
    group: "Nhóm khách",
    customer: "Khách hàng",
  };
  function edit(value: PricePolicy) {
    setEditing(value);
    setError("");
    setSku("");
  }
  return (
    <>
      <AdminHeading title="Bảng giá B2B" subtitle={branch}>
        {writable && (
          <Button
            onClick={() =>
              edit({
                name: "",
                branch,
                scope: "default",
                target: "",
                discount: 0,
                prices: {},
                startsOn: today,
                endsOn: null,
                active: true,
              })
            }
          >
            <Plus size={16} />
            Tạo bảng giá
          </Button>
        )}
      </AdminHeading>
      <ResourceStatus {...resource} />
      {resource.data && (
        <div className="overflow-auto">
          <table className="bt-table" aria-busy={resource.loading || undefined}>
            <thead>
              <tr>
                <th>Bảng giá</th>
                <th>Áp dụng</th>
                <th>Chiết khấu</th>
                <th>Hiệu lực</th>
                <th>Trạng thái</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {resource.data.policies.map((policy) => (
                <tr key={policy.id}>
                  <td className="font-medium">{policy.name}</td>
                  <td>
                    {labels[policy.scope]}
                    {policy.target &&
                      ` · ${scopedCustomers.find((c) => c.id === policy.target)?.name || policy.target}`}
                  </td>
                  <td>
                    {policy.discount}% · {Object.keys(policy.prices).length} giá
                    riêng
                  </td>
                  <td className="whitespace-nowrap">
                    {policy.startsOn} / {policy.endsOn || "Không giới hạn"}
                  </td>
                  <td>{policy.active ? "Đang áp dụng" : "Tạm ngưng"}</td>
                  <td>
                    {writable && (
                      <button
                        title="Sửa bảng giá"
                        aria-label={`Sửa ${policy.name}`}
                        className="bt-icon-button"
                        onClick={() => edit(policy)}
                      >
                        <Pencil size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!resource.data.policies.length && (
            <p className="py-8 text-sm text-text-secondary">
              Chưa có bảng giá.
            </p>
          )}
        </div>
      )}
      <Modal
        open={!!editing}
        busy={busy}
        onClose={() => {
          if (!busy) setEditing(null);
        }}
        title={editing?.id ? "Sửa bảng giá" : "Tạo bảng giá"}
      >
        {editing && (
          <form
            className="space-y-4"
            onSubmit={async (event) => {
              event.preventDefault();
              if (busy || editing.branch !== branch) return;
              setBusy(true);
              setError("");
              try {
                await api("/admin/pricing", {
                  method: "POST",
                  body: JSON.stringify(editing),
                });
                setEditing(null);
                notice("Đã lưu bảng giá.");
                await resource.reload();
                await reloadCatalog().catch((cause) => notice(cause.message));
              } catch (cause) {
                setError(
                  cause instanceof Error ? cause.message : "Không thể lưu.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <Field label="Tên bảng giá" required>
              <input
                required
                maxLength={100}
                value={editing.name}
                onChange={(event) =>
                  setEditing({ ...editing, name: event.target.value })
                }
                className="bt-input"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Phạm vi">
                <select
                  className="bt-input"
                  value={editing.scope}
                  onChange={(event) =>
                    setEditing({
                      ...editing,
                      scope: event.target.value as PricePolicy["scope"],
                      target: "",
                    })
                  }
                >
                  {Object.entries(labels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              {editing.scope !== "default" && (
                <Field label="Đối tượng" required>
                  <select
                    required
                    className="bt-input"
                    value={editing.target}
                    onChange={(event) =>
                      setEditing({ ...editing, target: event.target.value })
                    }
                  >
                    <option value="">Chọn đối tượng</option>
                    {editing.scope === "customer"
                      ? scopedCustomers.map((customer) => (
                          <option key={customer.id} value={customer.id}>
                            {customer.name}
                          </option>
                        ))
                      : groups.map((group) => (
                          <option key={group}>{group}</option>
                        ))}
                  </select>
                </Field>
              )}
              <Field label="Chiết khấu (%)" required>
                <input
                  type="number"
                  min={0}
                  max={99}
                  step={1}
                  required
                  className="bt-input"
                  value={editing.discount}
                  onChange={(event) =>
                    setEditing({
                      ...editing,
                      discount: Number(event.target.value),
                    })
                  }
                />
              </Field>
              <Field label="Từ ngày" required>
                <input
                  type="date"
                  required
                  className="bt-input"
                  value={editing.startsOn}
                  onChange={(event) =>
                    setEditing({ ...editing, startsOn: event.target.value })
                  }
                />
              </Field>
              <Field label="Đến ngày">
                <input
                  type="date"
                  min={editing.startsOn}
                  className="bt-input"
                  value={editing.endsOn || ""}
                  onChange={(event) =>
                    setEditing({
                      ...editing,
                      endsOn: event.target.value || null,
                    })
                  }
                />
              </Field>
            </div>
            <section className="border-t border-border pt-4">
              <h2 className="mb-3 text-sm font-semibold text-primary">
                Giá riêng theo mã hàng
              </h2>
              <div className="flex gap-2">
                <select
                  aria-label="Mã hàng"
                  className="bt-input min-w-0"
                  value={sku}
                  onChange={(event) => setSku(event.target.value)}
                >
                  <option value="">Chọn mã hàng</option>
                  {products
                    .filter(
                      (product) => !Object.hasOwn(editing.prices, product.id),
                    )
                    .map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.code} · {product.name}
                      </option>
                    ))}
                </select>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!sku}
                  onClick={() => {
                    setEditing({
                      ...editing,
                      prices: {
                        ...editing.prices,
                        [sku]: products.find((p) => p.id === sku)?.price || 1,
                      },
                    });
                    setSku("");
                  }}
                >
                  <Plus size={16} />
                </Button>
              </div>
              {Object.entries(editing.prices).map(([id, price]) => (
                <div key={id} className="mt-3 flex items-end gap-2">
                  <Field label={products.find((p) => p.id === id)?.code || id}>
                    <input
                      type="number"
                      required
                      min={1}
                      max={1e12}
                      step={1}
                      value={price}
                      className="bt-input"
                      onChange={(event) =>
                        setEditing({
                          ...editing,
                          prices: {
                            ...editing.prices,
                            [id]: Number(event.target.value),
                          },
                        })
                      }
                    />
                  </Field>
                  <button
                    type="button"
                    title="Xóa giá riêng"
                    aria-label={`Xóa giá ${id}`}
                    className="bt-icon-button mb-1"
                    onClick={() => {
                      const prices = { ...editing.prices };
                      delete prices[id];
                      setEditing({ ...editing, prices });
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                  <span className="mb-2 text-xs text-text-muted">
                    {money(price)}
                  </span>
                </div>
              ))}
            </section>
            <label className="flex gap-2 text-sm">
              <input
                type="checkbox"
                checked={editing.active}
                onChange={(event) =>
                  setEditing({ ...editing, active: event.target.checked })
                }
              />
              Đang áp dụng
            </label>
            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
            <Button type="submit" loading={busy} disabled={editing.branch !== branch}>
              <Save size={16} />
              Lưu bảng giá
            </Button>
          </form>
        )}
      </Modal>
    </>
  );
}

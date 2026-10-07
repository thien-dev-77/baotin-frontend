"use client";

import { useState } from "react";
import { Pencil, Save } from "lucide-react";
import { api } from "@/lib/api-client";
import type { AdminCustomer, Product } from "@/lib/types";
import { money } from "@/lib/catalog";
import { useCommerce } from "../commerce-provider";
import { Button, Field, Modal, Tabs } from "../ui";
import { AdminHeading, AdminSearch } from "./admin-ui";
import { useAdmin } from "./admin-provider";
import { useAdminResource, ResourceStatus } from "./admin-resource";

type LedgerData = {
  inventory: (Product & { onHand: number; reserved: number })[];
  customers: AdminCustomer[];
  entries: {
    id: string;
    kind: string;
    resourceId: string;
    delta: number;
    reason: string;
    at: string;
    actorId: string;
  }[];
};
type Edit = {
  branch: string;
  kind: "stock" | "credit" | "terms";
  id: string;
  name: string;
  expected: number;
  target: number;
  group: string;
  reason: string;
  termsDays?: number;
  expectedTermsDays?: number;
  expectedGroup?: string;
};
export function AdminLedger() {
  const { branch, reset } = useAdmin();
  const { sessionUser, notice, reloadCatalog } = useCommerce();
  const resource = useAdminResource<LedgerData>(
    `/admin/ledger?branch=${encodeURIComponent(branch)}`,
  );
  const [tab, setTab] = useState("Tồn kho");
  const [query, setQuery] = useState("");
  const [edit, setEdit] = useState<Edit | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const writable = ["admin", "boss"].includes(sessionUser?.role || "");
  const warehouse = sessionUser?.role === "warehouse";
  const match = (text: string) =>
    text.toLocaleLowerCase("vi").includes(query.toLocaleLowerCase("vi"));
  const open = (value: Edit) => {
    setEdit(value);
    setError("");
  };
  return (
    <>
      <AdminHeading title="Sổ tồn kho & công nợ" subtitle={branch} />
      <Tabs
        options={
          warehouse
            ? ["Tồn kho", "Phát sinh"]
            : ["Tồn kho", "Công nợ", "Phát sinh"]
        }
        value={tab}
        onChange={setTab}
      />
      <div className="my-4 flex">
        <AdminSearch
          value={query}
          onChange={setQuery}
          placeholder="Tìm mã hàng, khách hàng"
        />
      </div>
      <ResourceStatus {...resource} />
      {resource.data && (
        <div className="overflow-auto">
          {tab === "Tồn kho" && (
            <table className="bt-table" aria-busy={resource.loading || undefined}>
              <thead>
                <tr>
                  <th>Mã hàng</th>
                  <th>Sản phẩm</th>
                  <th>Tồn thực</th>
                  <th>Đang giữ</th>
                  <th>Khả dụng</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {resource.data.inventory
                  .filter((p) => match(`${p.code} ${p.name}`))
                  .map((p) => (
                    <tr key={p.id}>
                      <td>{p.code}</td>
                      <td>{p.name}</td>
                      <td>
                        {p.onHand} {p.unit}
                      </td>
                      <td>{p.reserved}</td>
                      <td>{p.stock}</td>
                      <td>
                        {writable && (
                          <button
                            className="bt-icon-button"
                            title="Điều chỉnh tồn"
                            aria-label={`Điều chỉnh ${p.code}`}
                            onClick={() =>
                              open({
                                branch,
                                kind: "stock",
                                id: p.id,
                                name: p.name,
                                expected: p.onHand,
                                target: p.onHand,
                                group: "",
                                reason: "",
                              })
                            }
                          >
                            <Pencil size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
          {tab === "Công nợ" && !warehouse && (
            <table className="bt-table" aria-busy={resource.loading || undefined}>
              <thead>
                <tr>
                  <th>Khách hàng</th>
                  <th>Công nợ</th>
                  <th>Đang giữ hạn mức</th>
                  <th>Quá hạn</th>
                  <th>Hạn mức</th>
                  <th>Còn lại</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {resource.data.customers
                  .filter((c) => match(`${c.id} ${c.name}`))
                  .map((c) => (
                    <tr key={c.id}>
                      <td>
                        {c.name}
                        <span className="block text-xs text-text-muted">
                          {c.group} · {c.termsDays ?? 30} ngày
                        </span>
                      </td>
                      <td>{money(c.debt)}</td>
                      <td>{money(c.creditReserved || 0)}</td>
                      <td>{money(c.overdue)}</td>
                      <td>{money(c.limit)}</td>
                      <td>
                        {money(
                          Math.max(
                            0,
                            c.limit - c.debt - (c.creditReserved || 0),
                          ),
                        )}
                      </td>
                      <td>
                        {writable && (
                          <div className="flex gap-1">
                            <button
                              className="bt-icon-button"
                              title="Điều chỉnh công nợ"
                              aria-label={`Điều chỉnh công nợ ${c.id}`}
                              onClick={() =>
                                open({
                                  branch,
                                  kind: "credit",
                                  id: c.id,
                                  name: c.name,
                                  expected: c.debt,
                                  target: c.debt,
                                  group: c.group,
                                  reason: "",
                                })
                              }
                            >
                              <Pencil size={16} />
                            </button>
                            <Button
                              variant="ghost"
                              onClick={() =>
                                open({
                                  branch,
                                  kind: "terms",
                                  id: c.id,
                                  name: c.name,
                                  expected: c.limit,
                                  target: c.limit,
                                  group: c.group,
                                  expectedGroup: c.group,
                                  termsDays: c.termsDays ?? 30,
                                  expectedTermsDays: c.termsDays ?? 30,
                                  reason: "",
                                })
                              }
                            >
                              Hạn mức
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
          {tab === "Phát sinh" && (
            <table className="bt-table" aria-busy={resource.loading || undefined}>
              <thead>
                <tr>
                  <th>Thời gian</th>
                  <th>Loại</th>
                  <th>Mã</th>
                  <th>Phát sinh</th>
                  <th>Nội dung</th>
                </tr>
              </thead>
              <tbody>
                {resource.data.entries
                  .filter((e) => match(`${e.resourceId} ${e.reason}`))
                  .map((e) => (
                    <tr key={e.id}>
                      <td className="whitespace-nowrap">
                        {new Date(e.at).toLocaleString("vi-VN")}
                      </td>
                      <td>{e.kind === "stock" ? "Tồn kho" : "Công nợ"}</td>
                      <td>{e.resourceId}</td>
                      <td
                        className={
                          e.delta < 0 ? "text-success" : "text-primary"
                        }
                      >
                        {e.delta > 0 ? "+" : ""}
                        {e.kind === "stock" ? e.delta : money(e.delta)}
                      </td>
                      <td>{e.reason}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>
      )}
      <Modal
        open={!!edit}
        busy={busy}
        onClose={() => {
          if (!busy) setEdit(null);
        }}
        title={
          edit?.kind === "terms" ? "Hạn mức & nhóm khách" : "Điều chỉnh số dư"
        }
      >
        {edit && (
          <form
            className="space-y-4"
            onSubmit={async (event) => {
              event.preventDefault();
              if (busy || edit.branch !== branch) return;
              setBusy(true);
              setError("");
              try {
                await api(
                  `/admin/ledger/${edit.kind === "terms" ? "terms" : "adjust"}`,
                  {
                    method: "POST",
                    body: JSON.stringify(
                      edit.kind === "terms"
                        ? {
                            branch,
                            id: edit.id,
                            expected: edit.expected,
                            limit: edit.target,
                            group: edit.group,
                            termsDays: edit.termsDays,
                            expectedTermsDays: edit.expectedTermsDays,
                            expectedGroup: edit.expectedGroup,
                            reason: edit.reason,
                          }
                        : {
                            branch,
                            kind: edit.kind,
                            id: edit.id,
                            expected: edit.expected,
                            target: edit.target,
                            reason: edit.reason,
                          },
                    ),
                  },
                );
                setEdit(null);
                notice("Đã ghi nhận điều chỉnh.");
                await resource.reload();
                await reset();
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
            <p className="text-sm font-semibold text-primary">{edit.name}</p>
            <Field
              label={
                edit.kind === "terms"
                  ? "Hạn mức mới (đ)"
                  : "Số dư sau điều chỉnh"
              }
              required
            >
              <input
                className="bt-input"
                type="number"
                step={1}
                min={edit.kind === "credit" ? -1e12 : 0}
                max={edit.kind === "stock" ? 1e9 : 1e12}
                required
                value={edit.target}
                onChange={(event) =>
                  setEdit({ ...edit, target: Number(event.target.value) })
                }
              />
            </Field>
            {edit.kind === "terms" && (
              <>
                <Field label="Nhóm khách" required>
                  <input
                    className="bt-input"
                    required
                    maxLength={100}
                    value={edit.group}
                    onChange={(event) =>
                      setEdit({ ...edit, group: event.target.value })
                    }
                  />
                </Field>
                <Field label="Thời hạn thanh toán (ngày)" required>
                  <input
                    className="bt-input"
                    type="number"
                    required
                    min={0}
                    max={365}
                    step={1}
                    value={edit.termsDays ?? 30}
                    onChange={(event) =>
                      setEdit({
                        ...edit,
                        termsDays: Number(event.target.value),
                      })
                    }
                  />
                </Field>
              </>
            )}
            <Field label="Lý do" required>
              <textarea
                className="bt-input !h-24"
                required
                minLength={3}
                maxLength={500}
                value={edit.reason}
                onChange={(event) =>
                  setEdit({ ...edit, reason: event.target.value })
                }
              />
            </Field>
            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
            <Button type="submit" loading={busy} disabled={edit.branch !== branch}>
              <Save size={16} />
              Xác nhận điều chỉnh
            </Button>
          </form>
        )}
      </Modal>
    </>
  );
}

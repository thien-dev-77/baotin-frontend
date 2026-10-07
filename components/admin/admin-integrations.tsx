"use client";

import { useState } from "react";
import { Link2, RefreshCw, Send, Check } from "lucide-react";
import { api } from "@/lib/api-client";
import { useCommerce } from "../commerce-provider";
import { Button, Field, Modal, Tabs } from "../ui";
import { useAdmin } from "./admin-provider";
import { AdminHeading, AdminStatus } from "./admin-ui";
import { useAdminResource, ResourceStatus } from "./admin-resource";
import { money } from "@/lib/catalog";

type Preview = {
  id: string;
  products: {
    id: number;
    code: string;
    unit: string;
    name: string;
    basePrice: number;
  }[];
  customers: { id: number; code: string; name: string }[];
  branches: { id: number; name: string }[];
};
type Status = {
  configured: boolean;
  enabled: boolean;
  missing: string[];
  branches: Record<string, number>;
  links: { kind: string; localId: string; externalId: string }[];
  runs: { id: string; at: string; status: string }[];
  outbox: { orderId: string; status: string; externalId: string; at: string }[];
};
const root = "/admin/integrations/kiotviet";
export function AdminIntegrations() {
  const { branch, products, scopedCustomers, orders, reset } = useAdmin();
  const { notice, reloadCatalog, sessionUser } = useCommerce();
  const resource = useAdminResource<Status>(
    `${root}?branch=${encodeURIComponent(branch)}`,
  );
  const [preview, setPreview] = useState<(Preview & { branch: string }) | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<{ action: string; id?: string } | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("Kết nối");
  const [kind, setKind] = useState("product");
  const [localId, setLocalId] = useState("");
  const [externalId, setExternalId] = useState("");
  const [confirmation, setConfirmation] = useState<{
    action: "apply-prices" | "export";
    payload: object;
    title: string;
  } | null>(null);
  const snapshot = preview?.branch === branch ? preview : null;
  async function action(name: string, payload: object = {}) {
    if (busy) return;
    setBusy(true);
    setPending({ action: name, id: "id" in payload ? String(payload.id) : undefined });
    setError("");
    try {
      const result = await api<Preview>(`${root}/${name}`, {
        method: "POST",
        body: JSON.stringify({ ...payload, branch }),
      });
      if (name === "preview") setPreview({ ...result, branch });
      else notice("Đã hoàn tất thao tác KiotViet.");
      await resource.reload();
      await reset();
      if (name === "apply-prices") await reloadCatalog();
      setConfirmation(null);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không thể kết nối KiotViet.",
      );
    } finally {
      setBusy(false);
      setPending(null);
    }
  }
  return (
    <>
      <AdminHeading title="KiotViet" subtitle={branch}>
        <Button
          variant="secondary"
          loading={pending?.action === "preview"}
          disabled={
            busy || !resource.data?.enabled || !resource.data?.configured
          }
          onClick={() => void action("preview")}
        >
          <RefreshCw size={16} />
          Lấy bản xem trước
        </Button>
      </AdminHeading>
      <ResourceStatus {...resource} />
      {resource.data && (
        <>
          <Tabs
            options={["Kết nối", "Ghép mã", "Đơn hàng", "Lịch sử"]}
            value={tab}
            onChange={setTab}
          />
          {error && (
            <p role="alert" className="my-4 text-sm text-danger">
              {error}
            </p>
          )}
          {tab === "Kết nối" && (
            <section className="space-y-5 py-5">
              <div className="flex flex-wrap items-center gap-3">
                <AdminStatus
                  value={
                    resource.data.configured && resource.data.enabled
                      ? "Đang hoạt động"
                      : "Chưa cấu hình"
                  }
                />
                {resource.data.missing.length > 0 && (
                  <p className="break-words text-sm text-text-secondary">
                    Thiếu cấu hình: {resource.data.missing.join(", ")}
                  </p>
                )}
              </div>
              <dl className="divide-y divide-border text-sm">
                {Object.entries(resource.data.branches).map(([name, id]) => (
                  <div key={name} className="flex justify-between py-3">
                    <dt>{name}</dt>
                    <dd>KiotViet #{id}</dd>
                  </div>
                ))}
              </dl>
              {snapshot && (
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <span>
                    {snapshot.products.length} mã hàng ·{" "}
                    {snapshot.customers.length} khách hàng
                  </span>
                  {sessionUser?.role === "admin" && (
                    <Button
                      disabled={busy}
                      onClick={() =>
                        setConfirmation({
                          action: "apply-prices",
                          payload: { runId: snapshot.id },
                          title: "Đồng bộ giá bán lẻ các mã đã ghép?",
                        })
                      }
                    >
                      <Check size={16} />
                      Đồng bộ giá đã ghép
                    </Button>
                  )}
                </div>
              )}
            </section>
          )}
          {tab === "Ghép mã" && (
            <section className="py-5">
              {!snapshot ? (
                <p className="text-sm text-text-secondary">
                  Chưa có bản xem trước.
                </p>
              ) : (
                <form
                  className="mb-6 grid max-w-3xl items-end gap-3 sm:grid-cols-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void action("link", {
                      runId: snapshot.id,
                      kind,
                      localId,
                      externalId: Number(externalId),
                    });
                  }}
                >
                  <Field label="Loại">
                    <select
                      className="bt-input"
                      value={kind}
                      onChange={(event) => {
                        setKind(event.target.value);
                        setLocalId("");
                        setExternalId("");
                      }}
                    >
                      <option value="product">Sản phẩm</option>
                      <option value="customer">Khách hàng</option>
                    </select>
                  </Field>
                  <Field label="Mã website" required>
                    <select
                      className="bt-input"
                      value={localId}
                      required
                      onChange={(event) => setLocalId(event.target.value)}
                    >
                      <option value="">Chọn mã website</option>
                      {kind === "product"
                        ? products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.code} · {p.unit} · {p.name}
                            </option>
                          ))
                        : scopedCustomers.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.id} · {c.name}
                            </option>
                          ))}
                    </select>
                  </Field>
                  <Field label="Mã KiotViet" required>
                    <select
                      className="bt-input"
                      value={externalId}
                      required
                      onChange={(event) => setExternalId(event.target.value)}
                    >
                      <option value="">Chọn mã KiotViet</option>
                      {kind === "product"
                        ? snapshot.products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.code} · {p.unit} · {money(p.basePrice)}
                            </option>
                          ))
                        : snapshot.customers.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.code} · {c.name}
                            </option>
                          ))}
                    </select>
                  </Field>
                  <Button type="submit" disabled={busy} loading={pending?.action === "link"}>
                    <Link2 size={16} />
                    Ghép mã
                  </Button>
                </form>
              )}
              <div className="overflow-auto">
                <table className="bt-table">
                  <thead>
                    <tr>
                      <th>Loại</th>
                      <th>Mã website</th>
                      <th>KiotViet ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resource.data.links.map((link) => (
                      <tr key={`${link.kind}:${link.localId}`}>
                        <td>
                          {link.kind === "product" ? "Sản phẩm" : "Khách hàng"}
                        </td>
                        <td>{link.localId}</td>
                        <td>{link.externalId}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
          {tab === "Đơn hàng" && (
            <div className="overflow-auto py-5">
              <table className="bt-table">
                <thead>
                  <tr>
                    <th>Đơn website</th>
                    <th>Trạng thái</th>
                    <th>KiotViet</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {orders
                    .filter(
                      (o) =>
                        o.branch === branch &&
                        [
                          "Chờ soạn hàng",
                          "Đang soạn",
                          "Sẵn sàng giao",
                        ].includes(o.status),
                    )
                    .map((order) => {
                      const outbox = resource.data!.outbox.find(
                        (row) => row.orderId === order.id,
                      );
                      return (
                        <tr key={order.id}>
                          <td>{order.id}</td>
                          <td>
                            <AdminStatus value={order.status} />
                          </td>
                          <td>
                            {outbox?.externalId || outbox?.status || "Chưa gửi"}
                          </td>
                          <td>
                            {!outbox ? (
                              <Button
                                variant="secondary"
                                disabled={
                                  busy ||
                                  !resource.data?.configured ||
                                  !resource.data?.enabled ||
                                  !resource.data?.branches[branch]
                                }
                                onClick={() =>
                                  setConfirmation({
                                    action: "export",
                                    payload: {
                                      id: order.id,
                                      revision: order.revision,
                                    },
                                    title: `Gửi đơn ${order.id} sang KiotViet?`,
                                  })
                                }
                              >
                                <Send size={15} />
                                Gửi đơn
                              </Button>
                            ) : outbox.status !== "sent" ? (
                              <Button
                                variant="secondary"
                                disabled={busy}
                                loading={pending?.action === "reconcile" && pending.id === order.id}
                                onClick={() =>
                                  void action("reconcile", { id: order.id })
                                }
                              >
                                <RefreshCw size={15} />
                                Đối chiếu
                              </Button>
                            ) : (
                              <Check size={17} className="text-success" />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
          {tab === "Lịch sử" && (
            <div className="overflow-auto py-5">
              <table className="bt-table">
                <thead>
                  <tr>
                    <th>Thời gian</th>
                    <th>Mã lần đồng bộ</th>
                    <th>Kết quả</th>
                  </tr>
                </thead>
                <tbody>
                  {resource.data.runs.map((run) => (
                    <tr key={run.id}>
                      <td className="whitespace-nowrap">
                        {new Date(run.at).toLocaleString("vi-VN")}
                      </td>
                      <td>{run.id}</td>
                      <td>{run.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
      <Modal
        open={!!confirmation}
        busy={busy}
        title="Xác nhận KiotViet"
        onClose={() => {
          if (!busy) setConfirmation(null);
        }}
      >
        {confirmation && (
          <div className="space-y-4">
            <p className="text-sm text-primary">{confirmation.title}</p>
            {confirmation.action === "export" && (
              <p className="text-sm text-text-secondary">
                Tạo đơn đặt hàng, không tạo hóa đơn hoặc ghi thu tiền.
              </p>
            )}
            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => setConfirmation(null)}
              >
                Hủy
              </Button>
              <Button
                disabled={busy}
                loading={pending?.action === confirmation.action}
                onClick={() =>
                  void action(confirmation.action, confirmation.payload)
                }
              >
                <Check size={16} />
                Xác nhận
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

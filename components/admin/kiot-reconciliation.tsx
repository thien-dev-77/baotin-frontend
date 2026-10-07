"use client";
import { useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { api } from "@/lib/api-client";
import { money } from "@/lib/catalog";
import { Button, EmptyState } from "../ui";
import { ResourceStatus, useAdminResource } from "./admin-resource";
type Difference = {
  id: string;
  name: string;
  local: number | null;
  remote: number | null;
  valid: boolean;
  difference: number | null;
};
type Snapshot = {
  polling: boolean;
  lastAttempt?: { at: string; status: string } | null;
  run: {
    at: string;
    status: string;
    stock?: Difference[];
    debt?: Difference[];
    statuses?: { id: string; local: string; remote: string }[];
  } | null;
};
export function KiotReconciliation({
  branch,
  enabled,
}: {
  branch: string;
  enabled: boolean;
}) {
  const resource = useAdminResource<Snapshot>(
    `/admin/integrations/kiotviet/reconciliation?branch=${encodeURIComponent(branch)}`,
  );
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState("");
  const pull = async () => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await api("/admin/integrations/kiotviet/pull", {
        method: "POST",
        body: JSON.stringify({ branch }),
      });
      await resource.reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể đồng bộ.");
      await resource.reload();
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <section className="space-y-5 py-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-primary">
          Đối chiếu tồn kho, công nợ và trạng thái
        </h2>
        <Button
          variant="secondary"
          disabled={!enabled}
          loading={busy}
          onClick={() => void pull()}
        >
          <RefreshCw size={16} />
          Lấy số liệu KiotViet
        </Button>
      </div>
      <ResourceStatus {...resource} />
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      {resource.data?.lastAttempt?.status === "failed" && !error && (
        <p role="alert" className="text-sm text-danger">
          Lần đối chiếu gần nhất thất bại. Bản thành công trước đó và số dư
          website được giữ nguyên.
        </p>
      )}
      {resource.data?.run ? (
        <>
          <p className="text-xs text-text-muted">
            {new Date(resource.data.run.at).toLocaleString("vi-VN")} ·{" "}
            {resource.data.run.status} ·{" "}
            {resource.data.polling
              ? "Đối chiếu định kỳ đã bật"
              : "Đối chiếu thủ công"}
          </p>
          {[
            ["Tồn kho", resource.data.run.stock],
            ["Công nợ", resource.data.run.debt],
          ].map(([title, value]) => (
            <section key={String(title)}>
              <h3 className="mb-3 text-sm font-semibold text-primary">
                {String(title)}
              </h3>
              {title === "Công nợ" && (
                <p className="mb-3 text-xs text-text-secondary">
                  Công nợ KiotViet là số dư toàn cửa hàng. Số dư website cần kế
                  toán đối chiếu trước khi điều chỉnh.
                </p>
              )}
              <div className="overflow-x-auto">
                <table className="bt-table">
                  <thead>
                    <tr>
                      <th>Mã / Tên</th>
                      <th>Website</th>
                      <th>KiotViet</th>
                      <th>Chênh lệch</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(value as Difference[] | undefined)?.map((row) => (
                      <tr key={row.id}>
                        <td>
                          <strong className="text-sm text-primary">
                            {row.name}
                          </strong>
                          <span className="block text-xs text-text-muted">
                            {row.id}
                          </span>
                        </td>
                        <td className="whitespace-nowrap">
                          {row.local === null
                            ? "—"
                            : title === "Công nợ"
                              ? money(row.local)
                              : row.local}
                        </td>
                        <td className="whitespace-nowrap">
                          {row.remote === null
                            ? "Chưa xác minh"
                            : title === "Công nợ"
                              ? money(row.remote)
                              : row.remote}
                        </td>
                        <td
                          className={
                            row.difference !== 0
                              ? "whitespace-nowrap text-danger"
                              : "text-success"
                          }
                        >
                          {row.difference === null
                            ? "Cần kiểm tra"
                            : title === "Công nợ"
                              ? money(row.difference)
                              : row.difference}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
          <section>
            <h3 className="mb-3 text-sm font-semibold text-primary">
              Trạng thái đơn đã ghép mã
            </h3>
            <div className="overflow-x-auto">
              <table className="bt-table">
                <thead>
                  <tr>
                    <th>Đơn</th>
                    <th>Website</th>
                    <th>KiotViet</th>
                  </tr>
                </thead>
                <tbody>
                  {resource.data.run.statuses?.map((row) => (
                    <tr key={row.id}>
                      <td>{row.id}</td>
                      <td>{row.local}</td>
                      <td>{row.remote}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        resource.data && <EmptyState title="Chưa có bản đối chiếu KiotViet" />
      )}
    </section>
  );
}

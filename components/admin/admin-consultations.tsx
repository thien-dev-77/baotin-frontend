"use client";
import { useRef, useState } from "react";
import { Eye, Save } from "lucide-react";
import { api } from "@/lib/api-client";
import { useCommerce } from "../commerce-provider";
import { Button, EmptyState, Field, Modal } from "../ui";
import { useAdmin } from "./admin-provider";
import { AdminHeading, AdminSearch } from "./admin-ui";
import { ResourceStatus, useAdminResource } from "./admin-resource";

type Lead = {
  id: string;
  branch: string;
  revision: number;
  status: string;
  assignedTo: string | null;
  note: string;
  createdAt: string;
  data: { name: string; phone: string; email: string; message: string };
};
const statuses = {
  new: "Mới",
  contacted: "Đã liên hệ",
  qualified: "Có nhu cầu",
  closed: "Đã đóng",
};
export function AdminConsultations() {
  const { branch } = useAdmin();
  const { notice } = useCommerce();
  const resource = useAdminResource<{
    items: Lead[];
    assignees: { id: string; name: string }[];
  }>(`/contact/consultations?branch=${encodeURIComponent(branch)}`);
  const [selected, select] = useState<Lead | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState("");
  const editing = selected?.branch === branch ? selected : null;
  const rows =
    resource.data?.items.filter(
      (row) =>
        (!status || row.status === status) &&
        `${row.data.name} ${row.data.phone} ${row.data.email}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    ) || [];
  return (
    <>
      <AdminHeading title="Yêu cầu tư vấn" subtitle={branch} />
      <div className="mb-4 flex flex-wrap gap-3">
        <AdminSearch
          value={query}
          onChange={setQuery}
          placeholder="Tìm tên, số điện thoại, email..."
        />
        <select
          className="bt-input !w-auto"
          aria-label="Trạng thái tư vấn"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="">Tất cả trạng thái</option>
          {Object.entries(statuses).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <ResourceStatus {...resource} />
      {resource.data &&
        (rows.length ? (
          <div className="overflow-x-auto">
            <table className="bt-table">
              <thead>
                <tr>
                  <th>Khách hàng</th>
                  <th>Liên hệ</th>
                  <th>Trạng thái</th>
                  <th>Phụ trách</th>
                  <th>Ngày gửi</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="font-medium text-primary">
                      {row.data.name}
                    </td>
                    <td>
                      {row.data.phone}
                      <span className="block text-xs text-text-muted">
                        {row.data.email}
                      </span>
                    </td>
                    <td>{statuses[row.status as keyof typeof statuses]}</td>
                    <td>
                      {resource.data!.assignees.find(
                        (user) => user.id === row.assignedTo,
                      )?.name || "Chưa phân công"}
                    </td>
                    <td className="whitespace-nowrap">
                      {new Date(row.createdAt).toLocaleDateString("vi-VN")}
                    </td>
                    <td>
                      <button
                        className="bt-icon-button"
                        title="Xử lý yêu cầu"
                        aria-label={`Xử lý ${row.data.name}`}
                        onClick={() => {
                          select(row);
                          setError("");
                        }}
                      >
                        <Eye size={17} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="Chưa có yêu cầu tư vấn" />
        ))}
      <Modal
        open={!!editing}
        title="Xử lý yêu cầu tư vấn"
        busy={busy}
        onClose={() => select(null)}
      >
        {editing && (
          <form
            key={`${editing.id}-${editing.revision}`}
            className="space-y-4"
            onSubmit={async (event) => {
              event.preventDefault();
              if (lock.current) return;
              const form = new FormData(event.currentTarget);
              lock.current = true;
              setBusy(true);
              setError("");
              try {
                await api(`/contact/consultations/${editing.id}`, {
                  method: "PATCH",
                  body: JSON.stringify({
                    revision: editing.revision,
                    status: form.get("status"),
                    assignedTo: form.get("assignedTo"),
                    note: form.get("note"),
                  }),
                });
                select(null);
                notice("Đã cập nhật yêu cầu tư vấn.");
                await resource.reload();
              } catch (cause) {
                setError(
                  cause instanceof Error ? cause.message : "Không thể lưu.",
                );
              } finally {
                lock.current = false;
                setBusy(false);
              }
            }}
          >
            <div className="text-sm">
              <strong>{editing.data.name}</strong>
              <p className="mt-1 text-text-secondary">
                {editing.data.phone} · {editing.data.email}
              </p>
              <p className="mt-3 whitespace-pre-wrap break-words border-y border-border py-3">
                {editing.data.message}
              </p>
            </div>
            <Field label="Trạng thái">
              <select
                name="status"
                defaultValue={editing.status}
                className="bt-input"
                disabled={busy}
              >
                {Object.entries(statuses).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Nhân viên phụ trách">
              <select
                name="assignedTo"
                className="bt-input"
                defaultValue={editing.assignedTo || ""}
                disabled={busy}
              >
                <option value="">Chưa phân công</option>
                {resource.data?.assignees.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Ghi chú xử lý">
              <textarea
                className="bt-input !h-28"
                name="note"
                maxLength={2000}
                defaultValue={editing.note}
                disabled={busy}
              />
            </Field>
            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
            <Button type="submit" loading={busy}>
              <Save size={16} />
              Lưu cập nhật
            </Button>
          </form>
        )}
      </Modal>
    </>
  );
}

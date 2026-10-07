"use client";
import { useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { api } from "@/lib/api-client";
import { Button, EmptyState, Tabs } from "../ui";
import { AdminHeading } from "./admin-ui";
import { ResourceStatus, useAdminResource } from "./admin-resource";
type Review = {
  id: string;
  revision: number;
  productName: string;
  name: string;
  stars: number;
  text: string;
  status: string;
  createdAt: string;
};
const labels: Record<string, string> = {
  pending: "Chờ duyệt",
  published: "Công khai",
  rejected: "Đã ẩn",
};
export function AdminReviews() {
  const resource = useAdminResource<{ items: Review[] }>("/admin/reviews");
  const [tab, setTab] = useState("Chờ duyệt");
  const [busy, setBusy] = useState("");
  const lock = useRef(false);
  const [error, setError] = useState("");
  const save = async (row: Review, status: string) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(`${row.id}:${status}`);
    setError("");
    try {
      await api(`/admin/reviews/${row.id}`, {
        method: "PATCH",
        body: JSON.stringify({ revision: row.revision, status }),
      });
      await resource.reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể xử lý.");
    } finally {
      lock.current = false;
      setBusy("");
    }
  };
  const items =
    resource.data?.items.filter(
      (row) => tab === "Tất cả" || labels[row.status] === tab,
    ) || [];
  return (
    <>
      <AdminHeading title="Đánh giá sản phẩm" />
      <Tabs
        options={["Chờ duyệt", "Công khai", "Đã ẩn", "Tất cả"]}
        value={tab}
        onChange={setTab}
      />
      <ResourceStatus {...resource} />
      {error && (
        <p role="alert" className="my-3 text-sm text-danger">
          {error}
        </p>
      )}
      {resource.data &&
        (items.length ? (
          <div className="mt-4 divide-y divide-border border-y border-border">
            {items.map((row) => (
              <article key={row.id} className="py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="break-words text-sm font-semibold text-primary">
                      {row.productName}
                    </h2>
                    <p className="mt-1 text-xs text-text-muted">
                      {row.name} · {row.stars}/5 sao ·{" "}
                      {new Date(row.createdAt).toLocaleDateString("vi-VN")} ·{" "}
                      {labels[row.status]}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {row.status !== "published" && (
                      <Button
                        variant="secondary"
                        loading={busy === `${row.id}:published`}
                        disabled={!!busy}
                        onClick={() => void save(row, "published")}
                      >
                        <Check size={16} />
                        Duyệt
                      </Button>
                    )}
                    {row.status !== "rejected" && (
                      <Button
                        variant="secondary"
                        loading={busy === `${row.id}:rejected`}
                        disabled={!!busy}
                        onClick={() => void save(row, "rejected")}
                      >
                        <X size={16} />
                        Ẩn
                      </Button>
                    )}
                  </div>
                </div>
                <p className="mt-3 whitespace-pre-wrap break-words text-sm text-text-secondary">
                  {row.text}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="Chưa có đánh giá phù hợp" />
        ))}
    </>
  );
}

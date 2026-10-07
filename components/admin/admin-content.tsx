"use client";
import Image from "next/image";
import { useRef, useState } from "react";
import { Edit, Plus, Save, Upload } from "lucide-react";
import { api } from "@/lib/api-client";
import type { ContentEntry, ContentKind } from "@/lib/content-types";
import { useCommerce } from "../commerce-provider";
import { Button, EmptyState, Field, LoadingSpinner, Modal, Tabs } from "../ui";
import { useAdmin } from "./admin-provider";
import { AdminHeading } from "./admin-ui";
import { ResourceStatus, useAdminResource } from "./admin-resource";

const labels: Record<ContentKind, string> = {
  banner: "Banner",
  guide: "Hướng dẫn",
  solution: "Bộ giải pháp",
};
const blank = (kind: ContentKind): ContentEntry => ({
  id: "",
  kind,
  published: false,
  revision: 0,
  data: {
    slug: "",
    title: "",
    description: "",
    image: "",
    href: "",
    category: "",
    body: "",
    minutes: 5,
    width: 1600,
    height: 700,
    position: 0,
  },
});
export function AdminContent() {
  const resource = useAdminResource<{ items: ContentEntry[] }>(
    "/admin/content",
  );
  const { categories } = useAdmin();
  const { notice } = useCommerce();
  const [kind, setKind] = useState<ContentKind>("banner");
  const [editing, edit] = useState<ContentEntry | null>(null);
  const [image, setImage] = useState("");
  const [busy, setBusy] = useState("");
  const lock = useRef(false);
  const [error, setError] = useState("");
  const open = (row: ContentEntry) => {
    edit(row);
    setImage(row.data.image);
    setError("");
  };
  const initialize = async () => {
    if (lock.current) return;
    lock.current = true;
    setBusy("initialize");
    setError("");
    try {
      await api("/admin/content/initialize", { method: "POST", body: "{}" });
      await resource.reload();
      notice("Đã thêm nội dung mẫu chưa có; giữ nguyên nội dung hiện tại.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể khởi tạo.");
    } finally {
      lock.current = false;
      setBusy("");
    }
  };
  const upload = async (file: File) => {
    if (lock.current) return;
    lock.current = true;
    setBusy("upload");
    setError("");
    try {
      const form = new FormData();
      form.append("images", file);
      const result = await api<{ urls: string[] }>("/media/product-images", {
        method: "POST",
        body: form,
      });
      setImage(result.urls[0]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể tải ảnh.");
    } finally {
      lock.current = false;
      setBusy("");
    }
  };
  const items =
    resource.data?.items
      .filter((row) => row.kind === kind)
      .sort((a, b) => a.data.position - b.data.position) || [];
  return (
    <>
      <AdminHeading title="Nội dung website">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            disabled={!!busy}
            loading={busy === "initialize"}
            onClick={() => void initialize()}
          >
            <Plus size={16} />
            Khởi tạo nội dung mẫu
          </Button>
          <Button disabled={!!busy} onClick={() => open(blank(kind))}>
            <Plus size={16} />
            Thêm nội dung
          </Button>
        </div>
      </AdminHeading>
      <Tabs
        options={Object.values(labels)}
        value={labels[kind]}
        onChange={(label) =>
          setKind(
            (Object.keys(labels) as ContentKind[]).find(
              (key) => labels[key] === label,
            )!,
          )
        }
      />
      <ResourceStatus {...resource} />
      {error && !editing && (
        <p role="alert" className="my-3 text-sm text-danger">
          {error}
        </p>
      )}
      {resource.data &&
        (items.length ? (
          <div className="mt-4 overflow-x-auto">
            <table className="bt-table">
              <thead>
                <tr>
                  <th>Ảnh</th>
                  <th>Tiêu đề</th>
                  <th>Thứ tự</th>
                  <th>Hiển thị</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id}>
                    <td>
                      {row.data.image && (
                        <Image
                          src={row.data.image}
                          width={96}
                          height={56}
                          sizes="96px"
                          alt={row.data.title}
                          className="h-14 w-24 rounded object-cover"
                        />
                      )}
                    </td>
                    <td>
                      <strong className="text-sm text-primary">
                        {row.data.title}
                      </strong>
                      <span className="mt-1 block text-xs text-text-muted">
                        {row.data.slug}
                      </span>
                    </td>
                    <td>{row.data.position}</td>
                    <td>{row.published ? "Công khai" : "Bản nháp"}</td>
                    <td>
                      <button
                        className="bt-icon-button"
                        title="Chỉnh sửa"
                        aria-label={`Sửa ${row.data.title}`}
                        onClick={() => open(row)}
                      >
                        <Edit size={17} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="Chưa có nội dung" />
        ))}
      <Modal
        open={!!editing}
        title={
          editing?.id ? `Sửa ${labels[editing.kind]}` : `Thêm ${labels[kind]}`
        }
        busy={!!busy}
        onClose={() => edit(null)}
      >
        {editing && (
          <form
            key={`${editing.id}-${editing.revision}`}
            className="space-y-4"
            onSubmit={async (event) => {
              event.preventDefault();
              if (lock.current) return;
              const form = new FormData(event.currentTarget);
              const data = { ...editing.data, image };
              for (const name of [
                "slug",
                "title",
                "description",
                "href",
                "category",
                "body",
              ] as const)
                if (form.has(name)) data[name] = String(form.get(name));
              for (const name of [
                "minutes",
                "width",
                "height",
                "position",
              ] as const)
                if (form.has(name)) data[name] = Number(form.get(name));
              lock.current = true;
              setBusy("save");
              setError("");
              try {
                await api(
                  `/admin/content${editing.id ? `/${encodeURIComponent(editing.id)}` : ""}`,
                  {
                    method: editing.id ? "PATCH" : "POST",
                    body: JSON.stringify({
                      ...data,
                      kind: editing.kind,
                      published: form.get("published") === "on",
                      ...(editing.id ? { revision: editing.revision } : {}),
                    }),
                  },
                );
                edit(null);
                await resource.reload();
                notice("Đã lưu nội dung.");
              } catch (cause) {
                setError(
                  cause instanceof Error ? cause.message : "Không thể lưu.",
                );
              } finally {
                lock.current = false;
                setBusy("");
              }
            }}
          >
            <Field label="Tiêu đề" required>
              <input
                className="bt-input"
                name="title"
                required
                maxLength={150}
                defaultValue={editing.data.title}
                disabled={!!busy}
              />
            </Field>
            <Field label="Đường dẫn / Slug" required>
              <input
                className="bt-input"
                name="slug"
                required
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                maxLength={100}
                defaultValue={editing.data.slug}
                disabled={!!busy}
              />
            </Field>
            <Field label="Mô tả">
              <textarea
                className="bt-input !h-20"
                name="description"
                maxLength={500}
                defaultValue={editing.data.description}
                disabled={!!busy}
              />
            </Field>
            <div className="flex items-end gap-2">
              <div className="min-w-0 flex-1">
                <Field label="Ảnh">
                  <input className="bt-input" value={image} readOnly />
                </Field>
              </div>
              <label
                className={`bt-button-secondary cursor-pointer ${busy ? "pointer-events-none opacity-50" : ""}`}
              >
                <Upload size={16} />
                {busy === "upload" && <LoadingSpinner />}
                {busy === "upload" ? "Đang tải..." : "Tải ảnh"}
                <input
                  className="sr-only"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={!!busy}
                  onChange={(event) => {
                    if (event.target.files?.[0])
                      void upload(event.target.files[0]);
                    event.target.value = "";
                  }}
                />
              </label>
            </div>
            {image && (
              <Image
                src={image}
                alt="Ảnh nội dung"
                width={480}
                height={200}
                sizes="480px"
                className="max-h-40 w-full rounded object-contain"
              />
            )}
            <Field label="Danh mục">
              <select
                className="bt-input"
                name="category"
                defaultValue={editing.data.category}
                disabled={!!busy}
              >
                <option value="">Không chọn</option>
                {(categories || []).map((category) => (
                  <option value={category.slug} key={category.slug}>
                    {category.name}
                  </option>
                ))}
              </select>
            </Field>
            {editing.kind !== "guide" && (
              <Field label="Liên kết nội bộ">
                <input
                  className="bt-input"
                  name="href"
                  placeholder="/category/phu-kien-bep"
                  defaultValue={editing.data.href}
                  disabled={!!busy}
                />
              </Field>
            )}
            {editing.kind === "guide" && (
              <>
                <Field label="Nội dung bài viết" required>
                  <textarea
                    className="bt-input !h-48"
                    name="body"
                    required
                    maxLength={20000}
                    defaultValue={editing.data.body}
                    disabled={!!busy}
                  />
                </Field>
                <Field label="Thời gian đọc (phút)">
                  <input
                    className="bt-input"
                    type="number"
                    min="1"
                    max="120"
                    name="minutes"
                    defaultValue={editing.data.minutes}
                    disabled={!!busy}
                  />
                </Field>
              </>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Thứ tự hiển thị">
                <input
                  className="bt-input"
                  name="position"
                  type="number"
                  min="0"
                  max="1000"
                  defaultValue={editing.data.position}
                  disabled={!!busy}
                />
              </Field>
              {editing.kind === "banner" && (
                <>
                  <Field label="Chiều rộng ảnh">
                    <input
                      className="bt-input"
                      name="width"
                      type="number"
                      min="1"
                      max="10000"
                      defaultValue={editing.data.width}
                      disabled={!!busy}
                    />
                  </Field>
                  <Field label="Chiều cao ảnh">
                    <input
                      className="bt-input"
                      name="height"
                      type="number"
                      min="1"
                      max="10000"
                      defaultValue={editing.data.height}
                      disabled={!!busy}
                    />
                  </Field>
                </>
              )}
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="published"
                defaultChecked={editing.published}
                disabled={!!busy}
                className="h-4 w-4 accent-blue-brand"
              />
              Công khai
            </label>
            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
            <Button type="submit" loading={busy === "save"} disabled={!!busy}>
              <Save size={16} />
              Lưu nội dung
            </Button>
          </form>
        )}
      </Modal>
    </>
  );
}

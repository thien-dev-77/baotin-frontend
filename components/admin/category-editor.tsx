"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ImagePlus, Plus, Save, Trash2 } from "lucide-react";
import { api } from "@/lib/api-client";
import { slugify } from "@/lib/catalog";
import type { AdminCategory } from "@/lib/category-management";
import { Button, Field, LoadingSpinner } from "../ui";

export function CategoryEditor({
  category,
  onSaved,
  onCancel,
  onBusyChange,
}: {
  category: AdminCategory;
  onSaved: () => void;
  onCancel: () => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const [name, setName] = useState(category.name);
  const [slug, setSlug] = useState(category.slug);
  const [image, setImage] = useState(category.image);
  const [description, setDescription] = useState(category.description);
  const [sortOrder, setSortOrder] = useState(category.sortOrder);
  const [visible, setVisible] = useState(category.visible);
  const [groups, setGroups] = useState(() =>
    category.subcategories.map((name, id) => ({ name, id })),
  );
  const nextGroup = useRef(groups.length);
  const slugEdited = useRef(!!category.slug);
  const locked = useRef(false);
  const [busy, setBusy] = useState<"save" | "upload" | "">("");
  const [error, setError] = useState("");
  const editing = category.revision > 0;
  const start = (action: "save" | "upload") => {
    if (locked.current) return false;
    locked.current = true;
    setBusy(action);
    onBusyChange(true);
    setError("");
    return true;
  };
  const finish = () => {
    locked.current = false;
    setBusy("");
    onBusyChange(false);
  };
  const upload = async (file: File) => {
    if (!start("upload")) return;
    try {
      if (
        file.size > 5 * 1024 * 1024 ||
        !["image/jpeg", "image/png", "image/webp"].includes(file.type)
      )
        throw new Error("Chọn ảnh JPEG, PNG hoặc WebP, tối đa 5 MB.");
      const form = new FormData();
      form.append("images", file);
      const result = await api<{ urls: string[] }>("/media/product-images", {
        method: "POST",
        body: form,
      });
      if (!result.urls?.[0]) throw new Error("Phản hồi tải ảnh không hợp lệ.");
      setImage(result.urls[0]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể tải ảnh.");
    } finally {
      finish();
    }
  };
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        if (!start("save")) return;
        try {
          const subcategories = groups.map((group) =>
            group.name.normalize("NFC").trim(),
          );
          if (
            new Set(subcategories.map((name) => name.toLocaleLowerCase("vi")))
              .size !== subcategories.length
          )
            throw new Error("Tên nhóm sản phẩm không được trùng nhau.");
          if (visible && !image)
            throw new Error("Danh mục hiển thị cần ảnh đại diện.");
          await api(
            `/admin/categories${editing ? `/${encodeURIComponent(category.slug)}` : ""}`,
            {
              method: editing ? "PATCH" : "POST",
              body: JSON.stringify({
                name,
                slug,
                image,
                description,
                subcategories,
                sortOrder,
                visible,
                ...(editing ? { revision: category.revision } : {}),
              }),
            },
          );
          onSaved();
        } catch (cause) {
          setError(
            cause instanceof Error ? cause.message : "Không thể lưu danh mục.",
          );
        } finally {
          finish();
        }
      }}
    >
      <fieldset disabled={!!busy} className="min-w-0 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tên danh mục" required htmlFor="category-name">
            <input
              id="category-name"
              name="name"
              className="bt-input"
              required
              minLength={2}
              maxLength={120}
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                if (!slugEdited.current) setSlug(slugify(event.target.value));
              }}
            />
          </Field>
          <Field label="Đường dẫn" required htmlFor="category-slug">
            <input
              id="category-slug"
              name="slug"
              className="bt-input"
              required
              maxLength={80}
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              value={slug}
              disabled={editing || !!busy}
              onChange={(event) => {
                slugEdited.current = true;
                setSlug(event.target.value);
              }}
            />
          </Field>
        </div>
        <Field label="Mô tả" htmlFor="category-description">
          <textarea
            id="category-description"
            className="bt-input min-h-20 resize-y"
            maxLength={2000}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </Field>
        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium text-primary">
              Ảnh đại diện
            </span>
            <label
              aria-busy={busy === "upload" || undefined}
              className={`bt-button-secondary cursor-pointer ${busy ? "pointer-events-none opacity-50" : ""}`}
            >
              {busy === "upload" ? (
                <LoadingSpinner size={16} />
              ) : (
                <ImagePlus size={16} />
              )}
              {image ? "Đổi ảnh" : "Tải ảnh"}
              <input
                type="file"
                className="sr-only"
                aria-label="Tải ảnh danh mục"
                accept="image/jpeg,image/png,image/webp"
                disabled={!!busy}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) void upload(file);
                }}
              />
            </label>
          </div>
          <div className="relative aspect-[2/1] overflow-hidden rounded-md border border-border bg-section">
            {image ? (
              <Image
                src={image}
                alt={name || "Ảnh danh mục"}
                fill
                sizes="(min-width: 640px) 570px, 90vw"
                quality={85}
                className="object-cover"
              />
            ) : (
              <ImagePlus
                size={32}
                className="absolute inset-0 m-auto text-text-muted"
              />
            )}
            {image && (
              <button
                type="button"
                title="Gỡ ảnh đại diện"
                aria-label="Gỡ ảnh đại diện"
                className="bt-icon-button absolute right-2 top-2 bg-white text-danger"
                onClick={() => setImage("")}
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-sm font-medium text-primary">Nhóm sản phẩm</h3>
            <Button
              type="button"
              variant="secondary"
              disabled={groups.length >= 50}
              onClick={() =>
                setGroups((previous) => [
                  ...previous,
                  { id: nextGroup.current++, name: "" },
                ])
              }
            >
              <Plus size={16} />
              Thêm nhóm
            </Button>
          </div>
          <div className="space-y-2">
            {groups.map((group, index) => (
              <div key={group.id} className="flex items-center gap-2">
                <input
                  aria-label={`Tên nhóm ${index + 1}`}
                  className="bt-input"
                  required
                  maxLength={100}
                  value={group.name}
                  onChange={(event) =>
                    setGroups((previous) =>
                      previous.map((item) =>
                        item.id === group.id
                          ? { ...item, name: event.target.value }
                          : item,
                      ),
                    )
                  }
                />
                <button
                  type="button"
                  title={`Xóa nhóm ${index + 1}`}
                  aria-label={`Xóa nhóm ${index + 1}`}
                  className="bt-icon-button shrink-0 text-danger"
                  onClick={() =>
                    setGroups((previous) =>
                      previous.filter((item) => item.id !== group.id),
                    )
                  }
                >
                  <Trash2 size={17} />
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="grid items-end gap-4 sm:grid-cols-2">
          <Field label="Thứ tự hiển thị" required htmlFor="category-position">
            <input
              id="category-position"
              className="bt-input"
              type="number"
              required
              min={0}
              max={100000}
              step={1}
              value={sortOrder}
              onChange={(event) => setSortOrder(Number(event.target.value))}
            />
          </Field>
          <label className="flex min-h-10 items-center gap-2 text-sm text-primary">
            <input
              type="checkbox"
              className="h-4 w-4 accent-blue-brand"
              checked={visible}
              onChange={(event) => setVisible(event.target.checked)}
            />
            Hiện trong danh mục
          </label>
        </div>
      </fieldset>
      {error && (
        <p role="alert" className="mt-4 text-sm text-danger">
          {error}
        </p>
      )}
      <div className="mt-5 flex justify-end gap-2 border-t border-border pt-4">
        <Button
          type="button"
          variant="secondary"
          disabled={!!busy}
          onClick={onCancel}
        >
          Hủy
        </Button>
        <Button type="submit" loading={busy === "save"} disabled={!!busy}>
          <Save size={16} />
          Lưu danh mục
        </Button>
      </div>
    </form>
  );
}

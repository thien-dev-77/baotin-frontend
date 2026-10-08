"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  Eye,
  FolderTree,
  ImageIcon,
  Pencil,
  Plus,
  RefreshCw,
} from "lucide-react";
import { apiMode } from "@/lib/api-client";
import { normalize } from "@/lib/catalog";
import type {
  AdminCategory,
  CategoryDirectory,
} from "@/lib/category-management";
import { useCommerce } from "../commerce-provider";
import { Button, Modal } from "../ui";
import { useAdmin } from "./admin-provider";
import {
  AdminHeading,
  AdminPagination,
  AdminSearch,
  AdminStatus,
  AdminTable,
  useAdminFilters,
} from "./admin-ui";
import { ResourceStatus, useAdminResource } from "./admin-resource";
import { CategoryEditor } from "./category-editor";

export function AdminCategories() {
  const resource = useAdminResource<CategoryDirectory>("/admin/categories");
  const { reset } = useAdmin();
  const { sessionUser, notice, reloadCatalog } = useCommerce();
  const canEdit =
    apiMode && ["admin", "boss"].includes(sessionUser?.role || "");
  const filters = useAdminFilters();
  const [editing, setEditing] = useState<AdminCategory | null>(null);
  const [busy, setBusy] = useState(false);
  const rows = (resource.data?.items || []).filter(
    (category) =>
      normalize(
        `${category.name} ${category.slug} ${category.subcategories.join(" ")}`,
      ).includes(normalize(filters.query)) &&
      (filters.filter === "all" ||
        (filters.filter === "visible" ? category.visible : !category.visible)),
  );
  const page = Math.min(filters.page, Math.max(1, Math.ceil(rows.length / 10)));
  const close = () => {
    if (!busy) setEditing(null);
  };
  const saved = () => {
    setEditing(null);
    notice("Đã lưu danh mục.");
    void resource.reload();
    void reset();
    void reloadCatalog().catch(() =>
      notice("Danh mục đã lưu. Chưa thể cập nhật website, hãy tải lại trang."),
    );
  };
  return (
    <>
      <AdminHeading
        title="Danh mục sản phẩm"
        subtitle={`${resource.data?.items.length || 0} danh mục`}
      >
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            loading={resource.loading}
            onClick={() => void resource.reload()}
          >
            <RefreshCw size={16} />
            Làm mới
          </Button>
          {canEdit && (
            <Button
              disabled={!resource.data}
              onClick={() => {
                setBusy(false);
                setEditing({
                  slug: "",
                  name: "",
                  image: "",
                  description: "",
                  subcategories: [],
                  visible: true,
                  sortOrder: Math.min(
                    100000,
                    Math.max(
                      0,
                      ...(resource.data?.items.map((item) => item.sortOrder) ||
                        []),
                    ) + 10,
                  ),
                  revision: 0,
                  productCount: 0,
                });
              }}
            >
              <Plus size={16} />
              Thêm danh mục
            </Button>
          )}
        </div>
      </AdminHeading>
      <ResourceStatus {...resource} />
      {resource.data && (
        <>
          <div className="mb-4 flex flex-wrap gap-3">
            <AdminSearch
              value={filters.query}
              onChange={filters.setQuery}
              placeholder="Tìm danh mục, nhóm sản phẩm..."
            />
            <select
              aria-label="Trạng thái danh mục"
              value={filters.filter}
              onChange={(event) => filters.setFilter(event.target.value)}
              className="bt-input !w-auto"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="visible">Hiển thị</option>
              <option value="hidden">Ẩn danh mục</option>
            </select>
          </div>
          <AdminTable
            headings={[
              "Danh mục",
              "Nhóm sản phẩm",
              "Sản phẩm",
              "Thứ tự",
              "Hiển thị",
              "Thao tác",
            ]}
            empty={!rows.length}
          >
            {rows.slice((page - 1) * 10, page * 10).map((category) => (
              <tr key={category.slug}>
                <td>
                  <div className="flex min-w-52 items-center gap-3">
                    {category.image ? (
                      <Image
                        src={category.image}
                        alt={category.name}
                        width={48}
                        height={48}
                        sizes="48px"
                        quality={85}
                        className="h-12 w-12 shrink-0 rounded border border-border object-cover"
                      />
                    ) : (
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded border border-border bg-section text-text-muted">
                        <ImageIcon size={20} />
                      </span>
                    )}
                    <div className="min-w-0">
                      <span className="block font-medium text-primary">
                        {category.name}
                      </span>
                      <span className="mt-1 block text-xs text-text-muted">
                        {category.slug}
                      </span>
                    </div>
                  </div>
                </td>
                <td>
                  <span className="block max-w-64 text-xs leading-5 text-text-secondary">
                    {category.subcategories.join(" · ") || "-"}
                  </span>
                </td>
                <td className="tabular-nums">{category.productCount}</td>
                <td className="tabular-nums">{category.sortOrder}</td>
                <td>
                  <AdminStatus
                    value={category.visible ? "Hiển thị" : "Ẩn danh mục"}
                  />
                </td>
                <td>
                  <div className="flex gap-1">
                    {canEdit && (
                      <button
                        type="button"
                        className="bt-icon-button"
                        title="Sửa danh mục"
                        aria-label={`Sửa danh mục ${category.name}`}
                        onClick={() => {
                          setBusy(false);
                          setEditing(category);
                        }}
                      >
                        <Pencil size={16} />
                      </button>
                    )}
                    {category.visible && (
                      <Link
                        className="bt-icon-button"
                        href={`/category/${category.slug}`}
                        title="Xem danh mục"
                        aria-label={`Xem danh mục ${category.name}`}
                      >
                        <Eye size={16} />
                      </Link>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </AdminTable>
          <AdminPagination
            count={rows.length}
            page={page}
            onChange={filters.setPage}
          />
        </>
      )}
      {!apiMode && (
        <div className="flex items-center gap-2 py-8 text-sm text-text-secondary">
          <FolderTree size={18} />
          Chức năng này cần kết nối backend.
        </div>
      )}
      <Modal
        open={!!editing}
        onClose={close}
        title={editing?.revision ? "Sửa danh mục" : "Thêm danh mục"}
        busy={busy}
      >
        {editing && (
          <CategoryEditor
            key={`${editing.slug}:${editing.revision}`}
            category={editing}
            onSaved={saved}
            onCancel={close}
            onBusyChange={setBusy}
          />
        )}
      </Modal>
    </>
  );
}

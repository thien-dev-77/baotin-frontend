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
import { apiMode, api } from "@/lib/api-client";
import { normalize } from "@/lib/catalog";
import { categoryLabel } from "@/lib/category-tree";
import type {
  AdminCategory,
  CategoryDirectory,
  SelectedCategory,
} from "@/lib/category-management";
import { MAX_BULK_CATEGORIES } from "@/lib/category-management";
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
import { CatalogTemplateDownload } from "./catalog-template-download";
import { CategoryBulkActions } from "./category-bulk-actions";
import { AdminSelectionCheckbox } from "./admin-selection-checkbox";
import { CategoryTreeSort } from "./category-tree-sort";

export function AdminCategories() {
  const resource = useAdminResource<CategoryDirectory>("/admin/categories");
  const { reset, readCache } = useAdmin();
  const { sessionUser, notice, reloadCatalog } = useCommerce();
  const canEdit =
    apiMode && ["admin", "boss"].includes(sessionUser?.role || "");
  const filters = useAdminFilters();
  const [editing, setEditing] = useState<AdminCategory | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "tree">("table");
  const [busy, setBusy] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const selectionBusy = bulkBusy || busy || resource.loading;
  const selectionScope = JSON.stringify([sessionUser?.id, sessionUser?.role, filters.query, filters.filter]);
  const [selection, setSelection] = useState<{ scope: string; items: SelectedCategory[] }>({ scope: selectionScope, items: [] });
  const selected = selection.scope === selectionScope ? selection.items : [];
  const select = (items: SelectedCategory[]) => setSelection({ scope: selectionScope, items });
  const rows = (resource.data?.items || []).filter(
    (category) =>
      normalize(
        `${category.name} ${category.slug} ${category.subcategories.join(" ")}`,
      ).includes(normalize(filters.query)) &&
      (filters.filter === "all" ||
        (filters.filter === "visible" ? category.visible : !category.visible)),
  );
  const page = Math.min(filters.page, Math.max(1, Math.ceil(rows.length / 10)));
  const visibleRows = rows.slice((page - 1) * 10, page * 10);
  const selectedSlugs = new Set(selected.map(category => category.slug));
  const checkedCount = visibleRows.filter(category => selectedSlugs.has(category.slug)).length;
  const toggle = (category: AdminCategory) => {
    if (selectedSlugs.has(category.slug)) { select(selected.filter(item => item.slug !== category.slug)); return; }
    if (selected.length < MAX_BULK_CATEGORIES) select([...selected, { slug: category.slug, name: category.name, revision: category.revision }]);
  };
  const togglePage = () => {
    if (checkedCount === visibleRows.length) { const slugs = new Set(visibleRows.map(category => category.slug)); select(selected.filter(category => !slugs.has(category.slug))); return; }
    select([...selected, ...visibleRows.filter(category => !selectedSlugs.has(category.slug)).map(({ slug, name, revision }) => ({ slug, name, revision }))].slice(0, MAX_BULK_CATEGORIES));
  };
  const close = () => {
    if (!busy) setEditing(null);
  };
  const saved = () => {
    select([]);
    setEditing(null);
    notice("Đã lưu danh mục.");
    void resource.reload();
    void reset();
    void reloadCatalog().catch(() =>
      notice("Danh mục đã lưu. Chưa thể cập nhật website, hãy tải lại trang."),
    );
  };
  const saveSortOrder = async (reordered: { slug: string; sortOrder: number }[]) => {
    setBusy(true);
    try {
      // Update sort order via bulk PATCH (would need a new endpoint)
      // For now, we'll update one by one - in production, add a bulk sort endpoint
      for (const item of reordered) {
        const category = resource.data!.items.find(c => c.slug === item.slug);
        if (category && category.sortOrder !== item.sortOrder) {
          await api(`/admin/categories/${encodeURIComponent(item.slug)}`, {
            method: "PATCH",
            body: JSON.stringify({
              name: category.name,
              slug: category.slug,
              image: category.image,
              description: category.description,
              subcategories: category.subcategories,
              sortOrder: item.sortOrder,
              visible: category.visible,
              parentSlug: category.parentSlug || "",
              revision: category.revision,
            }),
          });
        }
      }
      notice("Đã lưu thứ tự danh mục.");
      void resource.reload();
      void reset();
      void reloadCatalog().catch(() =>
        notice("Thứ tự đã lưu. Chưa thể cập nhật website, hãy tải lại trang."),
      );
    } catch (cause) {
      notice(cause instanceof Error ? cause.message : "Không thể lưu thứ tự.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <AdminHeading
        title="Danh mục sản phẩm"
        subtitle={`${resource.data?.items.length || 0} danh mục`}
      >
        <div className="flex flex-wrap gap-2">
          <CatalogTemplateDownload />
          {canEdit && resource.data && (
            <Button
              variant={viewMode === "tree" ? "primary" : "secondary"}
              disabled={selectionBusy}
              onClick={() => setViewMode(viewMode === "tree" ? "table" : "tree")}
            >
              <FolderTree size={16} />
              {viewMode === "tree" ? "Xem bảng" : "Sắp xếp cây"}
            </Button>
          )}
          <Button
            variant="secondary"
            loading={resource.loading}
            disabled={bulkBusy || busy}
            onClick={() => { select([]); setViewMode("table"); void resource.reload(); }}
          >
            <RefreshCw size={16} />
            Làm mới
          </Button>
          {canEdit && (
            <Button
              disabled={!resource.data || selectionBusy}
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
      {resource.data && viewMode === "tree" && (
        <div className="mt-6">
          <CategoryTreeSort
            categories={resource.data.items}
            onSave={saveSortOrder}
            busy={busy}
          />
        </div>
      )}
      {resource.data && viewMode === "table" && (
        <>
          <fieldset disabled={bulkBusy} className="mb-4 flex min-w-0 flex-wrap gap-3">
            <AdminSearch
              value={filters.query}
              onChange={value => { select([]); filters.setQuery(value); }}
              placeholder="Tìm danh mục, nhóm sản phẩm..."
            />
            <select
              aria-label="Trạng thái danh mục"
              value={filters.filter}
              onChange={(event) => { select([]); filters.setFilter(event.target.value); }}
              className="bt-input !w-auto max-w-full"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="visible">Hiển thị</option>
              <option value="hidden">Ẩn danh mục</option>
            </select>
          </fieldset>
          {canEdit && <CategoryBulkActions selected={selected} total={rows.length} busy={selectionBusy} setBusy={setBulkBusy} clear={() => select([])} selectAll={() => select(rows.map(({ slug, name, revision }) => ({ slug, name, revision })))} onUpdated={async result => {
            notice(`Đã ${result.visible ? "hiển thị" : "ẩn"} ${result.updated} danh mục.`);
            if (readCache) {
              readCache.invalidate(path => path.startsWith("/admin/browse?") && new URLSearchParams(path.split("?")[1]).get("resource") === "products");
              await readCache.refresh(path => path === "/admin/categories");
            } else await resource.reload();
            void reloadCatalog().catch(() => notice("Đã lưu danh mục. Chưa thể làm mới website, hãy tải lại trang."));
          }} />}
          <AdminTable
            className={canEdit ? "bt-admin-categories-selectable" : ""}
            headings={[
              ...(canEdit ? [<AdminSelectionCheckbox key="selection" aria-label="Chọn tất cả danh mục trên trang" checked={Boolean(visibleRows.length && checkedCount === visibleRows.length)} mixed={checkedCount > 0 && checkedCount < visibleRows.length} disabled={selectionBusy || !visibleRows.length} onChange={togglePage} />] : []),
              "Danh mục",
              "Danh mục cha",
              "Sản phẩm",
              "Thứ tự",
              "Hiển thị",
              "Thao tác",
            ]}
            empty={!rows.length}
          >
            {visibleRows.map((category) => (
              <tr key={category.slug}>
                {canEdit && <td><AdminSelectionCheckbox aria-label={`Chọn danh mục ${category.name}`} checked={selectedSlugs.has(category.slug)} disabled={selectionBusy || !selectedSlugs.has(category.slug) && selected.length >= MAX_BULK_CATEGORIES} onChange={() => toggle(category)} /></td>}
                <td>
                  <div className="flex min-w-0 items-center gap-3">
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
                      <span className="block break-words font-medium text-primary">
                        {category.name}
                      </span>
                      <span className="mt-1 block break-all text-xs text-text-muted">
                        {category.slug}
                      </span>
                    </div>
                  </div>
                </td>
                <td>
                  <span className="block max-w-64 text-xs leading-5 text-text-secondary">
                    {category.parentSlug ? categoryLabel(resource.data!.items, category.parentSlug) : "Danh mục gốc"}
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
                        disabled={selectionBusy}
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
          <fieldset disabled={bulkBusy}><AdminPagination
            count={rows.length}
            page={page}
            onChange={filters.setPage}
          /></fieldset>
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
            categories={resource.data?.items || []}
            onSaved={saved}
            onCancel={close}
            onBusyChange={setBusy}
          />
        )}
      </Modal>
    </>
  );
}

"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Image from "next/image";
import { ChevronRight, GripVertical, ImageIcon, Save } from "lucide-react";
import type { AdminCategory } from "@/lib/category-management";
import { categoryLabel } from "@/lib/category-tree";
import { Button } from "../ui";

interface CategoryTreeNode extends AdminCategory {
  children?: CategoryTreeNode[];
  level: number;
}

interface CategoryTreeSortProps {
  categories: AdminCategory[];
  onSave: (reordered: { slug: string; sortOrder: number }[]) => Promise<void>;
  busy?: boolean;
}

function buildTree(categories: AdminCategory[]): CategoryTreeNode[] {
  const map = new Map<string, CategoryTreeNode>();
  const roots: CategoryTreeNode[] = [];

  // Create nodes
  categories.forEach((cat) => {
    map.set(cat.slug, { ...cat, children: [], level: 0 });
  });

  // Build tree structure
  categories.forEach((cat) => {
    const node = map.get(cat.slug)!;
    if (!cat.parentSlug) {
      roots.push(node);
    } else {
      const parent = map.get(cat.parentSlug);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(node);
        node.level = parent.level + 1;
      } else {
        // Parent not found, treat as root
        roots.push(node);
      }
    }
  });

  // Sort by sortOrder
  const sortNodes = (nodes: CategoryTreeNode[]) => {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder);
    nodes.forEach((node) => {
      if (node.children && node.children.length > 0) {
        sortNodes(node.children);
      }
    });
  };

  sortNodes(roots);
  return roots;
}

function flattenTree(nodes: CategoryTreeNode[]): CategoryTreeNode[] {
  const result: CategoryTreeNode[] = [];
  const traverse = (items: CategoryTreeNode[]) => {
    items.forEach((node) => {
      result.push(node);
      if (node.children && node.children.length > 0) {
        traverse(node.children);
      }
    });
  };
  traverse(nodes);
  return result;
}

function SortableItem({
  node,
  allCategories,
}: {
  node: CategoryTreeNode;
  allCategories: AdminCategory[];
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: node.slug });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const [collapsed, setCollapsed] = useState(false);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className={`flex items-center gap-2 rounded-md border border-border bg-white p-3 hover:bg-section ${
          isDragging ? "shadow-lg" : ""
        }`}
        style={{ marginLeft: `${node.level * 24}px` }}
      >
        <button
          type="button"
          className="cursor-grab touch-none text-text-muted active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={18} />
        </button>

        {hasChildren && (
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="flex h-6 w-6 items-center justify-center rounded hover:bg-section"
          >
            <ChevronRight
              size={16}
              className={`transition-transform ${collapsed ? "" : "rotate-90"}`}
            />
          </button>
        )}

        {!hasChildren && <div className="w-6" />}

        {node.image ? (
          <Image
            src={node.image}
            alt={node.name}
            width={40}
            height={40}
            sizes="40px"
            quality={85}
            className="h-10 w-10 shrink-0 rounded border border-border object-cover"
          />
        ) : (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-border bg-section text-text-muted">
            <ImageIcon size={16} />
          </span>
        )}

        <div className="min-w-0 flex-1">
          <div className="font-medium text-primary">{node.name}</div>
          <div className="text-xs text-text-secondary">
            {node.parentSlug
              ? `${categoryLabel(allCategories, node.parentSlug)} • `
              : ""}
            Thứ tự: {node.sortOrder}
          </div>
        </div>

        <div className="text-xs text-text-secondary">{node.productCount} SP</div>
      </div>

      {hasChildren && !collapsed && (
        <div className="mt-2 space-y-2">
          {node.children!.map((child) => (
            <SortableItem
              key={child.slug}
              node={child}
              allCategories={allCategories}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function CategoryTreeSort({
  categories,
  onSave,
  busy = false,
}: CategoryTreeSortProps) {
  const [tree, setTree] = useState(() => buildTree(categories));
  const [hasChanges, setHasChanges] = useState(false);
  const flatItems = flattenTree(tree);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = flatItems.findIndex((item) => item.slug === active.id);
    const newIndex = flatItems.findIndex((item) => item.slug === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // Reorder flat list
    const reordered = arrayMove(flatItems, oldIndex, newIndex);

    // Update sortOrder based on new positions
    const updatedFlat = reordered.map((item, index) => ({
      ...item,
      sortOrder: index * 10,
    }));

    // Rebuild tree from flat list
    const newTree = buildTree(
      updatedFlat.map((node) => ({
        slug: node.slug,
        name: node.name,
        image: node.image,
        description: node.description,
        subcategories: node.subcategories,
        visible: node.visible,
        sortOrder: node.sortOrder,
        revision: node.revision,
        productCount: node.productCount,
        parentSlug: node.parentSlug,
      })),
    );

    setTree(newTree);
    setHasChanges(true);
  };

  const handleSave = async () => {
    const updates = flattenTree(tree).map((node) => ({
      slug: node.slug,
      sortOrder: node.sortOrder,
    }));

    await onSave(updates);
    setHasChanges(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        <p>Kéo thả để sắp xếp lại danh mục. Nhấn <strong>Lưu thứ tự</strong> để áp dụng thay đổi.</p>
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={!hasChanges || busy}
          loading={busy}
        >
          <Save size={16} />
          Lưu thứ tự
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={flatItems.map((item) => item.slug)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {tree.map((node) => (
              <SortableItem
                key={node.slug}
                node={node}
                allCategories={categories}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {hasChanges && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Bạn có thay đổi chưa lưu. Nhớ nhấn <strong>Lưu thứ tự</strong> trước khi rời khỏi trang.
        </div>
      )}
    </div>
  );
}

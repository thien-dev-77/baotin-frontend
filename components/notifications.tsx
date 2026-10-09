"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Bell,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { useCommerce } from "./commerce-provider";
import { Button, EmptyState, PageHeading, Tabs } from "./ui";
import { api, apiMode } from "@/lib/api-client";
import { useApiResource } from "@/lib/use-api-resource";
import { ResourceStatus } from "./admin/admin-resource";

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  href: string;
  readAt: string | null;
  createdAt: string;
};
type Inbox = {
  items: Notification[];
  unreadCount: number;
  total: number;
  pageSize: number;
};
type NotificationCount = { unreadCount: number };
function readNotificationCount(value: unknown): NotificationCount {
  if (
    !value ||
    typeof value !== "object" ||
    !("unreadCount" in value) ||
    typeof value.unreadCount !== "number" ||
    !Number.isSafeInteger(value.unreadCount) ||
    value.unreadCount < 0
  ) throw new Error("Số lượng thông báo không hợp lệ.");
  return { unreadCount: value.unreadCount };
}
const Context = createContext<{
  unreadCount: number;
  refresh: () => Promise<void>;
}>({ unreadCount: 0, refresh: async () => {} });
export function NotificationsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { sessionUser } = useCommerce();
  const resource = useApiResource<NotificationCount>(
    "/notifications/count",
    apiMode && !!sessionUser,
    undefined,
    readNotificationCount,
  );
  const reload = resource.reload;
  useEffect(() => {
    if (!apiMode || !sessionUser) return;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void reload();
    }, 30000);
    return () => clearInterval(timer);
  }, [reload, sessionUser]);
  return (
    <Context.Provider
      value={{
        unreadCount: resource.data?.unreadCount || 0,
        refresh: resource.reload,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function NotificationBell() {
  const { sessionUser } = useCommerce();
  const { unreadCount } = useContext(Context);
  if (!apiMode || !sessionUser) return null;
  return (
    <Link
      href={
        sessionUser.role === "b2b"
          ? "/account/notifications"
          : "/admin/notifications"
      }
      className="bt-icon-button relative shrink-0"
      title="Thông báo"
      aria-label={`Thông báo, ${unreadCount} chưa đọc`}
    >
      <Bell size={20} />
      {unreadCount > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-semibold text-white">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
export function NotificationsPage() {
  const { sessionUser } = useCommerce();
  const summary = useContext(Context);
  const [tab, setTab] = useState("Tất cả");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const resource = useApiResource<Inbox>(
    `/notifications?page=${page}&unread=${tab === "Chưa đọc"}&type=${encodeURIComponent(type)}`,
    apiMode && !!sessionUser,
  );
  const [pending, setPending] = useState("");
  const lock = useRef(false);
  const [error, setError] = useState("");
  const active = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const mark = async (id?: string) => {
    if (lock.current) return;
    lock.current = true;
    setPending(id || "all");
    setError("");
    try {
      await api("/notifications/read", {
        method: "PATCH",
        body: JSON.stringify(id ? { id } : {}),
      });
      if (active.current) {
        if (tab === "Chưa đọc") setPage(1);
        await resource.reload();
      }
      await summary.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể cập nhật.");
    } finally {
      lock.current = false;
      setPending("");
    }
  };
  const total = resource.data?.total || 0;
  return (
    <section>
      <PageHeading title="Thông báo">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            loading={pending === "all"}
            disabled={!!pending || !resource.data?.unreadCount}
            onClick={() => void mark()}
          >
            <CheckCheck size={16} />
            Đọc tất cả
          </Button>
          <Button
            variant="ghost"
            className="bt-icon-button"
            title="Làm mới"
            aria-label="Làm mới thông báo"
            loading={resource.loading}
            onClick={() => void resource.reload()}
          >
            <RefreshCw size={17} />
          </Button>
        </div>
      </PageHeading>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Tabs
          options={["Tất cả", "Chưa đọc"]}
          value={tab}
          onChange={(value) => {
            setTab(value);
            setPage(1);
          }}
        />
        <select
          aria-label="Loại thông báo"
          value={type}
          onChange={(event) => {
            setType(event.target.value);
            setPage(1);
          }}
          className="bt-input !w-auto"
        >
          <option value="">Mọi loại</option>
          {[
            ["order", "Đơn hàng"],
            ["approval", "Duyệt giá"],
            ["credit", "Công nợ"],
            ["payment", "Thanh toán"],
            ["account", "Tài khoản"],
            ["consultation", "Tư vấn"],
            ["integration", "Đồng bộ"],
            ["review", "Đánh giá"],
          ].map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      {error && (
        <p role="alert" className="mb-3 text-sm text-danger">
          {error}
        </p>
      )}
      <ResourceStatus {...resource} />
      {resource.data &&
        (resource.data.items.length ? (
          <div className="divide-y divide-border border-y border-border">
            {resource.data.items.map((item) => (
              <article
                key={item.id}
                className={`flex items-start gap-3 p-4 ${item.readAt ? "bg-white" : "bg-section-blue"}`}
              >
                <Bell size={19} className="mt-1 shrink-0 text-blue-brand" />
                <Link
                  href={item.href}
                  className="min-w-0 flex-1"
                  onClick={() => {
                    if (!item.readAt) void mark(item.id);
                  }}
                >
                  <h2
                    className={`break-words text-sm text-primary ${item.readAt ? "font-medium" : "font-semibold"}`}
                  >
                    {item.title}
                  </h2>
                  <p className="mt-1 break-words text-sm text-text-secondary">
                    {item.message}
                  </p>
                  <time className="mt-2 block text-xs text-text-muted">
                    {new Date(item.createdAt).toLocaleString("vi-VN")}
                  </time>
                </Link>
                {!item.readAt && (
                  <Button
                    variant="ghost"
                    className="bt-icon-button"
                    title="Đánh dấu đã đọc"
                    aria-label={`Đánh dấu đã đọc: ${item.title}`}
                    loading={pending === item.id}
                    disabled={!!pending}
                    onClick={() => void mark(item.id)}
                  >
                    <Check size={17} />
                  </Button>
                )}
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Bell size={30} />}
            title={
              tab === "Chưa đọc"
                ? "Không có thông báo chưa đọc"
                : "Chưa có thông báo"
            }
          />
        ))}
      {total > 20 && (
        <div className="mt-4 flex items-center justify-end gap-3 text-sm">
          <span>
            {page} / {Math.ceil(total / 20)}
          </span>
          <Button
            variant="secondary"
            className="bt-icon-button"
            title="Trang trước"
            aria-label="Trang trước"
            disabled={page <= 1 || resource.loading}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft size={17} />
          </Button>
          <Button
            variant="secondary"
            className="bt-icon-button"
            title="Trang tiếp"
            aria-label="Trang tiếp"
            disabled={page * 20 >= total || resource.loading}
            onClick={() => setPage(page + 1)}
          >
            <ChevronRight size={17} />
          </Button>
        </div>
      )}
    </section>
  );
}

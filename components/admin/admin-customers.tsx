"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  Check,
  Download,
  Eye,
  KeyRound,
  Pause,
  Pencil,
  Plus,
} from "lucide-react";
import { Button, Modal } from "@/components/ui";
import { useAdmin } from "@/components/admin/admin-provider";
import {
  AdminHeading,
  AdminPagination,
  AdminSearch,
  AdminStatus,
  AdminTable,
  useAdminFilters,
} from "@/components/admin/admin-ui";
import { downloadAdminCsv } from "@/lib/admin-preview";
import { money, normalize } from "@/lib/catalog";
import { apiMode } from "@/lib/api-client";
import { useApiResource } from "@/lib/use-api-resource";
import {
  customerGroups,
  type CustomerDirectory,
  type ManagedCustomer,
} from "@/lib/customer-management";
import { useCommerce } from "../commerce-provider";
import { ResourceStatus } from "./admin-resource";
import { CustomerAccountForm, CustomerEditor } from "./customer-editor";

export function AdminCustomers({
  credit = false,
  initialStatus = "all",
}: {
  credit?: boolean;
  initialStatus?: string;
}) {
  const {
    scopedCustomers,
    customers,
    orders,
    branch,
    setCustomerStatus,
    pendingAction,
    resourceRevision,
    reset,
  } = useAdmin();
  const { sessionUser, notice } = useCommerce();
  const canEdit =
    !!sessionUser && ["admin", "boss", "sales"].includes(sessionUser.role);
  const resource = useApiResource<CustomerDirectory>(
    `/admin/customers?branch=${encodeURIComponent(branch)}`,
    apiMode && !credit,
    resourceRevision,
  );
  const directory =
    resource.data?.items && resource.data.assignees && resource.data.groups
      ? resource.data
      : undefined;
  const filters = useAdminFilters(initialStatus);
  const [selected, setSelected] = useState<string | null>(null);
  const [group, setGroup] = useState("");
  const [pilot, setPilot] = useState("");
  const [salesId, setSalesId] = useState("");
  const [editing, setEditing] = useState<{
    branch: typeof branch;
    customer: ManagedCustomer | null;
    directory: CustomerDirectory;
  } | null>(null);
  const [accountCustomer, setAccountCustomer] =
    useState<ManagedCustomer | null>(null);
  const customer = customers.find((item) => item.id === selected && item.branch === branch);
  const managedCustomer = directory?.items.find((item) => item.id === selected);
  const assigneeName = (id?: string | null) =>
    !id
      ? "Chưa phân công"
      : directory?.assignees.find((user) => user.id === id)?.name ||
        (resource.loading ? "Đang tải..." : "Chưa xác định");
  const groups =
    directory?.groups ||
    Array.from(
      new Set([
        ...customerGroups,
        ...scopedCustomers.map((item) => item.group),
      ]),
    );
  const rows = scopedCustomers.filter(
    (item) =>
      normalize(
        `${item.id} ${item.name} ${item.contact} ${item.phone} ${item.email || ""}`,
      ).includes(normalize(filters.query)) &&
      (filters.filter === "all" ||
        (credit
          ? filters.filter === "overdue"
            ? item.overdue > 0
            : item.debt > item.limit
          : item.status === filters.filter)) &&
      (credit ||
        ((!group || item.group === group) &&
          (!pilot || (pilot === "pilot" ? !!item.pilot : !item.pilot)) &&
          (!salesId ||
            (salesId === "unassigned"
              ? !item.assignedSalesId
              : item.assignedSalesId === salesId)))),
  );
  const page = Math.min(filters.page, Math.max(1, Math.ceil(rows.length / 10)));
  const debt = scopedCustomers.reduce((sum, item) => sum + item.debt, 0);
  const overdue = scopedCustomers.reduce((sum, item) => sum + item.overdue, 0);
  function exportRows() {
    downloadAdminCsv(credit ? "bao-tin-cong-no.csv" : "bao-tin-khach-b2b.csv", [
      [
        "Mã khách",
        "Tên khách",
        "Chi nhánh",
        "Liên hệ",
        "Điện thoại",
        "Trạng thái",
        "Hạn mức",
        "Công nợ",
        "Quá hạn",
        "Nhóm khách",
        "Sales phụ trách",
        "Khách thử nghiệm",
      ],
      ...rows.map((item) => [
        item.id,
        item.name,
        item.branch,
        item.contact,
        item.phone,
        item.status,
        item.limit,
        item.debt,
        item.overdue,
        item.group,
        assigneeName(item.assignedSalesId),
        item.pilot ? "Có" : "Không",
      ]),
    ]);
  }
  return (
    <>
      <AdminHeading
        title={credit ? "Công nợ B2B" : "Khách hàng B2B"}
        subtitle={`${branch} · ${scopedCustomers.length} khách hàng${credit ? "" : ` · ${scopedCustomers.filter((item) => item.pilot).length} khách thử nghiệm`}`}
      >
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={exportRows}
            disabled={!rows.length}
          >
            <Download size={16} />
            Xuất CSV
          </Button>
          {!credit && apiMode && canEdit && (
            <Button
              disabled={!directory || !!pendingAction}
              onClick={() =>
                setEditing({ branch, customer: null, directory: directory! })
              }
            >
              <Plus size={16} />
              Thêm khách B2B
            </Button>
          )}
        </div>
      </AdminHeading>
      {credit && (
        <dl className="mb-6 grid gap-4 border-y border-border bg-white px-4 py-5 sm:grid-cols-3">
          <div>
            <dt className="text-xs text-text-muted">Tổng công nợ</dt>
            <dd className="mt-2 text-xl font-bold tabular-nums text-primary">
              {money(debt)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-text-muted">Khoản quá hạn</dt>
            <dd className="mt-2 text-xl font-bold tabular-nums text-danger">
              {money(overdue)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-text-muted">Khách vượt hạn mức</dt>
            <dd className="mt-2 text-xl font-bold text-primary">
              {scopedCustomers.filter((item) => item.debt > item.limit).length}
            </dd>
          </div>
        </dl>
      )}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <AdminSearch
          value={filters.query}
          onChange={filters.setQuery}
          placeholder="Tìm mã khách, tên, số điện thoại..."
        />
        <select
          aria-label={credit ? "Tình trạng công nợ" : "Trạng thái khách hàng"}
          value={filters.filter}
          onChange={(event) => filters.setFilter(event.target.value)}
          className="bt-input !w-auto"
        >
          <option value="all">
            Tất cả {credit ? "công nợ" : "trạng thái"}
          </option>
          {credit ? (
            <>
              <option value="overdue">Có nợ quá hạn</option>
              <option value="overlimit">Vượt hạn mức</option>
            </>
          ) : (
            ["Chờ duyệt", "Đang hoạt động", "Tạm ngưng"].map((status) => (
              <option key={status}>{status}</option>
            ))
          )}
        </select>
      </div>
      {!credit && (
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <select
            className="bt-input"
            aria-label="Lọc nhóm khách"
            value={group}
            onChange={(event) => {
              setGroup(event.target.value);
              filters.setPage(1);
            }}
          >
            <option value="">Tất cả nhóm khách</option>
            {groups.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
          <select
            className="bt-input"
            aria-label="Lọc Sales phụ trách"
            value={salesId}
            onChange={(event) => {
              setSalesId(event.target.value);
              filters.setPage(1);
            }}
          >
            <option value="">Tất cả Sales</option>
            <option value="unassigned">Chưa phân công</option>
            {directory?.assignees.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
                {user.disabled ? " (tạm ngưng)" : ""}
              </option>
            ))}
          </select>
          <select
            className="bt-input"
            aria-label="Lọc khách thử nghiệm"
            value={pilot}
            onChange={(event) => {
              setPilot(event.target.value);
              filters.setPage(1);
            }}
          >
            <option value="">Tất cả khách hàng</option>
            <option value="pilot">Khách thử nghiệm</option>
            <option value="regular">Khách ngoài thử nghiệm</option>
          </select>
        </div>
      )}
      {!credit && apiMode && <ResourceStatus {...resource} />}
      <AdminTable
        headings={
          credit
            ? [
                "Khách hàng",
                "Hạn mức",
                "Công nợ",
                "Quá hạn",
                "Tình trạng",
                "Thao tác",
              ]
            : [
                "Khách hàng",
                "Người liên hệ",
                "Nhóm khách",
                "Sales phụ trách",
                "Trạng thái",
                "Thao tác",
              ]
        }
        empty={!rows.length}
      >
        {rows.slice((page - 1) * 10, page * 10).map((item) => (
          <tr key={item.id}>
            <td>
              <button
                type="button"
                onClick={() => setSelected(item.id)}
                className="text-left font-semibold text-primary hover:text-blue-brand"
              >
                {item.name}
              </button>
              <span className="mt-1 block text-xs text-text-muted">
                {item.id}
              </span>
              {!credit && item.pilot && (
                <span className="mt-1 inline-block rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-brand">
                  Thử nghiệm
                </span>
              )}
            </td>
            {credit ? (
              <>
                <td className="whitespace-nowrap tabular-nums">
                  {money(item.limit)}
                </td>
                <td className="whitespace-nowrap font-semibold tabular-nums text-primary">
                  {money(item.debt)}
                </td>
                <td
                  className={`whitespace-nowrap tabular-nums ${item.overdue ? "font-medium text-danger" : "text-text-muted"}`}
                >
                  {money(item.overdue)}
                </td>
                <td>
                  <div className="flex flex-wrap gap-1">
                    {item.overdue > 0 && <AdminStatus value="Quá hạn" />}
                    {item.debt > item.limit && (
                      <AdminStatus value="Vượt hạn mức" />
                    )}
                    {!item.overdue && item.debt <= item.limit && (
                      <AdminStatus value="Trong hạn mức" />
                    )}
                  </div>
                </td>
              </>
            ) : (
              <>
                <td>
                  {item.contact}
                  <span className="mt-1 block text-xs text-text-muted">
                    {item.phone}
                  </span>
                </td>
                <td>{item.group}</td>
                <td>{assigneeName(item.assignedSalesId)}</td>
                <td>
                  <AdminStatus value={item.status} />
                </td>
              </>
            )}
            <td>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setSelected(item.id)}
                  className="bt-icon-button"
                  title="Hồ sơ khách hàng"
                  aria-label={`Xem khách ${item.id}`}
                >
                  <Eye size={17} />
                </button>
                {!credit && apiMode && canEdit && (
                  <button
                    type="button"
                    className="bt-icon-button"
                    title="Sửa hồ sơ khách"
                    aria-label={`Sửa khách ${item.id}`}
                    disabled={
                      !directory?.items.some((row) => row.id === item.id) ||
                      !!pendingAction
                    }
                    onClick={() =>
                      setEditing({
                        branch,
                        customer: directory!.items.find(
                          (row) => row.id === item.id,
                        )!,
                        directory: directory!,
                      })
                    }
                  >
                    <Pencil size={17} />
                  </button>
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
      <Modal
        open={!!customer}
        onClose={() => setSelected(null)}
        busy={!!pendingAction}
        title="Hồ sơ khách hàng B2B"
      >
        {customer && (
          <>
            <div className="mb-5">
              <p className="text-xs text-text-muted">
                {customer.id} · {customer.branch}
              </p>
              <h3 className="mb-3 mt-1 text-lg font-semibold text-primary">
                {customer.name}
              </h3>
              <AdminStatus value={customer.status} />
            </div>
            <dl className="grid grid-cols-2 gap-4 border-y border-border py-4 text-sm">
              {[
                ["Người liên hệ", customer.contact],
                ["Điện thoại", customer.phone],
                ["Nhóm khách", customer.group],
                ["Hạn mức", money(customer.limit)],
                ["Công nợ", money(customer.debt)],
                ["Khoản quá hạn", money(customer.overdue)],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-text-muted">{label}</dt>
                  <dd className="mt-1 break-words font-medium text-primary">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
            {!credit && (
              <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
                {[
                  ["Sales phụ trách", assigneeName(customer.assignedSalesId)],
                  ["Khách thử nghiệm", customer.pilot ? "Có" : "Không"],
                  ["Email", managedCustomer?.email || customer.email || "—"],
                  ["Mã số thuế", managedCustomer?.tax || customer.tax || "—"],
                  [
                    "Địa chỉ",
                    managedCustomer?.address || customer.address || "—",
                  ],
                  [
                    "Tài khoản B2B",
                    managedCustomer
                      ? managedCustomer.account
                        ? managedCustomer.account.disabled
                          ? "Tạm ngưng đăng nhập"
                          : "Đã tạo"
                        : "Chưa tạo"
                      : "—",
                  ],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs text-text-muted">{label}</dt>
                    <dd className="mt-1 break-words font-medium text-primary">
                      {value}
                    </dd>
                  </div>
                ))}
                {customer.notes && (
                  <div className="col-span-2">
                    <dt className="text-xs text-text-muted">
                      Ghi chú chăm sóc
                    </dt>
                    <dd className="mt-1 whitespace-pre-wrap break-words">
                      {customer.notes}
                    </dd>
                  </div>
                )}
              </dl>
            )}
            <h3 className="mb-2 mt-5 text-sm font-semibold text-primary">
              Đơn hàng gần đây
            </h3>
            <div className="mb-5 divide-y divide-border">
              {orders
                .filter((item) => item.customerId === customer.id)
                .slice(0, 4)
                .map((order) => (
                  <Link
                    key={order.id}
                    href={`/admin/orders?order=${order.id}`}
                    className="flex items-center justify-between gap-2 py-3 text-xs"
                  >
                    <span className="font-medium text-blue-brand">
                      {order.id}
                    </span>
                    <span className="tabular-nums">{money(order.total)}</span>
                    <ArrowRight size={14} />
                  </Link>
                ))}
              {!orders.some((item) => item.customerId === customer.id) && (
                <p className="py-3 text-xs text-text-muted">
                  Chưa có đơn hàng.
                </p>
              )}
            </div>
            {!credit && (
              <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
                {apiMode && canEdit && managedCustomer && (
                  <>
                    <Button
                      variant="secondary"
                      disabled={!!pendingAction}
                      onClick={() => {
                        setSelected(null);
                        setEditing({
                          branch,
                          customer: managedCustomer,
                          directory: directory!,
                        });
                      }}
                    >
                      <Pencil size={16} />
                      Sửa hồ sơ
                    </Button>
                    {!managedCustomer.account && (
                      <Button
                        variant="secondary"
                        disabled={!!pendingAction}
                        onClick={() => {
                          setSelected(null);
                          setAccountCustomer(managedCustomer);
                        }}
                      >
                        <KeyRound size={16} />
                        Tạo tài khoản
                      </Button>
                    )}
                  </>
                )}
                <Button
                  variant={
                    customer.status === "Đang hoạt động"
                      ? "secondary"
                      : "primary"
                  }
                  loading={
                    pendingAction?.action === "customer-status" &&
                    pendingAction.id === customer.id
                  }
                  disabled={!!pendingAction || (apiMode && !canEdit)}
                  onClick={() =>
                    setCustomerStatus(
                      customer.id,
                      customer.status === "Đang hoạt động"
                        ? "Tạm ngưng"
                        : "Đang hoạt động",
                    )
                  }
                >
                  {customer.status === "Đang hoạt động" ? (
                    <Pause size={16} />
                  ) : (
                    <Check size={16} />
                  )}
                  {customer.status === "Đang hoạt động"
                    ? "Tạm ngưng tài khoản"
                    : "Kích hoạt tài khoản"}
                </Button>
              </div>
            )}
          </>
        )}
      </Modal>
      {editing?.branch === branch && (
        <CustomerEditor
          key={`${branch}-${editing.customer?.id || "new"}-${editing.customer?.revision || 0}`}
          customer={editing.customer}
          branch={branch}
          directory={editing.directory}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            notice("Đã lưu hồ sơ khách B2B.");
            await reset();
          }}
        />
      )}
      {accountCustomer?.branch === branch && (
        <CustomerAccountForm
          key={`${accountCustomer.id}-${accountCustomer.revision}`}
          customer={accountCustomer}
          onClose={() => setAccountCustomer(null)}
          onSaved={async () => {
            setAccountCustomer(null);
            notice("Đã tạo tài khoản B2B.");
            await reset();
          }}
        />
      )}
    </>
  );
}

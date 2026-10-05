"use client";

import { useState } from "react";
import { KeyRound, Pencil, Plus, Save } from "lucide-react";
import { api } from "@/lib/api-client";
import { branches, type Branch, type SessionUser } from "@/lib/types";
import { PasswordInput } from "../password-form";
import { Button, Field, Modal } from "../ui";
import { useCommerce } from "../commerce-provider";
import { AdminHeading, AdminSearch, AdminStatus } from "./admin-ui";
import { ResourceStatus, useAdminResource } from "./admin-resource";

type User = Pick<SessionUser, "id" | "email" | "name" | "role" | "branches"> & {
  disabled: boolean;
  revision?: number;
};
const roles = {
  admin: "Quản trị viên",
  boss: "Quản lý",
  sales: "Inside Sales",
  warehouse: "Kho hàng",
  accountant: "Kế toán",
  b2b: "Khách B2B",
};
export function AdminUsers() {
  const { sessionUser, refreshSession, notice } = useCommerce();
  const resource = useAdminResource<{ users: User[] }>("/admin/users");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<User | null>(null);
  const [passwordUser, setPasswordUser] = useState<User | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save(
    event: React.FormEvent<HTMLFormElement>,
    passwordOnly: boolean,
  ) {
    event.preventDefault();
    if (busy) return;
    const value = passwordOnly ? passwordUser : editing;
    if (!value) return;
    const data = new FormData(event.currentTarget);
    const password = String(data.get("password") || "");
    if ((passwordOnly || !value.id) && password !== data.get("confirm")) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api(
        passwordOnly ? `/admin/users/${value.id}/password` : "/admin/users",
        {
          method: "POST",
          body: JSON.stringify(
            passwordOnly
              ? { password }
              : {
                  id: value.id || undefined,
                  revision: value.revision,
                  name: value.name,
                  email: value.email,
                  role: value.role,
                  branches: value.branches,
                  disabled: value.disabled,
                  ...(!value.id ? { password } : {}),
                },
          ),
        },
      );
      setEditing(null);
      setPasswordUser(null);
      notice("Đã cập nhật tài khoản.");
      if (value.id === sessionUser?.id) await refreshSession();
      else await resource.reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể lưu.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <AdminHeading title="Tài khoản & phân quyền">
        <Button
          onClick={() => {
            setError("");
            setEditing({
              id: "",
              email: "",
              name: "",
              role: "sales",
              branches: [sessionUser!.branches[0]],
              disabled: false,
            });
          }}
        >
          <Plus size={16} />
          Tạo nhân viên
        </Button>
      </AdminHeading>
      <div className="mb-4 flex">
        <AdminSearch
          value={query}
          onChange={setQuery}
          placeholder="Tìm nhân viên, email"
        />
      </div>
      {!resource.data ? (
        <ResourceStatus {...resource} />
      ) : (
        <div className="overflow-auto">
          <table className="bt-table">
            <thead>
              <tr>
                <th>Tài khoản</th>
                <th>Vai trò</th>
                <th>Chi nhánh</th>
                <th>Trạng thái</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {resource.data.users
                .filter((user) =>
                  `${user.name} ${user.email}`
                    .toLowerCase()
                    .includes(query.toLowerCase()),
                )
                .map((user) => (
                  <tr key={user.id}>
                    <td>
                      {user.name}
                      <span className="block text-xs text-text-secondary">
                        {user.email}
                      </span>
                    </td>
                    <td>{roles[user.role]}</td>
                    <td>{user.branches.join(", ")}</td>
                    <td>
                      <AdminStatus
                        value={user.disabled ? "Tạm ngưng" : "Đang hoạt động"}
                      />
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <button
                          className="bt-icon-button"
                          title="Sửa tài khoản"
                          aria-label={`Sửa ${user.email}`}
                          onClick={() => {
                            setError("");
                            setEditing(user);
                          }}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          className="bt-icon-button"
                          title="Đặt lại mật khẩu"
                          aria-label={`Đặt lại mật khẩu ${user.email}`}
                          onClick={() => {
                            setError("");
                            setPasswordUser(user);
                          }}
                        >
                          <KeyRound size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
      <Modal
        open={!!editing}
        title={editing?.id ? "Sửa tài khoản" : "Tạo nhân viên"}
        onClose={() => {
          if (!busy) setEditing(null);
        }}
      >
        {editing && (
          <form
            className="space-y-4"
            onSubmit={(event) => void save(event, false)}
          >
            <Field label="Họ tên" required>
              <input
                className="bt-input"
                required
                minLength={2}
                maxLength={100}
                value={editing.name}
                onChange={(event) =>
                  setEditing({ ...editing, name: event.target.value })
                }
              />
            </Field>
            <Field label="Email đăng nhập" required>
              <input
                className="bt-input"
                required
                type="email"
                maxLength={160}
                value={editing.email}
                onChange={(event) =>
                  setEditing({ ...editing, email: event.target.value })
                }
              />
            </Field>
            <Field label="Vai trò">
              <select
                className="bt-input"
                disabled={editing.role === "b2b"}
                value={editing.role}
                onChange={(event) =>
                  setEditing({
                    ...editing,
                    role: event.target.value as User["role"],
                  })
                }
              >
                {Object.entries(roles)
                  .filter(([key]) => key !== "b2b" || editing.role === "b2b")
                  .map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
              </select>
            </Field>
            <fieldset className="space-y-2">
              <legend className="mb-2 text-sm font-medium text-primary">
                Chi nhánh
              </legend>
              {branches
                .filter((branch) => sessionUser?.branches.includes(branch))
                .map((branch) => (
                  <label
                    key={branch}
                    className="flex items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      disabled={editing.role === "b2b"}
                      checked={editing.branches.includes(branch)}
                      onChange={(event) =>
                        setEditing({
                          ...editing,
                          branches: event.target.checked
                            ? [...editing.branches, branch]
                            : (editing.branches.filter(
                                (b) => b !== branch,
                              ) as Branch[]),
                        })
                      }
                    />
                    {branch}
                  </label>
                ))}
            </fieldset>
            {!editing.id && (
              <>
                <PasswordInput
                  name="password"
                  label="Mật khẩu (tối thiểu 12 ký tự)"
                />
                <PasswordInput name="confirm" label="Xác nhận mật khẩu" />
              </>
            )}
            <label className="flex gap-2 text-sm">
              <input
                type="checkbox"
                checked={editing.disabled}
                onChange={(event) =>
                  setEditing({ ...editing, disabled: event.target.checked })
                }
              />
              Tạm ngưng đăng nhập
            </label>
            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
            <Button type="submit" disabled={busy || !editing.branches.length}>
              <Save size={16} />
              {busy ? "Đang lưu..." : "Lưu tài khoản"}
            </Button>
          </form>
        )}
      </Modal>
      <Modal
        open={!!passwordUser}
        title="Đặt lại mật khẩu"
        onClose={() => {
          if (!busy) setPasswordUser(null);
        }}
      >
        {passwordUser && (
          <form
            className="space-y-4"
            onSubmit={(event) => void save(event, true)}
          >
            <p className="text-sm font-medium text-primary">
              {passwordUser.email}
            </p>
            <PasswordInput
              name="password"
              label="Mật khẩu mới (tối thiểu 12 ký tự)"
            />
            <PasswordInput name="confirm" label="Xác nhận mật khẩu mới" />
            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
            <Button type="submit" disabled={busy}>
              <KeyRound size={16} />
              {busy ? "Đang lưu..." : "Đặt lại mật khẩu"}
            </Button>
          </form>
        )}
      </Modal>
    </>
  );
}

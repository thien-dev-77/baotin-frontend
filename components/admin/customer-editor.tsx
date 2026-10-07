"use client";

import { useEffect, useRef, useState } from "react";
import { KeyRound, Save } from "lucide-react";
import { api } from "@/lib/api-client";
import type { Branch } from "@/lib/types";
import type {
  CustomerDirectory,
  ManagedCustomer,
} from "@/lib/customer-management";
import { Button, Field, Modal } from "../ui";
import { PasswordInput } from "../password-form";

type EditorProps = {
  customer: ManagedCustomer | null;
  branch: Branch;
  directory: CustomerDirectory;
  onClose: () => void;
  onSaved: () => Promise<void>;
};

export function CustomerEditor({
  customer,
  branch,
  directory,
  onClose,
  onSaved,
}: EditorProps) {
  const [pilot, setPilot] = useState(customer?.pilot || false);
  const [assignedSalesId, assign] = useState(customer?.assignedSalesId || "");
  const [createAccount, setCreateAccount] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const assignees = directory.assignees.filter(
    (user) => !user.disabled || user.id === assignedSalesId,
  );
  return (
    <Modal
      open
      title={customer ? "Sửa hồ sơ khách B2B" : "Thêm khách B2B"}
      busy={busy}
      onClose={onClose}
    >
      <form
        className="space-y-5"
        onSubmit={async (event) => {
          event.preventDefault();
          if (lock.current) return;
          const form = new FormData(event.currentTarget);
          const password = String(form.get("password") || "");
          if (!customer && createAccount && password !== form.get("confirm")) {
            setError("Mật khẩu xác nhận không khớp.");
            return;
          }
          if (pilot && !assignedSalesId) {
            setError("Khách thử nghiệm cần có Sales phụ trách.");
            return;
          }
          lock.current = true;
          setBusy(true);
          setError("");
          try {
            await api(
              customer ? `/admin/customers/${customer.id}` : "/admin/customers",
              {
                method: customer ? "PATCH" : "POST",
                body: JSON.stringify({
                  branch,
                  ...(customer ? { revision: customer.revision } : {}),
                  ...Object.fromEntries(
                    [
                      "name",
                      "contact",
                      "phone",
                      "email",
                      "tax",
                      "address",
                      "group",
                      "notes",
                    ].map((key) => [key, String(form.get(key) || "")]),
                  ),
                  pilot,
                  assignedSalesId: assignedSalesId || null,
                  ...(!customer && createAccount ? { password } : {}),
                }),
              },
            );
            if (mounted.current) await onSaved();
          } catch (cause) {
            if (mounted.current)
              setError(
                cause instanceof Error
                  ? cause.message
                  : "Không thể lưu hồ sơ khách.",
              );
          } finally {
            lock.current = false;
            if (mounted.current) setBusy(false);
          }
        }}
      >
        <fieldset disabled={busy} className="grid min-w-0 gap-4 sm:grid-cols-2">
          <Field label="Tên xưởng / công ty" required>
            <input
              className="bt-input"
              name="name"
              required
              minLength={2}
              maxLength={150}
              defaultValue={customer?.name}
            />
          </Field>
          <Field label="Người liên hệ" required>
            <input
              className="bt-input"
              name="contact"
              required
              minLength={2}
              maxLength={100}
              defaultValue={customer?.contact}
            />
          </Field>
          <Field label="Số điện thoại" required>
            <input
              className="bt-input"
              name="phone"
              type="tel"
              autoComplete="tel"
              required
              minLength={9}
              maxLength={20}
              defaultValue={customer?.phone}
            />
          </Field>
          <Field label={customer?.account ? "Email đăng nhập" : "Email"}>
            <input
              className="bt-input"
              name="email"
              type="email"
              autoComplete="email"
              maxLength={160}
              defaultValue={customer?.email}
              readOnly={!!customer?.account}
            />
          </Field>
          <Field label="Mã số thuế">
            <input
              className="bt-input"
              name="tax"
              maxLength={30}
              defaultValue={customer?.tax}
            />
          </Field>
          <Field label="Chi nhánh">
            <input className="bt-input" value={branch} readOnly />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Địa chỉ">
              <input
                className="bt-input"
                name="address"
                maxLength={300}
                defaultValue={customer?.address}
              />
            </Field>
          </div>
          <Field label="Nhóm khách" required>
            <select
              className="bt-input"
              name="group"
              defaultValue={customer?.group || "Chờ phân nhóm"}
            >
              {directory.groups.map((group) => (
                <option key={group}>{group}</option>
              ))}
            </select>
          </Field>
          <Field label="Sales phụ trách" required={pilot}>
            <select
              className="bt-input"
              value={assignedSalesId}
              required={pilot}
              onChange={(event) => assign(event.target.value)}
            >
              <option value="">Chưa phân công</option>
              {assignees.map((user) => (
                <option key={user.id} value={user.id} disabled={user.disabled}>
                  {user.name}
                  {user.disabled ? " (tạm ngưng)" : ""}
                </option>
              ))}
            </select>
          </Field>
          <label className="flex items-center gap-2 text-sm text-primary sm:col-span-2">
            <input
              type="checkbox"
              checked={pilot}
              onChange={(event) => setPilot(event.target.checked)}
            />
            Khách thử nghiệm
          </label>
          <div className="sm:col-span-2">
            <Field label="Ghi chú chăm sóc">
              <textarea
                className="bt-input !h-24"
                name="notes"
                maxLength={2000}
                defaultValue={customer?.notes}
              />
            </Field>
          </div>
          {!customer && (
            <>
              <label className="flex items-center gap-2 border-t border-border pt-4 text-sm text-primary sm:col-span-2">
                <input
                  type="checkbox"
                  checked={createAccount}
                  onChange={(event) => setCreateAccount(event.target.checked)}
                />
                Tạo tài khoản B2B
              </label>
              {createAccount && (
                <>
                  <PasswordInput
                    name="password"
                    label="Mật khẩu (tối thiểu 12 ký tự)"
                  />
                  <PasswordInput name="confirm" label="Xác nhận mật khẩu" />
                </>
              )}
            </>
          )}
        </fieldset>
        {error && (
          <p role="alert" className="break-words text-sm text-danger">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button variant="secondary" disabled={busy} onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" loading={busy}>
            <Save size={16} />
            Lưu hồ sơ
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function CustomerAccountForm({
  customer,
  onClose,
  onSaved,
}: {
  customer: ManagedCustomer;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  return (
    <Modal open title="Tạo tài khoản B2B" busy={busy} onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          if (lock.current) return;
          const data = new FormData(event.currentTarget);
          const password = String(data.get("password") || "");
          if (password !== data.get("confirm")) {
            setError("Mật khẩu xác nhận không khớp.");
            return;
          }
          lock.current = true;
          setBusy(true);
          setError("");
          try {
            await api(`/admin/customers/${customer.id}/account`, {
              method: "POST",
              body: JSON.stringify({
                branch: customer.branch,
                revision: customer.revision,
                password,
              }),
            });
            if (mounted.current) await onSaved();
          } catch (cause) {
            if (mounted.current)
              setError(
                cause instanceof Error
                  ? cause.message
                  : "Không thể tạo tài khoản.",
              );
          } finally {
            lock.current = false;
            if (mounted.current) setBusy(false);
          }
        }}
      >
        <div className="border-b border-border pb-4 text-sm">
          <p className="font-semibold text-primary">{customer.name}</p>
          <p className="mt-1 text-text-secondary">
            {customer.phone}
            {customer.email ? ` · ${customer.email}` : ""}
          </p>
        </div>
        <fieldset disabled={busy} className="space-y-4">
          <PasswordInput
            name="password"
            label="Mật khẩu (tối thiểu 12 ký tự)"
          />
          <PasswordInput name="confirm" label="Xác nhận mật khẩu" />
        </fieldset>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button variant="secondary" disabled={busy} onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" loading={busy}>
            <KeyRound size={16} />
            Tạo tài khoản
          </Button>
        </div>
      </form>
    </Modal>
  );
}

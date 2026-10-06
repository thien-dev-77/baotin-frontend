"use client";

import { useEffect, useId, useState } from "react";
import { useRouter } from "@bprogress/next/app";
import Link from "next/link";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { api } from "@/lib/api-client";
import { useCommerce } from "./commerce-provider";
import { Button, Field } from "./ui";

export function PasswordInput({
  name,
  label,
  current = false,
}: {
  name: string;
  label: string;
  current?: boolean;
}) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  return (
    <Field label={label} required htmlFor={id}>
      <span className="relative block">
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          required
          minLength={current ? 8 : 12}
          maxLength={128}
          autoComplete={current ? "current-password" : "new-password"}
          className="bt-input !pr-10"
        />
        <button
          type="button"
          className="bt-icon-button absolute right-1 top-1"
          aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          title={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          onClick={() => setVisible(!visible)}
        >
          {visible ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </span>
    </Field>
  );
}
export function PasswordForm({
  mode,
}: {
  mode: "change" | "forgot" | "reset";
}) {
  const router = useRouter();
  const { refreshSession, notice } = useCommerce();
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (mode === "reset") {
      const value =
        new URLSearchParams(window.location.hash.slice(1)).get("token") || "";
      if (/^[a-f0-9]{64}$/.test(value)) setToken(value);
      else setError("Liên kết không hợp lệ. Hãy yêu cầu email khôi phục mới.");
    }
  }, [mode]);
  return (
    <form
      className="max-w-md space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        if (busy) return;
        const form = event.currentTarget;
        const values = new FormData(form);
        const password = String(values.get("password") || "");
        if (mode !== "forgot" && password !== values.get("confirm")) {
          setError("Mật khẩu xác nhận không khớp.");
          return;
        }
        setBusy(true);
        setError("");
        try {
          const result = await api<{ message?: string }>(
            `/auth/${mode === "change" ? "change-password" : mode === "forgot" ? "forgot-password" : "reset-password"}`,
            {
              method: "POST",
              body: JSON.stringify(
                mode === "forgot"
                  ? { email: String(values.get("email")) }
                  : mode === "change"
                    ? {
                        currentPassword: String(values.get("currentPassword")),
                        password,
                      }
                    : { token, password },
              ),
            },
          );
          form.reset();
          if (mode === "forgot")
            setMessage(result.message || "Đã gửi yêu cầu.");
          else {
            window.history.replaceState(null, "", window.location.pathname);
            notice("Đã đổi mật khẩu. Vui lòng đăng nhập lại.");
            await refreshSession();
            router.push("/login");
          }
        } catch (cause) {
          setError(
            cause instanceof Error ? cause.message : "Không thể xử lý yêu cầu.",
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      {mode === "forgot" ? (
        <Field label="Email đăng ký" required>
          <input
            type="email"
            name="email"
            required
            maxLength={254}
            autoComplete="email"
            className="bt-input"
          />
        </Field>
      ) : (
        <>
          {mode === "change" && (
            <PasswordInput
              name="currentPassword"
              label="Mật khẩu hiện tại"
              current
            />
          )}
          <PasswordInput
            name="password"
            label="Mật khẩu mới (tối thiểu 12 ký tự)"
          />
          <PasswordInput name="confirm" label="Xác nhận mật khẩu mới" />
        </>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="text-sm text-success">
          {message}
        </p>
      )}
      <Button type="submit" disabled={busy || (mode === "reset" && !token)}>
        <LockKeyhole size={16} />
        {busy
          ? "Đang xử lý..."
          : mode === "forgot"
            ? "Gửi liên kết khôi phục"
            : "Đổi mật khẩu"}
      </Button>
      {mode !== "change" && (
        <Link href="/login" className="block text-sm text-blue-brand">
          Về đăng nhập
        </Link>
      )}
    </form>
  );
}

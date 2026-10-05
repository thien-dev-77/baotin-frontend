"use client";
import { readPreviewCustomer, useCommerce } from "@/components/commerce-provider";
import { Breadcrumb, Button, EmptyState, Field, Modal } from "@/components/ui";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { apiMode } from "@/lib/api-client";

export function AuthView({ register = false, next = "/account" }: { register?: boolean; next?: string }) {
  const { login, customer, notice, loginWithPassword, registerWithPassword } = useCommerce();
  const router = useRouter();
  const passwordId = useId();
  const [visible, setVisible] = useState(false);
  const [forgot, setForgot] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submitApi = async (event: React.FormEvent<HTMLFormElement>) => {
    if (!apiMode) return;
    event.preventDefault(); event.stopPropagation();
    const values = new FormData(event.currentTarget);
    if (busy) return;
    setBusy(true); setError("");
    try {
      if (register) await registerWithPassword({ name: String(values.get("name")), company: String(values.get("company")), phone: String(values.get("phone")), email: String(values.get("email")), password: String(values.get("password")) });
      else await loginWithPassword(String(values.get("identity")), String(values.get("password")), remember);
      router.push(nextHref);
    } catch (error) { setError(error instanceof Error ? error.message : "Đăng nhập không thành công."); }
    finally { setBusy(false); }
  };
  const nextHref = next.startsWith("/") && !next.startsWith("//") && !next.includes("\\") ? next : "/account";
  if (customer) return <main className="bt-container bt-page"><EmptyState icon={<LockKeyhole size={36} />} title={`Xin chào, ${customer.name}`} description="Tài khoản B2B của bạn đang đăng nhập." href={nextHref} action="Tiếp tục" /></main>;
  return <main className="bt-container bt-page"><Breadcrumb items={[{ label: register ? "Đăng ký B2B" : "Đăng nhập B2B" }]} /><div className="grid overflow-hidden border-y border-border lg:grid-cols-2"><section className="relative hidden min-h-[530px] bg-primary lg:block"><img src="/images/catalog/kitchen-banner.png" alt="Không gian bếp với phụ kiện nội thất" className="absolute inset-0 h-full w-full object-cover" /><div className="absolute inset-0 bg-primary/65" /><div className="absolute bottom-10 left-8 right-8 text-white"><p className="mb-3 text-sm font-semibold">BẢO TÍN · ĐỐI TÁC NỘI THẤT</p><h2 className="text-[28px] font-bold">{register ? "Đồng hành cùng công trình của bạn" : "Chào mừng trở lại"}</h2><p className="mt-4 max-w-md text-sm leading-7 text-blue-100">Đăng nhập để xem giá B2B, đặt hàng và quản lý công nợ.</p></div></section><section className="px-1 py-8 sm:px-8 lg:px-12"><h1 className="text-2xl font-bold text-primary">{register ? "Đăng ký tài khoản B2B" : "Đăng nhập B2B"}</h1><p className="mt-2 text-sm text-text-secondary">{register ? "Dành cho xưởng nội thất, đại lý và đối tác công trình." : "Tiếp tục đặt hàng và quản lý tài khoản của bạn."}</p><form className="mt-6 space-y-4" onSubmit={async (event) => { if (apiMode) { await submitApi(event); return; } event.preventDefault(); const values = new FormData(event.currentTarget); const identity = String(values.get("identity") || values.get("email") || "").trim(); if (!register && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identity) && !/^[+0-9 ]{9,15}$/.test(identity)) { setError("Vui lòng nhập số điện thoại hoặc email hợp lệ."); return; } const saved = readPreviewCustomer(identity); if (register && saved) { setError("Email đã đăng ký. Vui lòng đăng nhập."); return; } const email = register ? String(values.get("email")) : identity.includes("@") ? identity : ""; login((!register && saved) || { id: identity.toLowerCase(), name: String(values.get("name") || "Khách hàng B2B"), company: String(values.get("company") || "Đối tác Bảo Tín"), email, phone: String(values.get("phone") || (!identity.includes("@") ? identity : "")), role: "b2b", status: register ? "pending" : "active", creditLimit: register ? 0 : 50000000, debt: register ? 0 : 12400000 }, remember); router.push(nextHref); }}>
      {register && <><Field label="Họ và tên" required><input name="name" required minLength={2} autoComplete="name" className="bt-input" /></Field><Field label="Tên công ty / Xưởng nội thất" required><input name="company" required className="bt-input" /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Số điện thoại" required><input name="phone" type="tel" pattern="[+0-9 ]{9,15}" required autoComplete="tel" className="bt-input" /></Field><Field label="Email" required><input name="email" type="email" required autoComplete="email" className="bt-input" /></Field></div></>}
      {!register && <Field label="Số điện thoại hoặc email" required><input name="identity" required autoComplete="username" className="bt-input" /></Field>}
      <Field label="Mật khẩu" required htmlFor={passwordId}><span className="relative block"><input id={passwordId} name="password" type={visible ? "text" : "password"} minLength={apiMode ? 8 : 6} maxLength={128} required autoComplete={register ? "new-password" : "current-password"} className="bt-input !pr-10" /><button type="button" className="absolute right-1 top-1 bt-icon-button" title={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"} aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></Field>
      {register ? <label className="flex items-start gap-2 text-xs leading-5 text-text-secondary"><input required type="checkbox" className="mt-1 accent-blue-brand" /><span>Tôi đồng ý với <Link href="/policies/dieu-khoan" className="text-blue-brand">điều khoản sử dụng</Link> của Bảo Tín.</span></label> : <div className="flex items-center justify-between"><label className="flex items-center gap-2 text-xs text-text-secondary"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="accent-blue-brand" />Ghi nhớ đăng nhập</label><button type="button" onClick={() => setForgot(true)} className="text-xs text-blue-brand">Quên mật khẩu?</button></div>}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}<Button type="submit" disabled={busy} className="w-full">{register ? "Đăng ký tài khoản" : "Đăng nhập"}</Button><p className="pt-1 text-center text-sm text-text-secondary">{register ? "Đã có tài khoản?" : "Chưa có tài khoản?"} <Link href={`${register ? "/login" : "/register"}?next=${encodeURIComponent(nextHref)}`} className="font-semibold text-blue-brand">{register ? "Đăng nhập B2B" : "Đăng ký tài khoản B2B"}</Link></p></form></section></div><Modal open={forgot} onClose={() => setForgot(false)} title="Khôi phục tài khoản"><p className="mb-4 text-sm leading-6 text-text-secondary">Liên hệ đội ngũ Bảo Tín để được hỗ trợ khôi phục tài khoản B2B.</p><Link href="/contact" className="bt-button-primary" onClick={() => setForgot(false)}>Liên hệ hỗ trợ</Link></Modal></main>;
}

import { PasswordForm } from "@/components/password-form";
export default function Page() {
  return (
    <main className="bt-container bt-page">
      <div className="mx-auto max-w-md">
        <h1 className="mb-6 text-2xl font-bold text-primary">
          Đặt lại mật khẩu
        </h1>
        <PasswordForm mode="reset" />
      </div>
    </main>
  );
}

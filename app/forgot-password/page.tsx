import { PasswordForm } from "@/components/password-form";
export default function Page() {
  return (
    <main className="bt-container bt-page">
      <div className="mx-auto max-w-md">
        <h1 className="mb-6 text-2xl font-bold text-primary">
          Khôi phục mật khẩu
        </h1>
        <PasswordForm mode="forgot" />
      </div>
    </main>
  );
}

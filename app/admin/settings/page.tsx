import { PasswordForm } from "@/components/password-form";
export default function Page() {
  return (
    <section>
      <h1 className="mb-6 text-xl font-semibold text-primary">
        Bảo mật tài khoản
      </h1>
      <PasswordForm mode="change" />
    </section>
  );
}

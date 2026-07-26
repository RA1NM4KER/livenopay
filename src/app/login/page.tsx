import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <AuthShell
      badge="For LiveMopay prepaid accounts"
      title={
        <>
          Your usage. <span className="text-brandGreen">Finally clear.</span>
        </>
      }
      description="Real charts, real history, and a running balance you can actually trust, pulled straight from LiveMopay."
    >
      <LoginForm />
    </AuthShell>
  );
}

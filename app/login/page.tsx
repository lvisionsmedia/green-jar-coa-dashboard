import { LoginForm } from "@/components/LoginForm";
import { Suspense } from "react";

export default function LoginPage() {
  return (
    <div className="login-page">
      <Suspense fallback={<div className="login-card">Loading...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}

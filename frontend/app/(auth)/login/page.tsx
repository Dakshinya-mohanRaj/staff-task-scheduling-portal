import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-sm text-center text-gray-500 py-8">
          Loading...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
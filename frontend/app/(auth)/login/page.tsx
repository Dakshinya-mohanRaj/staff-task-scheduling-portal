import { Suspense } from "react";
import { LoginForm } from "./login-form";
import { LightfallStream } from "./lightfall-stream";

export default function LoginPage() {
  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0">
        <LightfallStream
          className="absolute inset-0"
          speed={1.0}
          density={1800}
          interactive
        />
      </div>
      <div className="relative z-10 flex justify-center">
        <Suspense
          fallback={
            <div className="w-full max-w-sm text-center text-gray-500 py-8">
              Loading...
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error || "Login failed");
        return;
      }

      const data = result.data;
      if (data.roleCode === "ADMIN") {
        router.push("/admin");
      } else {
        router.push("/staff");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
        <h1 className="text-2xl font-bold text-gray-900 text-center mb-1">
          Staff Task Scheduling Portal
        </h1>
        <p className="text-sm text-gray-500 text-center mb-6">
          Sign in to your account
        </p>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="you@college.edu"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="mt-4 border-t border-gray-100 pt-4">
          <p className="text-xs text-gray-500 text-center font-medium mb-2">
            Demo Accounts
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
            <div className="rounded bg-gray-50 p-2 text-center">
              <span className="font-semibold text-gray-800">HOD</span>
              <br />
              <span className="break-all">hod@college.edu</span>
            </div>
            <div className="rounded bg-gray-50 p-2 text-center col-span-2">
              <span className="font-semibold text-gray-800">All Staff</span>
              <br />
              <span className="text-gray-500">password: password123</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
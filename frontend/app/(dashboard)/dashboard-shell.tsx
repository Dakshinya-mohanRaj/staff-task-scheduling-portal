"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

interface DashboardShellProps {
  children: React.ReactNode;
  user: {
    name: string;
    email: string;
    roleCode: string;
    staffRole: string | null;
  };
}

function UserNav({ user }: { user: DashboardShellProps["user"] }) {
  const [loggingOut, setLoggingOut] = useState(false);
  const router = useRouter();

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3">
      <div className="text-right text-sm">
        <div className="font-medium text-gray-800">{user.name}</div>
        <div className="text-gray-500 text-xs">{user.email}</div>
        {user.staffRole && (
          <div className="text-xs text-blue-600 font-medium capitalize">
            {user.staffRole.replace(/_/g, " ").toLowerCase()}
          </div>
        )}
      </div>
      <button
        onClick={handleLogout}
        disabled={loggingOut}
        className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
        {loggingOut ? "Signing out..." : "Sign Out"}
      </button>
    </div>
  );
}

function SidebarLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-blue-50 text-blue-700 border border-blue-200"
          : "text-gray-700 hover:bg-gray-100"
      }`}
    >
      {label}
    </Link>
  );
}

export function DashboardShell({ children, user }: DashboardShellProps) {
  const pathname = usePathname();
  const isAdmin = user.roleCode === "ADMIN";
  const basePath = isAdmin ? "/admin" : "/staff";

  const navItems = isAdmin
    ? [
        { href: "/admin", label: "Dashboard" },
        { href: "/admin/work-orders/new", label: "Create Work Order" },
      ]
    : [
        { href: "/staff", label: "Dashboard" },
        { href: "/staff/tasks", label: "My Tasks" },
      ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={basePath} className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">ST</span>
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-900 leading-tight">
                Staff Task Portal
              </h1>
              <span className="text-[10px] font-medium text-blue-600 uppercase tracking-wide">
                {isAdmin ? "HOD" : "Staff"}
              </span>
            </div>
          </Link>
        </div>
        <UserNav user={user} />
      </header>

      <div className="flex flex-1">
        <aside className="w-56 bg-white border-r border-gray-200 p-4 hidden md:block">
          <nav className="space-y-1">
            {navItems.map((item) => (
              <SidebarLink
                key={item.href}
                href={item.href}
                label={item.label}
                active={
                  item.href === basePath
                    ? pathname === basePath
                    : pathname.startsWith(item.href)
                }
              />
            ))}
          </nav>
        </aside>

        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
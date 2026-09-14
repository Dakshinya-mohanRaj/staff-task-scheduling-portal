"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface AdminStats {
  totalWorkOrders: number;
  statusCounts: {
    scheduled: number;
    inProgress: number;
    completed: number;
    cancelled: number;
    overdue: number;
  };
  totalStaffWithRole: number;
  staffAssignedToday: number;
  staffAvailableToday: number;
  dateKey: string;
}

function StatCard({
  label,
  value,
  className,
}: {
  label: string;
  value: number | string;
  className?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className={`text-2xl font-bold ${className ?? "text-gray-900"}`}>
        {value}
      </div>
      <div className="text-sm text-gray-500 mt-1">{label}</div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/admin")
      .then((r) => r.json())
      .then((r) => setStats(r.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-48 bg-gray-200 rounded" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12 text-gray-500">
        Failed to load dashboard
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Admin Dashboard</h2>
        <p className="text-sm text-gray-500 mt-1">
          Overview for {stats.dateKey}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Work Orders" value={stats.totalWorkOrders} />
        <StatCard
          label="Scheduled"
          value={stats.statusCounts.scheduled}
          className="text-blue-600"
        />
        <StatCard
          label="In Progress"
          value={stats.statusCounts.inProgress}
          className="text-amber-600"
        />
        <StatCard
          label="Completed"
          value={stats.statusCounts.completed}
          className="text-green-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Staff Overview
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Total Staff</span>
              <span className="font-medium text-gray-800">
                {stats.totalStaffWithRole}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Assigned Today</span>
              <span className="font-medium text-blue-600">
                {stats.staffAssignedToday}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Available Today</span>
              <span className="font-medium text-green-600">
                {stats.staffAvailableToday}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Task Status Breakdown
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Cancelled</span>
              <span className="font-medium text-gray-600">
                {stats.statusCounts.cancelled}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Overdue (derived)</span>
              <span className="font-medium text-red-600">
                {stats.statusCounts.overdue}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Quick Actions
          </h3>
          <div className="space-y-2">
            <Link
              href="/admin/work-orders/new"
              className="block text-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Create Work Order
            </Link>
            <Link
              href="/admin/work-orders"
              className="block text-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              View All Work Orders
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
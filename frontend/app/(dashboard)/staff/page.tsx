"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface StaffStats {
  totalTasks: number;
  scheduled: number;
  inProgress: number;
  completed: number;
  overdue: number;
  nextTask: {
    title: string;
    startTime: string;
    scheduledDate: string;
  } | null;
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

function formatTime(t: string) {
  if (!t || t.length < 16) return t;
  return t.slice(11, 16);
}

export default function StaffDashboardPage() {
  const [stats, setStats] = useState<StaffStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/staff")
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
        <h2 className="text-xl font-bold text-gray-900">My Dashboard</h2>
        <p className="text-sm text-gray-500 mt-1">
          Tasks for {stats.dateKey}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Tasks" value={stats.totalTasks} />
        <StatCard
          label="Scheduled"
          value={stats.scheduled}
          className="text-blue-600"
        />
        <StatCard
          label="In Progress"
          value={stats.inProgress}
          className="text-amber-600"
        />
        <StatCard
          label="Completed"
          value={stats.completed}
          className="text-green-600"
        />
      </div>

      {stats.overdue > 0 && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-5">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
              <span className="text-red-600 text-sm font-bold">!</span>
            </div>
            <div>
              <div className="text-sm font-semibold text-red-800">
                Overdue Tasks
              </div>
              <div className="text-xs text-red-600">
                You have {stats.overdue} overdue task(s) that need attention
              </div>
            </div>
          </div>
        </div>
      )}

      {stats.nextTask && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">
            Next Upcoming Task
          </h3>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 text-sm font-bold">
              {formatTime(stats.nextTask.startTime)}
            </div>
            <div>
              <div className="font-medium text-gray-800">
                {stats.nextTask.title}
              </div>
              <div className="text-xs text-gray-500">
                {formatTime(stats.nextTask.startTime)} on{" "}
                {stats.nextTask.scheduledDate.slice(0, 10)}
              </div>
            </div>
          </div>
        </div>
      )}

      <Link
        href="/staff/tasks"
        className="block text-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm"
      >
        View My Tasks &rarr;
      </Link>
    </div>
  );
}
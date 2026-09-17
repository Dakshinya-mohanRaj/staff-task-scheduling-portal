"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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

interface RecentWorkOrder {
  id: string;
  woNumber: string;
  title: string;
  requiredStaffRole: string;
  priority: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  status: string;
  derivedStatus: string | null;
  assignment: {
    status: string;
    assignedTo: {
      firstName: string;
      lastName: string;
      email: string;
    };
  } | null;
}

const STATUS_OPTIONS = [
  { value: "ALL", label: "All Statuses" },
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "CANCELLED", label: "Cancelled" },
] as const;

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(t: string) {
  if (!t || t.length < 16) return "--:--";
  return t.slice(11, 16);
}

function roleLabel(role: string) {
  return role.replace(/_/g, " ").toLowerCase();
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    SCHEDULED: "bg-blue-100 text-blue-800 border-blue-200",
    IN_PROGRESS: "bg-amber-100 text-amber-800 border-amber-200",
    COMPLETED: "bg-green-100 text-green-800 border-green-200",
    CANCELLED: "bg-gray-100 text-gray-600 border-gray-200",
    OVERDUE: "bg-red-100 text-red-800 border-red-200",
    ASSIGNED: "bg-indigo-100 text-indigo-800 border-indigo-200",
  };
  const label =
    status === "OVERDUE"
      ? "Overdue"
      : status
          ?.replace(/_/g, " ")
          .toLowerCase()
          .replace(/^\w/, (c) => c.toUpperCase());
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${colors[status] || "bg-gray-100 text-gray-600 border-gray-200"}`}
    >
      {label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    HIGH: "bg-red-50 text-red-700 border-red-200",
    MEDIUM: "bg-yellow-50 text-yellow-700 border-yellow-200",
    LOW: "bg-green-50 text-green-700 border-green-200",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${colors[priority] || "bg-gray-50 text-gray-600 border-gray-200"}`}
    >
      {priority}
    </span>
  );
}

function StatCard({
  label,
  value,
  accent,
  dot,
}: {
  label: string;
  value: number | string;
  accent: string;
  dot: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 shadow-sm">
      <div className="flex items-center gap-1.5">
        <span className={`h-2 w-2 rounded-full ${dot}`} />
        <span className="text-xs font-medium text-gray-500">{label}</span>
      </div>
      <div className={`mt-2 text-2xl sm:text-3xl font-bold ${accent}`}>
        {value}
      </div>
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-24 bg-gray-200 rounded-xl" />
        ))}
      </div>
      <div className="h-32 bg-gray-200 rounded-xl" />
    </div>
  );
}

export default function AdminDashboardPage() {
  const router = useRouter();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [orders, setOrders] = useState<RecentWorkOrder[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [statsError, setStatsError] = useState("");
  const [ordersError, setOrdersError] = useState("");

  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/dashboard/admin")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Failed to load dashboard");
        if (!cancelled) {
          setStats(data.data);
          setStatsError("");
        }
      })
      .catch((e) => {
        if (!cancelled) setStatsError(e.message || "Failed to load dashboard");
      })
      .finally(() => {
        if (!cancelled) setLoadingStats(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ limit: "100" });
    if (dateFilter) params.set("date", dateFilter);
    fetch(`/api/work-orders?${params.toString()}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Failed to load work orders");
        if (!cancelled) {
          setOrders(data.data ?? []);
          setOrdersError("");
        }
      })
      .catch((e) => {
        if (!cancelled)
          setOrdersError(e.message || "Failed to load work orders");
      })
      .finally(() => {
        if (!cancelled) setLoadingOrders(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dateFilter]);

  const filteredOrders = useMemo(() => {
    const term = query.trim().toLowerCase();
    return orders.filter((wo) => {
      const effective = wo.derivedStatus || wo.status;
      if (statusFilter !== "ALL" && effective !== statusFilter) return false;
      if (!term) return true;
      const assignee = wo.assignment?.assignedTo
        ? `${wo.assignment.assignedTo.firstName} ${wo.assignment.assignedTo.lastName}`
        : "";
      const haystack = [
        wo.title,
        wo.woNumber,
        roleLabel(wo.requiredStaffRole),
        assignee,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [orders, statusFilter, query]);

  const statusCounts = stats?.statusCounts;
  const pipelineItems = [
    { key: "scheduled", label: "Scheduled", value: statusCounts?.scheduled ?? 0, bar: "bg-blue-500", dot: "bg-blue-500" },
    { key: "inProgress", label: "In Progress", value: statusCounts?.inProgress ?? 0, bar: "bg-amber-500", dot: "bg-amber-500" },
    { key: "completed", label: "Completed", value: statusCounts?.completed ?? 0, bar: "bg-green-500", dot: "bg-green-500" },
    { key: "overdue", label: "Overdue", value: statusCounts?.overdue ?? 0, bar: "bg-red-500", dot: "bg-red-500" },
    { key: "cancelled", label: "Cancelled", value: statusCounts?.cancelled ?? 0, bar: "bg-gray-400", dot: "bg-gray-400" },
  ];
  const pipelineTotal = pipelineItems.reduce((sum, item) => sum + item.value, 0);

  const retryStats = () => {
    setStatsError("");
    setLoadingStats(true);
    fetch("/api/dashboard/admin")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Failed to load dashboard");
        setStats(data.data);
      })
      .catch((e) => setStatsError(e.message || "Failed to load dashboard"))
      .finally(() => setLoadingStats(false));
  };

  const retryOrders = () => {
    setOrdersError("");
    setLoadingOrders(true);
    const params = new URLSearchParams({ limit: "100" });
    if (dateFilter) params.set("date", dateFilter);
    fetch(`/api/work-orders?${params.toString()}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Failed to load work orders");
        setOrders(data.data ?? []);
      })
      .catch((e) =>
        setOrdersError(e.message || "Failed to load work orders"),
      )
      .finally(() => setLoadingOrders(false));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            HOD Monitoring Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            College responsibilities and coordinator task fulfilment
            {stats ? ` for ${formatDate(stats.dateKey)}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/work-orders"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            All Work Orders
          </Link>
          <Link
            href="/admin/work-orders/new"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            + Create Work Order
          </Link>
        </div>
      </div>

      {/* Stats */}
      {loadingStats ? (
        <StatsSkeleton />
      ) : statsError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          <p className="font-medium">Could not load dashboard statistics.</p>
          <p className="mt-1">{statsError}</p>
          <button
            onClick={retryStats}
            className="mt-3 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
          >
            Retry
          </button>
        </div>
      ) : (
        stats && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
              <StatCard
                label="Total Tasks"
                value={stats.totalWorkOrders}
                accent="text-gray-900"
                dot="bg-gray-900"
              />
              <StatCard
                label="Scheduled"
                value={stats.statusCounts.scheduled}
                accent="text-blue-600"
                dot="bg-blue-500"
              />
              <StatCard
                label="In Progress"
                value={stats.statusCounts.inProgress}
                accent="text-amber-600"
                dot="bg-amber-500"
              />
              <StatCard
                label="Completed"
                value={stats.statusCounts.completed}
                accent="text-green-600"
                dot="bg-green-500"
              />
              <StatCard
                label="Overdue"
                value={stats.statusCounts.overdue}
                accent="text-red-600"
                dot="bg-red-500"
              />
              <StatCard
                label="Cancelled"
                value={stats.statusCounts.cancelled}
                accent="text-gray-500"
                dot="bg-gray-400"
              />
            </div>

            {/* Pipeline + team availability */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-700">
                  Task Pipeline
                </h3>
                {pipelineTotal === 0 ? (
                  <p className="mt-4 text-sm text-gray-500">
                    No tasks scheduled for this date yet.
                  </p>
                ) : (
                  <>
                    <div className="mt-4 flex h-3 w-full overflow-hidden rounded-full bg-gray-100">
                      {pipelineItems.map(
                        (item) =>
                          item.value > 0 && (
                            <div
                              key={item.key}
                              className={`h-full ${item.bar}`}
                              style={{
                                width: `${(item.value / pipelineTotal) * 100}%`,
                              }}
                              title={`${item.label}: ${item.value}`}
                            />
                          ),
                      )}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
                      {pipelineItems.map((item) => (
                        <div
                          key={item.key}
                          className="flex items-center gap-1.5 text-xs text-gray-600"
                        >
                          <span
                            className={`h-2 w-2 rounded-full ${item.dot}`}
                          />
                          {item.label}
                          <span className="font-semibold text-gray-900">
                            {item.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-700">
                  Faculty &amp; Coordinator Availability
                </h3>
                <div className="mt-4 space-y-2 text-sm">
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
            </div>
          </>
        )
      )}

      {/* Recent work orders */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-5 border-b border-gray-200">
          <div>
            <h3 className="text-base font-bold text-gray-900">
              Recent Work Orders
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {filteredOrders.length} of {orders.length} responsibilities shown
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search title, W/O no, staff..."
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm w-full sm:w-64"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setLoadingOrders(true);
              }}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
              title="Filter by scheduled date (leave empty to show all)"
            />
          </div>
        </div>

        {loadingOrders ? (
          <div className="p-5 animate-pulse space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-gray-200 rounded-lg" />
            ))}
          </div>
        ) : ordersError ? (
          <div className="p-5 text-sm text-red-700">
            <p className="font-medium">{ordersError}</p>
            <button
              onClick={retryOrders}
              className="mt-2 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
            >
              Retry
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm text-gray-500">No recent work orders.</p>
            <Link
              href="/admin/work-orders/new"
              className="mt-3 inline-block text-sm text-blue-600 hover:underline"
            >
              Create the first work order
            </Link>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-500">
            No work orders match the current filters.
          </div>
        ) : (
          <>
            {/* Desktop / tablet table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      W/O Number
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Task / Responsibility
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Assigned To
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Date &amp; Time
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Priority
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredOrders.map((wo) => (
                    <tr
                      key={wo.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() =>
                        router.push(`/admin/work-orders/${wo.id}`)
                      }
                    >
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-800 whitespace-nowrap">
                        {wo.woNumber}
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <div className="text-gray-800 font-medium truncate">
                          {wo.title}
                        </div>
                        <div className="text-xs text-gray-500">
                          {roleLabel(wo.requiredStaffRole)}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {wo.assignment ? (
                          <span className="text-gray-800">
                            {wo.assignment.assignedTo.firstName}{" "}
                            {wo.assignment.assignedTo.lastName}
                          </span>
                        ) : (
                          <span className="text-gray-400">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">
                        <div>{formatDate(wo.scheduledDate)}</div>
                        <div className="font-mono">
                          {formatTime(wo.startTime)} - {formatTime(wo.endTime)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <PriorityBadge priority={wo.priority} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={wo.derivedStatus || wo.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {filteredOrders.map((wo) => (
                <button
                  key={wo.id}
                  type="button"
                  className="w-full text-left px-4 py-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => router.push(`/admin/work-orders/${wo.id}`)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-semibold text-gray-800">
                      {wo.woNumber}
                    </span>
                    <StatusBadge status={wo.derivedStatus || wo.status} />
                  </div>
                  <div className="mt-1 font-medium text-gray-900">
                    {wo.title}
                  </div>
                  <div className="mt-0.5 text-xs text-gray-500">
                    {roleLabel(wo.requiredStaffRole)} ·{" "}
                    {wo.assignment
                      ? `${wo.assignment.assignedTo.firstName} ${wo.assignment.assignedTo.lastName}`
                      : "Unassigned"}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-gray-600">
                    <span>{formatDate(wo.scheduledDate)}</span>
                    <span className="font-mono">
                      {formatTime(wo.startTime)} - {formatTime(wo.endTime)}
                    </span>
                    <PriorityBadge priority={wo.priority} />
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
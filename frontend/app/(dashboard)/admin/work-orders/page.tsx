"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface WorkOrderRow {
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
    assignedTo: {
      firstName: string;
      lastName: string;
      email: string;
    };
    status: string;
  } | null;
}

function formatTime(t: string) {
  if (!t || t.length < 16) return t;
  return t.slice(11, 16);
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
      : status?.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${colors[status] || "bg-gray-100 text-gray-600"}`}
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
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${colors[priority] || "bg-gray-50 text-gray-600"}`}
    >
      {priority}
    </span>
  );
}

export default function WorkOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<WorkOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState(
    new Date().toISOString().slice(0, 10),
  );

  useEffect(() => {
    const params = new URLSearchParams();
    if (dateFilter) params.set("date", dateFilter);
    fetch(`/api/work-orders?${params.toString()}`)
      .then((r) => r.json())
      .then((r) => setOrders(r.data ?? []))
      .finally(() => setLoading(false));
  }, [dateFilter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Work Orders</h2>
          <p className="text-sm text-gray-500 mt-1">
            Monitor and manage all work orders
          </p>
        </div>
        <Link
          href="/admin/work-orders/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
        >
          + New Work Order
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700">Date:</label>
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => {
            setDateFilter(e.target.value);
            setLoading(true);
          }}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
        />
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-500">No work orders found for this date</p>
          <Link
            href="/admin/work-orders/new"
            className="mt-3 inline-block text-sm text-blue-600 hover:underline"
          >
            Create one now
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">
                  W/O Number
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">
                  Title
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">
                  Staff Role
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">
                  Assigned To
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">
                  Time
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">
                  Priority
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map((wo) => (
                <tr
                  key={wo.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => router.push(`/admin/work-orders/${wo.id}`)}
                >
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-800">
                    {wo.woNumber}
                  </td>
                  <td className="px-4 py-3 text-gray-800 max-w-xs truncate">
                    {wo.title}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {wo.requiredStaffRole.replace(/_/g, " ").toLowerCase()}
                  </td>
                  <td className="px-4 py-3 text-gray-800">
                    {wo.assignment
                      ? `${wo.assignment.assignedTo.firstName} ${wo.assignment.assignedTo.lastName}`
                      : "-"}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">
                    {formatTime(wo.startTime)} - {formatTime(wo.endTime)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={wo.derivedStatus || wo.status} />
                  </td>
                  <td className="px-4 py-3">
                    <PriorityBadge priority={wo.priority} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface HistoryEntry {
  id: string;
  previousStatus: string | null;
  newStatus: string;
  changedBy: { firstName: string; lastName: string };
  changedAt: string;
  remark: string | null;
}

interface WorkOrderDetail {
  id: string;
  woNumber: string;
  title: string;
  description: string;
  requiredStaffRole: string;
  priority: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  status: string;
  derivedStatus: string | null;
  createdAt: string;
  assignment: {
    id: string;
    status: string;
    startedAt: string | null;
    completedAt: string | null;
    cancelledAt: string | null;
    cancellationReason: string | null;
    assignedTo: {
      firstName: string;
      lastName: string;
      email: string;
      staffRole: string | null;
    };
    assignedBy: { firstName: string; lastName: string };
    statusHistory: HistoryEntry[];
  } | null;
  createdBy: { firstName: string; lastName: string };
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
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${colors[status] || "bg-gray-100 text-gray-600"}`}
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
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${colors[priority] || "bg-gray-50 text-gray-600"}`}
    >
      {priority}
    </span>
  );
}

function formatTime(t: string) {
  if (!t || t.length < 16) return t;
  return t.slice(11, 16);
}

function formatDate(d: string) {
  if (!d || d.length < 10) return d;
  return d.slice(0, 10);
}

export default function WorkOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [wo, setWo] = useState<WorkOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    params.then(({ id }) => {
      fetch(`/api/work-orders/${id}`)
        .then((r) => r.json())
        .then((r) => setWo(r.data))
        .finally(() => setLoading(false));
    });
  }, [params]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-64 bg-gray-200 rounded" />
        <div className="h-48 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  if (!wo) {
    return (
      <div className="text-center py-12 text-gray-500">Work order not found</div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-900">{wo.woNumber}</h2>
            <StatusBadge status={wo.derivedStatus || wo.status} />
            <PriorityBadge priority={wo.priority} />
          </div>
          <h3 className="text-lg text-gray-700 mt-1">{wo.title}</h3>
        </div>
        <Link
          href="/admin/work-orders"
          className="text-sm text-blue-600 hover:underline"
        >
          &larr; Back to list
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">
          Work Order Details
        </h4>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-gray-500">Description</dt>
            <dd className="mt-1 text-gray-800 whitespace-pre-wrap">
              {wo.description}
            </dd>
          </div>
          <div className="space-y-2">
            <div>
              <dt className="text-gray-500">Required Staff Role</dt>
              <dd className="font-medium text-gray-800 capitalize">
                {wo.requiredStaffRole.replace(/_/g, " ").toLowerCase()}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Scheduled Date</dt>
              <dd className="font-medium text-gray-800">
                {formatDate(wo.scheduledDate)}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Time Window</dt>
              <dd className="font-medium text-gray-800">
                {formatTime(wo.startTime)} - {formatTime(wo.endTime)}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Created By</dt>
              <dd className="font-medium text-gray-800">
                {wo.createdBy.firstName} {wo.createdBy.lastName}
              </dd>
            </div>
          </div>
        </dl>
      </div>

      {wo.assignment && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">
            Assignment
          </h4>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-gray-500">Assigned To</dt>
              <dd className="mt-1">
                <span className="font-medium text-gray-800">
                  {wo.assignment.assignedTo.firstName}{" "}
                  {wo.assignment.assignedTo.lastName}
                </span>
                <span className="text-gray-500 ml-2">
                  ({wo.assignment.assignedTo.email})
                </span>
              </dd>
              {wo.assignment.assignedTo.staffRole && (
                <dd className="text-xs text-blue-600 mt-0.5 capitalize">
                  {wo.assignment.assignedTo.staffRole.replace(/_/g, " ").toLowerCase()}
                </dd>
              )}
            </div>
            <div className="space-y-2">
              <div>
                <dt className="text-gray-500">Status</dt>
                <dd className="font-medium">
                  <StatusBadge status={wo.assignment.status} />
                </dd>
              </div>
              {wo.assignment.startedAt && (
                <div>
                  <dt className="text-gray-500">Started At</dt>
                  <dd className="font-medium text-gray-800">
                    {new Date(wo.assignment.startedAt).toLocaleString()}
                  </dd>
                </div>
              )}
              {wo.assignment.completedAt && (
                <div>
                  <dt className="text-gray-500">Completed At</dt>
                  <dd className="font-medium text-gray-800">
                    {new Date(wo.assignment.completedAt).toLocaleString()}
                  </dd>
                </div>
              )}
              {wo.assignment.cancellationReason && (
                <div>
                  <dt className="text-gray-500">Cancellation Reason</dt>
                  <dd className="font-medium text-red-600">
                    {wo.assignment.cancellationReason}
                  </dd>
                </div>
              )}
            </div>
          </dl>
        </div>
      )}

      {wo.assignment?.statusHistory && wo.assignment.statusHistory.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h4 className="text-sm font-semibold text-gray-700 mb-4">
            Status History
          </h4>
          <ol className="relative border-l border-gray-200 ml-3 space-y-4">
            {wo.assignment.statusHistory.map((entry) => (
              <li key={entry.id} className="ml-6">
                <div className="absolute -left-1.5 top-1.5 h-3 w-3 rounded-full border-2 border-white bg-blue-400" />
                <div className="text-xs text-gray-500">
                  {new Date(entry.changedAt).toLocaleString()} &middot;{" "}
                  <span className="font-medium text-gray-700">
                    {entry.changedBy.firstName} {entry.changedBy.lastName}
                  </span>
                </div>
                <div className="mt-0.5 text-sm">
                  {entry.previousStatus && (
                    <span className="text-gray-500 capitalize">
                      {entry.previousStatus.replace(/_/g, " ").toLowerCase()}{" "}
                      &rarr;{" "}
                    </span>
                  )}
                  <span className="font-semibold text-gray-800 capitalize">
                    {entry.newStatus.replace(/_/g, " ").toLowerCase()}
                  </span>
                </div>
                {entry.remark && (
                  <div className="mt-1 text-sm text-gray-600 italic">
                    &ldquo;{entry.remark}&rdquo;
                  </div>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
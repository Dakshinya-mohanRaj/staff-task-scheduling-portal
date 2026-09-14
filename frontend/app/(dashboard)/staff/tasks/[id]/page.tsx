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

interface TaskDetail {
  id: string;
  status: string;
  derivedStatus: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  startedAt: string | null;
  completedAt: string | null;
  workOrder: {
    woNumber: string;
    title: string;
    description: string;
    priority: string;
    requiredStaffRole: string;
  };
  assignedTo: { firstName: string; lastName: string };
  assignedBy: { firstName: string; lastName: string };
  statusHistory: HistoryEntry[];
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    SCHEDULED: "bg-blue-100 text-blue-800 border-blue-200",
    IN_PROGRESS: "bg-amber-100 text-amber-800 border-amber-200",
    COMPLETED: "bg-green-100 text-green-800 border-green-200",
    CANCELLED: "bg-gray-100 text-gray-600 border-gray-200",
    OVERDUE: "bg-red-100 text-red-800 border-red-200",
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

export default function StaffTaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [remarkText, setRemarkText] = useState("");

  useEffect(() => {
    params.then(({ id }) => {
      fetch(`/api/tasks/${id}`)
        .then((r) => r.json())
        .then((r) => setTask(r.data))
        .finally(() => setLoading(false));
    });
  }, [params]);

  const handleStart = async () => {
    setError("");
    setActionLoading(true);
    try {
      const { id } = await params;
      const r = await fetch(`/api/tasks/${id}/start`, { method: "POST" });
      const d = await r.json();
      if (!r.ok) {
        setError(d.error || "Failed to start task");
        return;
      }
      setTask(d.data);
    } catch {
      setError("Network error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async () => {
    setError("");
    setActionLoading(true);
    try {
      const { id } = await params;
      const body: Record<string, unknown> = {};
      if (remarkText.trim()) body.text = remarkText.trim();
      const r = await fetch(`/api/tasks/${id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) {
        setError(d.error || "Failed to complete task");
        return;
      }
      setTask(d.data);
      setRemarkText("");
    } catch {
      setError("Network error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddRemark = async () => {
    if (!remarkText.trim()) return;
    setError("");
    setActionLoading(true);
    try {
      const { id } = await params;
      const r = await fetch(`/api/tasks/${id}/remarks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: remarkText.trim() }),
      });
      const d = await r.json();
      if (!r.ok) {
        setError(d.error || "Failed to add remark");
        return;
      }
      setTask(d.data);
      setRemarkText("");
    } catch {
      setError("Network error");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-64 bg-gray-200 rounded" />
        <div className="h-48 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="text-center py-12 text-gray-500">Task not found</div>
    );
  }

  const effectiveStatus = task.derivedStatus || task.status;
  const canStart = effectiveStatus === "SCHEDULED";
  const canComplete = effectiveStatus === "IN_PROGRESS";
  const canAddRemark = effectiveStatus === "IN_PROGRESS";

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-900">
              {task.workOrder.woNumber}
            </h2>
            <StatusBadge status={effectiveStatus} />
            <PriorityBadge priority={task.workOrder.priority} />
          </div>
          <h3 className="text-lg text-gray-700 mt-1">
            {task.workOrder.title}
          </h3>
        </div>
        <Link
          href="/staff/tasks"
          className="text-sm text-blue-600 hover:underline"
        >
          &larr; Back to tasks
        </Link>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">
          Task Details
        </h4>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-gray-500">Description</dt>
            <dd className="mt-1 text-gray-800 whitespace-pre-wrap">
              {task.workOrder.description}
            </dd>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <dt className="text-gray-500">Date</dt>
              <dd className="font-medium text-gray-800">
                {task.scheduledDate?.slice(0, 10)}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Time Window</dt>
              <dd className="font-medium text-gray-800">
                {formatTime(task.startTime)} - {formatTime(task.endTime)}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Role Required</dt>
              <dd className="font-medium text-gray-800 capitalize">
                {task.workOrder.requiredStaffRole
                  .replace(/_/g, " ")
                  .toLowerCase()}
              </dd>
            </div>
          </div>
          <div>
            <dt className="text-gray-500">Assigned By</dt>
            <dd className="font-medium text-gray-800">
              {task.assignedBy.firstName} {task.assignedBy.lastName}
            </dd>
          </div>
        </dl>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h4 className="text-sm font-semibold text-gray-700 mb-4">Actions</h4>
        <div className="flex flex-wrap gap-3">
          {canStart && (
            <button
              onClick={handleStart}
              disabled={actionLoading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {actionLoading ? "Starting..." : "Start Task"}
            </button>
          )}
          {canComplete && (
            <button
              onClick={handleComplete}
              disabled={actionLoading}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-700 disabled:opacity-50"
            >
              {actionLoading ? "Completing..." : "Mark as Completed"}
            </button>
          )}
          {!canStart && !canComplete && (
            <span className="text-sm text-gray-500 italic py-2">
              No actions available for this task status
            </span>
          )}
        </div>

        {canAddRemark && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Add Remark
            </label>
            <div className="flex gap-2">
              <textarea
                value={remarkText}
                onChange={(e) => setRemarkText(e.target.value)}
                rows={2}
                placeholder="Type a remark or observation..."
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                onClick={handleAddRemark}
                disabled={!remarkText.trim() || actionLoading}
                className="self-end rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </div>
        )}

        {canComplete && !remarkText && (
          <div className="mt-3">
            <label className="block text-xs text-gray-500 mb-1">
              Optional: add a completion remark
            </label>
            <input
              value={remarkText}
              onChange={(e) => setRemarkText(e.target.value)}
              placeholder="Completion notes..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        )}
      </div>

      {task.statusHistory.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h4 className="text-sm font-semibold text-gray-700 mb-4">
            Status History
          </h4>
          <ol className="relative border-l border-gray-200 ml-3 space-y-4">
            {task.statusHistory.map((entry) => (
              <li key={entry.id} className="ml-6">
                <div className="absolute -left-1.5 top-1.5 h-3 w-3 rounded-full border-2 border-white bg-blue-400" />
                <div className="text-xs text-gray-500">
                  {new Date(entry.changedAt).toLocaleString()} &middot;{" "}
                  <span className="font-medium text-gray-700">
                    {entry.changedBy.firstName} {entry.changedBy.lastName}
                  </span>
                </div>
                <div className="mt-0.5 text-sm">
                  {entry.previousStatus &&
                    entry.previousStatus !== entry.newStatus && (
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
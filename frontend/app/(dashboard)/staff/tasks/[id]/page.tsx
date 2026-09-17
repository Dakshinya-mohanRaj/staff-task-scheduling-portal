"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const ROLE_LABELS: Record<string, string> = {
  FACULTY: "General Faculty",
  PLACEMENT_COORDINATOR: "Placement Coordinator",
  TRAINING_COORDINATOR: "Training Coordinator",
  ACADEMIC_COORDINATOR: "Academic Coordinator",
  PROGRAM_COORDINATOR: "Program Coordinator",
  STUDENT_ACTIVITY_COORDINATOR: "Student Activity Coordinator",
  MAINTENANCE_COORDINATOR: "Maintenance Coordinator",
  DOCUMENTATION_COORDINATOR: "Documentation Coordinator",
};

const ASSIGNER_LABELS: Record<string, string> = {
  HOD: "HOD",
  ADMIN: "HOD",
};

interface Role {
  code: string;
}

interface User {
  firstName: string;
  lastName: string;
  role?: Role;
}

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
  assignedTo: User;
  assignedBy: User;
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
  const label = statusLabel(status);
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${colors[status] || "bg-gray-100 text-gray-600 border-gray-200"}`}
    >
      {label}
    </span>
  );
}

function statusLabel(status: string) {
  if (!status) return "";
  if (status === "OVERDUE") return "Overdue";
  return status.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    HIGH: "bg-red-50 text-red-700 border-red-200",
    MEDIUM: "bg-yellow-50 text-yellow-700 border-yellow-200",
    LOW: "bg-green-50 text-green-700 border-green-200",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${colors[priority] || "bg-gray-50 text-gray-600 border-gray-200"}`}
    >
      {priority}
    </span>
  );
}

// startTime/endTime come back from Prisma as ISO datetimes on a fixed reference
// date (Time(6)); only the clock part is meaningful.
function timeLabel(t: string) {
  if (!t || t.length < 16) return t;
  const [, h, m] = t.slice(11, 19).split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return t.slice(11, 16);
  const period = h >= 12 ? "PM" : "AM";
  const hh = ((h + 11) % 12) + 1;
  return `${hh}:${String(m).padStart(2, "0")} ${period}`;
}

function scheduleStartDateTime(dateKey: string, timeISO: string) {
  if (!timeISO || timeISO.length < 19) return new Date(dateKey);
  return new Date(`${dateKey.slice(0, 10)}T${timeISO.slice(11, 19)}Z`);
}

function fullTimestamp(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${date} at ${timeLabel(d.toISOString())}`;
}

function schedDate(iso: string) {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00.000Z`);
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function StaffTaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [remarkDraft, setRemarkDraft] = useState("");
  const [completionDraft, setCompletionDraft] = useState("");

  const load = async () => {
    const { id } = await params;
    try {
      const r = await fetch(`/api/tasks/${id}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed to load task");
      setTask(d.data);
      setFetchError("");
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(""), 5000);
    return () => clearTimeout(t);
  }, [success]);

  const runAction = async (path: string, body?: Record<string, unknown>) => {
    setError("");
    setSuccess("");
    setActionLoading(true);
    try {
      const { id } = await params;
      const r = await fetch(`/api/tasks/${id}${path}`, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const d = await r.json();
      if (!r.ok) {
        setError(d.error || "Action failed");
        return false;
      }
      setTask(d.data);
      return true;
    } catch {
      setError("Network error");
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const handleStart = async () => {
    const ok = await runAction("/start");
    if (ok) setSuccess("Task started. Good luck!");
  };

  const handleComplete = async () => {
    const ok = await runAction(
      "/complete",
      completionDraft.trim() ? { text: completionDraft.trim() } : {},
    );
    if (ok) {
      setSuccess("Task completed. Great work!");
      setCompletionDraft("");
    }
  };

  const handleAddRemark = async () => {
    if (!remarkDraft.trim()) return;
    const ok = await runAction("/remarks", { text: remarkDraft.trim() });
    if (ok) {
      setSuccess("Progress update added.");
      setRemarkDraft("");
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse max-w-3xl space-y-6">
        <div className="h-8 w-64 bg-gray-200 rounded" />
        <div className="h-52 bg-gray-200 rounded-xl" />
        <div className="h-24 bg-gray-200 rounded-xl" />
        <div className="h-40 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="max-w-3xl">
        <div className="rounded-xl bg-white border border-red-200 p-6 text-center shadow-sm">
          <p className="text-sm text-red-600">{fetchError}</p>
          <button
            onClick={load}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="max-w-3xl">
        <div className="rounded-xl bg-white border border-gray-200 p-10 text-center shadow-sm">
          <p className="text-gray-500">Task not found</p>
          <Link
            href="/staff/tasks"
            className="mt-3 inline-block text-sm text-blue-600 hover:underline"
          >
            Back to My Tasks
          </Link>
        </div>
      </div>
    );
  }

  const storedStatus = task.status;
  const effectiveStatus = task.derivedStatus || task.status;
  const roleLabel = ROLE_LABELS[task.workOrder.requiredStaffRole] || task.workOrder.requiredStaffRole;
  const assignerLabel = ASSIGNER_LABELS[task.assignedBy.role?.code || ""] || "";

  const canStart = storedStatus === "SCHEDULED";
  const canComplete = storedStatus === "IN_PROGRESS";

  const now = new Date();
  const startAt = scheduleStartDateTime(task.scheduledDate, task.startTime);
  const startNotReached = canStart && now.getTime() < startAt.getTime();

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-gray-900">{task.workOrder.woNumber}</h1>
          <StatusBadge status={effectiveStatus} />
          <PriorityBadge priority={task.workOrder.priority} />
        </div>
        <Link
          href="/staff/tasks"
          className="text-sm text-blue-600 hover:underline whitespace-nowrap"
        >
          &larr; Back to tasks
        </Link>
      </div>

      {effectiveStatus === "OVERDUE" && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800 flex items-start gap-3">
          <svg className="w-5 h-5 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="font-semibold">This task is overdue.</p>
            {storedStatus === "SCHEDULED" && (
              <p className="text-sm mt-0.5">
                The scheduled window has passed. You can still start it if the work remains to be done.
              </p>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-start gap-3">
          <svg className="w-5 h-5 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800 flex items-center gap-3">
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-medium">{success}</span>
        </div>
      )}

      <div className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 px-6 py-5">
          <h2 className="text-lg font-bold text-gray-900">{task.workOrder.title}</h2>
          <p className="text-sm text-gray-500 mt-1">
            Assigned to you by{" "}
            <span className="font-medium text-gray-700">
              {task.assignedBy.firstName} {task.assignedBy.lastName}{assignerLabel ? ` (${assignerLabel})` : ""}
            </span>
          </p>
        </div>

        <div className="px-6 py-5 space-y-4 text-sm">
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Description
            </h3>
            <p className="text-gray-800 whitespace-pre-wrap">{task.workOrder.description || "No description provided."}</p>
          </div>

          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-gray-500">Responsibility</dt>
              <dd className="mt-0.5 font-medium text-gray-800 capitalize">{roleLabel}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Scheduled date</dt>
              <dd className="mt-0.5 font-medium text-gray-800">{schedDate(task.scheduledDate)}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Time window</dt>
              <dd className="mt-0.5 font-medium text-gray-800">
                {timeLabel(task.startTime)} &ndash; {timeLabel(task.endTime)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Started at</dt>
              <dd className="mt-0.5 font-medium text-gray-800">
                {task.startedAt ? fullTimestamp(task.startedAt) : <span className="text-gray-400">Not started</span>}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Completed at</dt>
              <dd className="mt-0.5 font-medium text-gray-800">
                {task.completedAt ? fullTimestamp(task.completedAt) : <span className="text-gray-400">Not completed</span>}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="rounded-xl bg-white border border-gray-200 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Actions</h3>

        {canStart && (
          <div className="space-y-4">
            <div className={startNotReached ? "opacity-50" : ""}>
              <p className="text-sm text-gray-600 mb-2">
                Mark this task as in progress.
                {startNotReached && (
                  <span className="text-gray-500">
                    {" "}
                    It opens at {timeLabel(task.startTime)} on your scheduled date.
                  </span>
                )}
              </p>
              <button
                onClick={handleStart}
                disabled={actionLoading || startNotReached}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
                {actionLoading ? "Starting..." : "Start Task"}
              </button>
              {startNotReached && (
                <p className="text-xs text-gray-400 mt-1">Button enables once the start time arrives.</p>
              )}
            </div>
          </div>
        )}

        {canComplete && (
          <div className="border-t border-gray-100 pt-4 mt-4 space-y-4">
            <div>
              <p className="text-sm text-gray-600">
                Mark this task as completed once the work is done.
              </p>
              <label className="block text-xs text-gray-500 mt-3 mb-1">
                Optional completion note
              </label>
              <textarea
                value={completionDraft}
                onChange={(e) => setCompletionDraft(e.target.value)}
                rows={2}
                maxLength={1000}
                placeholder="e.g. Session delivered, attendance recorded..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                onClick={handleComplete}
                disabled={actionLoading}
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-700 disabled:opacity-60"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 13l4 4L19 7" />
                </svg>
                {actionLoading ? "Completing..." : "Complete Task"}
              </button>
            </div>

            <div>
              <h4 className="text-sm font-semibold mt-4">Add Remark / Progress Update</h4>
              <p className="text-xs text-gray-500 mt-1">
                Provide a progress update so the HOD can track your work. Updates appear in the activity timeline below.
              </p>
              <textarea
                value={remarkDraft}
                onChange={(e) => setRemarkDraft(e.target.value)}
                rows={3}
                maxLength={1000}
                placeholder="e.g. Covered aptitude section; mock interviews scheduled..."
                className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                onClick={handleAddRemark}
                disabled={!remarkDraft.trim() || actionLoading}
                className="mt-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
              >
                {actionLoading ? "Adding..." : "Add Update"}
              </button>
            </div>
          </div>
        )}

        {storedStatus === "COMPLETED" && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <svg className="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            This task is completed. No further actions are available.
          </div>
        )}

        {storedStatus === "CANCELLED" && (
          <div className="text-sm text-gray-600">
            This task has been cancelled by the HOD and cannot be acted on.
          </div>
        )}

        {!canStart && !canComplete && storedStatus !== "COMPLETED" && storedStatus !== "CANCELLED" && (
          <p className="text-sm text-gray-500 italic">No actions available for this task status.</p>
        )}
      </div>

      <div className="rounded-xl bg-white border border-gray-200 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-5">
          Activity Timeline <span className="text-gray-400 font-normal">({task.statusHistory.length})</span>
        </h3>
        <ol className="relative space-y-0 border-l-2 border-gray-100 ml-2">
          {task.statusHistory.length === 0 && (
            <li className="ml-6 text-sm text-gray-500">No activity recorded yet.</li>
          )}
          {task.statusHistory.map((entry) => {
            const isRemark =
              entry.previousStatus !== null && entry.previousStatus === entry.newStatus;
            const isCreation = entry.previousStatus === null;
            const dotColor = isCreation
              ? "bg-gray-400"
              : isRemark
                ? "bg-amber-400"
                : entry.newStatus === "COMPLETED"
                  ? "bg-green-500"
                  : entry.newStatus === "IN_PROGRESS"
                    ? "bg-blue-500"
                    : entry.newStatus === "OVERDUE"
                      ? "bg-red-500"
                      : "bg-gray-400";
            return (
              <li key={entry.id} className="ml-5 pb-5">
                <span
                  className={`absolute -left-[7px] mt-1.5 h-3.5 w-3.5 rounded-full ring-2 ring-white ${dotColor}`}
                />
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
                  <span className="font-medium text-gray-400">
                    {fullTimestamp(entry.changedAt)}
                  </span>
                  <span>&middot;</span>
                  <span>
                    by {entry.changedBy.firstName} {entry.changedBy.lastName}
                  </span>
                </div>
                <div className="mt-1 text-sm text-gray-800">
                  {isCreation && (
                    <span>
                      <span className="font-semibold">Assigned</span> to{" "}
                      {task.assignedTo.firstName} {task.assignedTo.lastName}
                    </span>
                  )}
                  {isRemark && (
                    <div className="flex items-start gap-2 text-gray-700">
                      <span className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-sm text-gray-800 whitespace-pre-wrap">
                        {entry.remark}
                      </span>
                    </div>
                  )}
                  {!isCreation && !isRemark && (
                    <span>
                      <span className="text-gray-500 capitalize">
                        {statusLabel(entry.previousStatus || "")}
                      </span>{" "}
                      <span className="text-gray-400">&rarr;</span>{" "}
                      <span className="font-semibold capitalize">
                        {statusLabel(entry.newStatus)}
                      </span>
                      {entry.remark && (
                        <span className="mt-1 block rounded-lg bg-green-50 border border-green-100 px-3 py-2 text-sm text-gray-800 whitespace-pre-wrap">
                          {entry.remark}
                        </span>
                      )}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
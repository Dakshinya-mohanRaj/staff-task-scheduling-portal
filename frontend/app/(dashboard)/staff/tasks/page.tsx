"use client";

import { useEffect, useState } from "react";

interface TaskRow {
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
    priority: string;
    requiredStaffRole: string;
  };
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

function formatTime(t: string) {
  if (!t || t.length < 16) return t;
  return t.slice(11, 16);
}

export default function StaffTasksPage() {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/tasks")
      .then((r) => r.json())
      .then((r) => setTasks(r.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-gray-200 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">My Tasks Today</h2>
        <p className="text-sm text-gray-500 mt-1">
          {tasks.length} task(s) assigned to you
        </p>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-500">No tasks assigned for today</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const effectiveStatus =
              task.derivedStatus || task.status;
            const isActionable =
              effectiveStatus === "SCHEDULED" || effectiveStatus === "IN_PROGRESS";
            return (
              <a
                key={task.id}
                href={`/staff/tasks/${task.id}`}
                className={`block bg-white rounded-xl border p-4 shadow-sm transition-all hover:shadow-md ${
                  effectiveStatus === "OVERDUE"
                    ? "border-red-300 hover:border-red-400"
                    : "border-gray-200 hover:border-blue-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-xs text-gray-500 font-mono">
                      {task.workOrder.woNumber}
                    </div>
                    <div>
                      <div className="font-medium text-gray-800">
                        {task.workOrder.title}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {formatTime(task.startTime)} - {formatTime(task.endTime)}
                        <span className="mx-2">&middot;</span>
                        {task.workOrder.requiredStaffRole
                          .replace(/_/g, " ")
                          .toLowerCase()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <PriorityBadge priority={task.workOrder.priority} />
                    <StatusBadge status={effectiveStatus} />
                    {isActionable && (
                      <span className="text-blue-600 text-xs font-medium">
                        &rarr;
                      </span>
                    )}
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
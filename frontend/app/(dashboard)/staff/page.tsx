"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface StaffTask {
  id: string;
  woNumber: string;
  title: string;
  requiredStaffRole: string;
  priority: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  status: string;
  derivedStatus: string;
}

interface StaffStats {
  dateKey: string;
  totalTasks: number;
  scheduled: number;
  inProgress: number;
  completed: number;
  overdue: number;
  cancelled: number;
  upcoming: number;
  todayTasks: StaffTask[];
  upcomingTasks: StaffTask[];
}

interface MeResponse {
  userId: string;
  email: string;
  roleCode: string;
  staffRole: string | null;
  name: string;
}

const RESPONSIBILITY_LABELS: Record<string, string> = {
  FACULTY: "General Faculty",
  PLACEMENT_COORDINATOR: "Placement Coordinator",
  TRAINING_COORDINATOR: "Training Coordinator",
  ACADEMIC_COORDINATOR: "Academic Coordinator",
  PROGRAM_COORDINATOR: "Program Coordinator",
  STUDENT_ACTIVITY_COORDINATOR: "Student Activity Coordinator",
  MAINTENANCE_COORDINATOR: "Maintenance Coordinator",
  DOCUMENTATION_COORDINATOR: "Documentation Coordinator",
};

function responsibilityLabel(role: string) {
  return RESPONSIBILITY_LABELS[role] ?? role.replace(/_/g, " ").toLowerCase();
}

function formatTime(t: string) {
  if (!t || t.length < 16) return "--:--";
  return t.slice(11, 16);
}

function formatDateLabel(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
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
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      <div className="flex items-center gap-1.5">
        <span className={`h-2 w-2 rounded-full ${dot}`} />
        <span className="text-xs font-medium text-gray-500 truncate">
          {label}
        </span>
      </div>
      <div className={`mt-2 text-2xl font-bold ${accent}`}>{value}</div>
    </div>
  );
}

function TaskCard({
  task,
  showDate,
  onClick,
}: {
  task: StaffTask;
  showDate?: boolean;
  onClick: () => void;
}) {
  const effective = task.derivedStatus || task.status;
  const isOverdue = effective === "OVERDUE";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left bg-white rounded-xl border p-4 shadow-sm transition-all hover:shadow-md ${
        isOverdue
          ? "border-red-300 hover:border-red-400"
          : "border-gray-200 hover:border-blue-300"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-xs font-semibold text-gray-500 whitespace-nowrap">
            {task.woNumber}
          </span>
          <StatusBadge status={effective} />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <PriorityBadge priority={task.priority} />
          <span className="text-blue-600 text-xs font-medium">&rarr;</span>
        </div>
      </div>
      <div className="mt-2 font-medium text-gray-900">{task.title}</div>
      <div className="mt-1 text-xs text-gray-500">
        {responsibilityLabel(task.requiredStaffRole)}
        <span className="mx-2">&middot;</span>
        {showDate && (
          <>
            {formatDateLabel(task.scheduledDate)}
            <span className="mx-2">&middot;</span>
          </>
        )}
        <span className="font-mono">
          {formatTime(task.startTime)} - {formatTime(task.endTime)}
        </span>
      </div>
    </button>
  );
}

function Skeletons() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-10 w-72 bg-gray-200 rounded" />
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-24 bg-gray-200 rounded-xl" />
        ))}
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-gray-200 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export default function StaffDashboardPage() {
  const router = useRouter();

  const [stats, setStats] = useState<StaffStats | null>(null);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/dashboard/staff").then((r) => r.json()),
      fetch("/api/auth/me").then((r) => r.json()),
    ])
      .then(([statsRes, meRes]) => {
        if (!cancelled) {
          setStats(statsRes.data ?? null);
          setMe(meRes.data ?? null);
        }
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load your dashboard");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const retry = () => {
    setError("");
    setLoading(true);
    Promise.all([
      fetch("/api/dashboard/staff").then((r) => r.json()),
      fetch("/api/auth/me").then((r) => r.json()),
    ])
      .then(([statsRes, meRes]) => {
        setStats(statsRes.data ?? null);
        setMe(meRes.data ?? null);
        setError("");
      })
      .catch(() => setError("Failed to load your dashboard"))
      .finally(() => setLoading(false));
  };

  if (loading) {
    return <Skeletons />;
  }

  if (error || !stats) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        <p className="font-medium">Could not load your dashboard.</p>
        {error && <p className="mt-1">{error}</p>}
        <button
          onClick={retry}
          className="mt-3 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
        >
          Retry
        </button>
      </div>
    );
  }

  const firstName = me?.name ? me.name.split(" ")[0] : "there";
  const responsibility = me?.staffRole ? responsibilityLabel(me.staffRole) : null;

  const todayOpen = stats.todayTasks.filter(
    (t) =>
      (t.derivedStatus || t.status) !== "COMPLETED" &&
      (t.derivedStatus || t.status) !== "CANCELLED",
  );
  const todayDone = stats.todayTasks.filter(
    (t) =>
      (t.derivedStatus || t.status) === "COMPLETED" ||
      (t.derivedStatus || t.status) === "CANCELLED",
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {greeting()}, {firstName}
        </h1>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
          <span>
            Your responsibilities for{" "}
            {formatDateLabel(stats.dateKey)}
          </span>
          {responsibility && (
            <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
              {responsibility}
            </span>
          )}
        </div>
      </div>

      {/* Overdue alert */}
      {stats.overdue > 0 && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-red-100 flex items-center justify-center">
              <span className="text-red-600 text-sm font-bold">!</span>
            </div>
            <div>
              <div className="text-sm font-semibold text-red-800">
                {stats.overdue} overdue task{stats.overdue === 1 ? "" : "s"} need
                your attention
              </div>
              <div className="text-xs text-red-600">
                These duties should be addressed as soon as possible.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatCard
          label="Today's Tasks"
          value={stats.totalTasks}
          accent="text-gray-900"
          dot="bg-gray-900"
        />
        <StatCard
          label="In Progress"
          value={stats.inProgress}
          accent="text-amber-600"
          dot="bg-amber-500"
        />
        <StatCard
          label="Upcoming"
          value={stats.upcoming}
          accent="text-blue-600"
          dot="bg-blue-500"
        />
        <StatCard
          label="Completed"
          value={stats.completed}
          accent="text-green-600"
          dot="bg-green-500"
        />
        <StatCard
          label="Overdue"
          value={stats.overdue}
          accent={stats.overdue > 0 ? "text-red-600" : "text-gray-500"}
          dot={stats.overdue > 0 ? "bg-red-500" : "bg-gray-300"}
        />
      </div>

      {/* Today's tasks */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">Today&rsquo;s Tasks</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {todayOpen.length} open &middot; {todayDone.length} completed
            </p>
          </div>
        </div>

        {todayOpen.length === 0 && todayDone.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <p className="text-sm text-gray-500">
              No tasks scheduled for you today.
            </p>
          </div>
        ) : (
          <>
            {todayOpen.length > 0 && (
              <div className="space-y-3">
                {todayOpen.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onClick={() => router.push(`/staff/tasks/${task.id}`)}
                  />
                ))}
              </div>
            )}
            {todayDone.length > 0 && (
              <details>
                <summary className="cursor-pointer list-none text-sm font-medium text-gray-600 hover:text-gray-900 select-none">
                  <span className="inline-flex items-center gap-1 text-blue-600">
                    {todayDone.length} completed
                    <span className="text-gray-400">&rsaquo;</span>
                  </span>
                </summary>
                <div className="mt-3 space-y-3">
                  {todayDone.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onClick={() => router.push(`/staff/tasks/${task.id}`)}
                    />
                  ))}
                </div>
              </details>
            )}
          </>
        )}
      </section>

      {/* Upcoming tasks */}
      <section className="space-y-3">
        <div>
          <h2 className="text-base font-bold text-gray-900">Upcoming Tasks</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Duties scheduled for the coming days
          </p>
        </div>
        {stats.upcomingTasks.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-xl border border-gray-200">
            <p className="text-sm text-gray-500">
              No upcoming tasks assigned to you yet.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {stats.upcomingTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                showDate
                onClick={() => router.push(`/staff/tasks/${task.id}`)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
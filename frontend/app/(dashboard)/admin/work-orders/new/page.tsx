"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  staffRole: string;
  tasksOnDate: number;
  timeSlots: Array<{ startTime: string; endTime: string }>;
  available: boolean;
}

interface CreatedWorkOrder {
  id: string;
  woNumber: string;
  title: string;
}

const STAFF_ROLES = [
  { value: "FACULTY", label: "General Faculty" },
  { value: "PLACEMENT_COORDINATOR", label: "Placement Coordinator" },
  { value: "TRAINING_COORDINATOR", label: "Training Coordinator" },
  { value: "ACADEMIC_COORDINATOR", label: "Academic Coordinator" },
  { value: "PROGRAM_COORDINATOR", label: "Program Coordinator" },
  { value: "STUDENT_ACTIVITY_COORDINATOR", label: "Student Activity Coordinator" },
  { value: "MAINTENANCE_COORDINATOR", label: "Maintenance Coordinator" },
  { value: "DOCUMENTATION_COORDINATOR", label: "Documentation Coordinator" },
];

const PRIORITIES = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
];

function formatTime(t: string) {
  if (!t || t.length < 5) return "--:--";
  return t.slice(0, 5);
}

function isValidDateKey(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return !Number.isNaN(new Date(`${value}T00:00:00.000Z`).getTime());
}

function todayUTCKey() {
  return new Date().toISOString().slice(0, 10);
}

type FieldErrors = Record<string, string>;

export default function NewWorkOrderPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requiredStaffRole, setRequiredStaffRole] = useState("FACULTY");
  const [priority, setPriority] = useState("MEDIUM");
  const [scheduledDate, setScheduledDate] = useState(todayUTCKey());
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [staffError, setStaffError] = useState("");
  const [staffFetched, setStaffFetched] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<CreatedWorkOrder | null>(null);

  const todayKey = todayUTCKey();
  const dateIsValid = isValidDateKey(scheduledDate);
  const dateNotPast = dateIsValid && scheduledDate >= todayKey;
  const timeIsValid = Boolean(startTime && endTime && endTime > startTime);
  const searchReady = dateIsValid && dateNotPast && timeIsValid;

  const validate = useCallback((): FieldErrors => {
    const next: FieldErrors = {};
    if (!title.trim()) next.title = "Task title is required";
    else if (title.trim().length < 3)
      next.title = "Title must be at least 3 characters";

    if (!description.trim()) next.description = "Description is required";
    else if (description.trim().length < 10)
      next.description = "Description must be at least 10 characters";

    if (!scheduledDate) next.scheduledDate = "Scheduled date is required";
    else if (!dateIsValid)
      next.scheduledDate = "Enter a valid date (YYYY-MM-DD)";
    else if (!dateNotPast)
      next.scheduledDate = "Date must be today or a future date";

    if (!startTime) next.startTime = "Start time is required";
    if (!endTime) next.endTime = "End time is required";
    if (startTime && endTime && endTime <= startTime)
      next.endTime = "End time must be after start time";

    return next;
  }, [title, description, scheduledDate, startTime, endTime, dateIsValid, dateNotPast]);

  const validateField = useCallback(
    (field: string) => {
      const next = validate();
      setErrors((prev) => {
        const merged = { ...prev };
        if (next[field] === undefined) delete merged[field];
        else merged[field] = next[field];
        return merged;
      });
      return next[field] ?? "";
    },
    [validate],
  );

  const loadStaff = useCallback(
    async (
      role: string,
      date: string,
      start: string,
      end: string,
      spinner = false,
    ) => {
      if (spinner) setLoadingStaff(true);
      setStaffError("");
      try {
        const res = await fetch("/api/work-orders/suitable-staff", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requiredStaffRole: role,
            scheduledDate: date,
            startTime: start,
            endTime: end,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setStaffError(data.error || "Failed to load matching staff");
          setStaff([]);
          return;
        }
        setStaff(data.data ?? []);
        setStaffFetched(true);
      } catch {
        setStaffError("Network error while loading matching staff");
        setStaff([]);
      } finally {
        setLoadingStaff(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!searchReady) return;
    const timer = setTimeout(
      () =>
        loadStaff(requiredStaffRole, scheduledDate, startTime, endTime, true),
      450,
    );
    return () => clearTimeout(timer);
  }, [
    requiredStaffRole,
    scheduledDate,
    startTime,
    endTime,
    refreshKey,
    searchReady,
    loadStaff,
  ]);

  useEffect(() => {
    if (!created) return;
    const timer = setTimeout(
      () => router.push(`/admin/work-orders/${created.id}`),
      2500,
    );
    return () => clearTimeout(timer);
  }, [created, router]);

  const selectedStaff = staff.find((s) => s.id === selectedStaffId) ?? null;

  async function handleCreate() {
    const nextErrors = validate();
    setErrors(nextErrors);
    setSubmitError("");

    if (Object.keys(nextErrors).length > 0) return;

    if (!selectedStaffId) {
      setStaffError("Please select a faculty member or coordinator to assign this task.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/work-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          requiredStaffRole,
          priority,
          scheduledDate,
          startTime,
          endTime,
          assignedToId: selectedStaffId,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409 || data.code === "ASSIGNMENT_CONFLICT") {
          setSubmitError(
            "That faculty member is no longer available for this time slot. Please choose someone else or adjust the date/time.",
          );
          setSelectedStaffId(null);
          setRefreshKey((k) => k + 1);
        } else {
          setSubmitError(data.error || "Failed to create the work order");
        }
        return;
      }

      setCreated(data.data as CreatedWorkOrder);
    } catch {
      setSubmitError("Network error while creating the work order");
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setCreated(null);
    setTitle("");
    setDescription("");
    setRequiredStaffRole("FACULTY");
    setPriority("MEDIUM");
    setScheduledDate(todayUTCKey());
    setStartTime("09:00");
    setEndTime("17:00");
    setStaff([]);
    setSelectedStaffId(null);
    setStaffError("");
    setSubmitError("");
    setErrors({});
  }

  if (created) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl border border-green-200 shadow-sm p-8 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
            <span className="text-green-600 text-xl font-bold">&#10003;</span>
          </div>
          <h2 className="mt-4 text-2xl font-bold text-gray-900">
            Work Order Created Successfully
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            <span className="font-mono font-semibold text-gray-900">
              {created.woNumber}
            </span>{" "}
            &mdash; {created.title} is now scheduled and shown on the dashboard.
          </p>
          <p className="mt-2 text-xs text-gray-400">
            Redirecting to the work order details&hellip;
          </p>
          <div className="mt-6 flex flex-col sm:flex-row justify-center gap-2">
            <Link
              href={`/admin/work-orders/${created.id}`}
              className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              View Work Order
            </Link>
            <button
              onClick={resetForm}
              className="rounded-lg border border-gray-300 bg-white px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Create Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Create Work Order</h2>
        <p className="text-sm text-gray-500 mt-1">
          Assign a college responsibility to a faculty member or coordinator
        </p>
      </div>

      {submitError && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {submitError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        {/* Form */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Task / Work Order Title <span className="text-red-500">*</span>
            </label>
            <input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                validateField("title");
              }}
              placeholder="Short descriptive name"
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                errors.title
                  ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                  : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              }`}
            />
            {errors.title && (
              <p className="mt-1 text-xs text-red-600">{errors.title}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                validateField("description");
              }}
              rows={4}
              placeholder="Detailed description of the work to be performed (min 10 characters)"
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                errors.description
                  ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                  : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              }`}
            />
            {errors.description && (
              <p className="mt-1 text-xs text-red-600">
                {errors.description}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Responsibility <span className="text-red-500">*</span>
              </label>
              <select
                value={requiredStaffRole}
                onChange={(e) => {
                  setRequiredStaffRole(e.target.value);
                  setSelectedStaffId(null);
                }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {STAFF_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority <span className="text-red-500">*</span>
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Scheduled Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={scheduledDate}
                min={todayKey}
                onChange={(e) => {
                  setScheduledDate(e.target.value);
                  validateField("scheduledDate");
                }}
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                  errors.scheduledDate
                    ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                }`}
              />
              {errors.scheduledDate && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.scheduledDate}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Time <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => {
                  setStartTime(e.target.value);
                  validateField("startTime");
                  validateField("endTime");
                }}
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                  errors.startTime
                    ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                }`}
              />
              {errors.startTime && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.startTime}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Time <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => {
                  setEndTime(e.target.value);
                  validateField("endTime");
                  validateField("startTime");
                }}
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                  errors.endTime
                    ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                }`}
              />
              {errors.endTime && (
                <p className="mt-1 text-xs text-red-600">{errors.endTime}</p>
              )}
            </div>
          </div>
        </div>

        {/* Matching staff */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
            <div>
              <h3 className="text-sm font-bold text-gray-900">
                Matching Faculty &amp; Coordinators
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {requiredStaffRole === "FACULTY"
                  ? "General Faculty"
                  : requiredStaffRole.replace(/_/g, " ").toLowerCase()}{" "}
                &middot; {scheduledDate} &middot; {formatTime(startTime)} -{" "}
                {formatTime(endTime)}
              </p>
            </div>
            <button
              onClick={() => {
                setLoadingStaff(true);
                setRefreshKey((k) => k + 1);
              }}
              disabled={loadingStaff || !searchReady}
              className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              title="Refresh availability"
            >
              {loadingStaff ? "Loading..." : "Refresh"}
            </button>
          </div>

          <div className="p-5">
            {!searchReady ? (
              <p className="text-sm text-gray-500">
                Enter a valid future date and an end time after the start time
                to see matching faculty and coordinators.
              </p>
            ) : loadingStaff ? (
              <div className="space-y-2 animate-pulse">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-gray-200 rounded-lg" />
                ))}
              </div>
            ) : staffError ? (
              <div>
                <p className="text-sm text-red-700">{staffError}</p>
                <button
                  onClick={() => {
                    setLoadingStaff(true);
                    setRefreshKey((k) => k + 1);
                  }}
                  className="mt-2 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
                >
                  Retry
                </button>
              </div>
            ) : !staffFetched || staff.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-gray-500">
                  No faculty or coordinators currently match this responsibility
                  and time slot.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {staff.map((s) => {
                  const selected = selectedStaffId === s.id;
                  return (
                    <div
                      key={s.id}
                      onClick={() => s.available && setSelectedStaffId(s.id)}
                      className={`rounded-lg border p-3 ${
                        s.available
                          ? "cursor-pointer hover:bg-blue-50"
                          : "opacity-60 cursor-not-allowed"
                      } ${
                        selected
                          ? "border-blue-600 bg-blue-50 ring-1 ring-blue-600"
                          : "border-gray-200"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="staff"
                            checked={selected}
                            disabled={!s.available}
                            onChange={() => setSelectedStaffId(s.id)}
                            className="w-4 h-4 text-blue-600"
                          />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {s.firstName} {s.lastName}
                            </div>
                            <div className="text-xs text-gray-500">
                              {s.tasksOnDate} task{s.tasksOnDate === 1 ? "" : "s"}{" "}
                              on this date
                            </div>
                          </div>
                        </div>
                        {s.available ? (
                          <span className="text-xs font-medium text-green-700 bg-green-100 rounded-full px-2 py-0.5 whitespace-nowrap">
                            Available
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-red-700 bg-red-100 rounded-full px-2 py-0.5 whitespace-nowrap">
                            Conflict
                          </span>
                        )}
                      </div>
                      {s.timeSlots.length > 0 && (
                        <div className="mt-2 pl-6 text-xs text-gray-500">
                          Existing slots:{" "}
                          {s.timeSlots
                            .map(
                              (ts) =>
                                `${formatTime(ts.startTime)}-${formatTime(ts.endTime)}`,
                            )
                            .join(", ")}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Submission bar */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="text-sm text-gray-600">
          {selectedStaff ? (
            <>
              Assigning to{" "}
              <span className="font-semibold text-gray-900">
                {selectedStaff.firstName} {selectedStaff.lastName}
              </span>
            </>
          ) : (
            "Select a faculty member or coordinator from the matching list"
          )}
        </div>
        <button
          onClick={handleCreate}
          disabled={submitting || !searchReady || Object.keys(errors).length > 0}
          className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting
            ? "Creating..."
            : "Assign & Create Work Order"}
        </button>
      </div>
    </div>
  );
}
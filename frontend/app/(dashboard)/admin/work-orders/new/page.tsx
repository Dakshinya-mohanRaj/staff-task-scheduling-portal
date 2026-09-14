"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  staffRole: string;
  tasksOnDate: number;
  timeSlots: Array<{ startTime: string; endTime: string }>;
  available: boolean;
}

const STAFF_ROLES = [
  { value: "FACULTY", label: "Faculty" },
  { value: "PLACEMENT_COORDINATOR", label: "Placement Coordinator" },
  { value: "TRAINING_COORDINATOR", label: "Training Coordinator" },
  { value: "PROGRAM_COORDINATOR", label: "Program Coordinator" },
  { value: "ACADEMIC_COORDINATOR", label: "Academic Coordinator" },
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
  if (!t || t.length < 5) return t;
  return t.slice(0, 5);
}

export default function NewWorkOrderPage() {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "staff">("form");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requiredStaffRole, setRequiredStaffRole] = useState("FACULTY");
  const [priority, setPriority] = useState("MEDIUM");
  const [scheduledDate, setScheduledDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [loadingStaff, setLoadingStaff] = useState(false);

  async function handleFindStaff() {
    setError("");
    setLoadingStaff(true);
    try {
      const res = await fetch("/api/work-orders/suitable-staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requiredStaffRole,
          scheduledDate,
          startTime,
          endTime,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to find staff");
        return;
      }
      setStaff(data.data ?? []);
      setStep("staff");
    } catch {
      setError("Network error");
    } finally {
      setLoadingStaff(false);
    }
  }

  async function handleAssign() {
    if (!selectedStaffId) return;
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/work-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
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
        setError(data.error || "Failed to create work order");
        return;
      }
      router.push("/admin/work-orders");
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  if (step === "staff") {
    return (
      <div className="max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Select Staff Member
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {requiredStaffRole.replace(/_/g, " ")} &middot; {scheduledDate}{" "}
              &middot; {formatTime(startTime)} - {formatTime(endTime)}
            </p>
          </div>
          <button
            onClick={() => setStep("form")}
            className="text-sm text-blue-600 hover:underline"
          >
            &larr; Edit details
          </button>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {staff.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <p className="text-gray-500 text-sm">
              No staff members available for this time slot.
            </p>
            <button
              onClick={() => setStep("form")}
              className="mt-3 text-sm text-blue-600 hover:underline"
            >
              Adjust details
            </button>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 w-8" />
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Tasks Today
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Existing Slots
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Available
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {staff.map((s) => (
                    <tr
                      key={s.id}
                      onClick={() => s.available && setSelectedStaffId(s.id)}
                      className={`${
                        s.available
                          ? "cursor-pointer hover:bg-blue-50"
                          : "opacity-50 cursor-not-allowed"
                      } ${
                        selectedStaffId === s.id
                          ? "bg-blue-50 border-l-4 border-blue-600"
                          : ""
                      }`}
                    >
                      <td className="px-4 py-3 text-center">
                        {s.available && (
                          <input
                            type="radio"
                            name="staff"
                            checked={selectedStaffId === s.id}
                            onChange={() => setSelectedStaffId(s.id)}
                            className="w-4 h-4 text-blue-600"
                          />
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {s.firstName} {s.lastName}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {s.tasksOnDate}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {s.timeSlots.length > 0
                          ? s.timeSlots
                              .map(
                                (ts) =>
                                  `${formatTime(ts.startTime)}-${formatTime(ts.endTime)}`,
                              )
                              .join(", ")
                          : "None"}
                      </td>
                      <td className="px-4 py-3">
                        {s.available ? (
                          <span className="text-xs font-medium text-green-700 bg-green-100 rounded-full px-2 py-0.5">
                            Available
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-red-700 bg-red-100 rounded-full px-2 py-0.5">
                            Conflict
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setStep("form")}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={handleAssign}
                disabled={!selectedStaffId || submitting}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Assigning..." : "Assign & Create Work Order"}
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">
          Create Work Order
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Fill in the work order details, then find available staff
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Title
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Short descriptive name"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Detailed description of work to be performed (min 10 characters)"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Required Staff Role
            </label>
            <select
              value={requiredStaffRole}
              onChange={(e) => setRequiredStaffRole(e.target.value)}
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
              Priority
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

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <input
              type="date"
              value={scheduledDate}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Time
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Time
            </label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={handleFindStaff}
            disabled={
              !title ||
              title.length < 3 ||
              !description ||
              description.length < 10 ||
              loadingStaff
            }
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingStaff ? "Finding staff..." : "Find Available Staff"}
          </button>
        </div>
      </div>
    </div>
  );
}
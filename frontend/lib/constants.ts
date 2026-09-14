import {
  StaffRole,
  Priority,
  AssignmentStatus,
  WorkOrderStatus,
} from "@/lib/generated/prisma/client";

export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  FACULTY: "Faculty",
  PLACEMENT_COORDINATOR: "Placement Coordinator",
  TRAINING_COORDINATOR: "Training Coordinator",
  PROGRAM_COORDINATOR: "Program Coordinator",
  ACADEMIC_COORDINATOR: "Academic Coordinator",
  STUDENT_ACTIVITY_COORDINATOR: "Student Activity Coordinator",
  MAINTENANCE_COORDINATOR: "Maintenance Coordinator",
  DOCUMENTATION_COORDINATOR: "Documentation Coordinator",
};

export const STAFF_ROLE_OPTIONS = Object.values(StaffRole).map((value) => ({
  value,
  label: STAFF_ROLE_LABELS[value],
}));

export const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
};

export const ASSIGNMENT_STATUS_LABELS: Record<AssignmentStatus, string> = {
  SCHEDULED: "Scheduled",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  OVERDUE: "Overdue",
};

export const WORK_ORDER_STATUS_LABELS: Record<WorkOrderStatus, string> = {
  ASSIGNED: "Assigned",
  CANCELLED: "Cancelled",
};

export const DEFAULT_PAGE_SIZE = 50;
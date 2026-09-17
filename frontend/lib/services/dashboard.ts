import { prisma } from "@/lib/prisma";
import { AssignmentStatus } from "@/lib/generated/prisma/client";
import { parseDateKey, combineDateTime, todayKey } from "./work-orders";

export async function getAdminDashboardStats(dateKey?: string) {
  const key = dateKey || todayKey();
  const scheduledDate = parseDateKey(key);
  const nextDate = new Date(scheduledDate);
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);

  const [totalWorkOrders, assignments, totalStaff, assignedStaff] =
    await Promise.all([
      prisma.workOrder.count({
        where: { scheduledDate: { gte: scheduledDate, lt: nextDate } },
      }),
      prisma.taskAssignment.findMany({
        where: {
          scheduledDate: { gte: scheduledDate, lt: nextDate },
        },
        select: { status: true, assignedToId: true, endTime: true },
      }),
      prisma.user.count({
        where: { isActive: true, role: { code: "STAFF" } },
      }),
      prisma.taskAssignment.findMany({
        where: {
          scheduledDate: { gte: scheduledDate, lt: nextDate },
          status: { not: AssignmentStatus.CANCELLED },
        },
        select: { assignedToId: true },
        distinct: ["assignedToId"],
      }),
    ]);

  const now = new Date();
  const counts = {
    scheduled: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
    overdue: 0,
  };

  for (const a of assignments) {
    if (a.status === AssignmentStatus.CANCELLED) {
      counts.cancelled++;
      continue;
    }
    if (a.status === AssignmentStatus.COMPLETED) {
      counts.completed++;
      continue;
    }
    const isOverdue =
      combineDateTime(scheduledDate, a.endTime).getTime() < now.getTime();
    if (isOverdue) {
      counts.overdue++;
    } else if (a.status === AssignmentStatus.IN_PROGRESS) {
      counts.inProgress++;
    } else {
      counts.scheduled++;
    }
  }

  return {
    dateKey: key,
    totalWorkOrders,
    statusCounts: counts,
    totalStaffWithRole: totalStaff,
    staffAssignedToday: assignedStaff.length,
    staffAvailableToday: totalStaff - assignedStaff.length,
  };
}

export interface StaffDashboardTask {
  id: string;
  woNumber: string;
  title: string;
  requiredStaffRole: string;
  priority: string;
  scheduledDate: Date;
  startTime: Date;
  endTime: Date;
  status: AssignmentStatus;
  derivedStatus: AssignmentStatus;
}

export async function getStaffDashboardStats(userId: string, limit = 20) {
  const key = todayKey();
  const scheduledDate = parseDateKey(key);
  const nextDate = new Date(scheduledDate);
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);

  const now = new Date();

  const [todayAssignments, upcomingAssignments] = await Promise.all([
    prisma.taskAssignment.findMany({
      where: {
        assignedToId: userId,
        scheduledDate: { gte: scheduledDate, lt: nextDate },
      },
      include: { workOrder: true },
    }),
    prisma.taskAssignment.findMany({
      where: {
        assignedToId: userId,
        scheduledDate: { gte: nextDate },
        status: { in: [AssignmentStatus.SCHEDULED, AssignmentStatus.IN_PROGRESS] },
      },
      include: { workOrder: true },
      orderBy: [{ scheduledDate: "asc" }, { startTime: "asc" }],
      take: limit,
    }),
  ]);

  const toDerivedStatus = (a: {
    status: AssignmentStatus;
    scheduledDate: Date;
    endTime: Date;
  }): AssignmentStatus => {
    if (
      (a.status === AssignmentStatus.SCHEDULED ||
        a.status === AssignmentStatus.IN_PROGRESS) &&
      combineDateTime(a.scheduledDate, a.endTime).getTime() < now.getTime()
    ) {
      return AssignmentStatus.OVERDUE;
    }
    return a.status;
  };

  const mapTask = (a: (typeof todayAssignments)[number]): StaffDashboardTask => ({
    id: a.id,
    woNumber: a.workOrder.woNumber,
    title: a.workOrder.title,
    requiredStaffRole: a.workOrder.requiredStaffRole,
    priority: a.workOrder.priority,
    scheduledDate: a.scheduledDate,
    startTime: a.startTime,
    endTime: a.endTime,
    status: a.status,
    derivedStatus: toDerivedStatus(a),
  });

  const todayTasks = todayAssignments
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
    .map(mapTask);

  const upcomingTasks = upcomingAssignments.map(mapTask);

  let overdue = 0;
  let scheduled = 0;
  let inProgress = 0;
  let completed = 0;
  let cancelled = 0;

  for (const t of todayTasks) {
    if (t.derivedStatus === AssignmentStatus.OVERDUE) overdue++;
    else if (t.derivedStatus === AssignmentStatus.IN_PROGRESS) inProgress++;
    else if (t.derivedStatus === AssignmentStatus.COMPLETED) completed++;
    else if (t.derivedStatus === AssignmentStatus.CANCELLED) cancelled++;
    else scheduled++;
  }

  const nextTask =
    todayTasks.find(
      (t) =>
        t.derivedStatus === AssignmentStatus.SCHEDULED ||
        (t.derivedStatus === AssignmentStatus.IN_PROGRESS && overdue === 0),
    ) ?? null;

  return {
    dateKey: key,
    totalTasks: todayTasks.length,
    scheduled,
    inProgress,
    completed,
    overdue,
    cancelled,
    upcoming: upcomingTasks.length,
    nextTask: nextTask
      ? {
          title: nextTask.title,
          startTime: nextTask.startTime,
          scheduledDate: nextTask.scheduledDate,
        }
      : null,
    todayTasks,
    upcomingTasks,
  };
}
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

export async function getStaffDashboardStats(userId: string) {
  const key = todayKey();
  const scheduledDate = parseDateKey(key);
  const nextDate = new Date(scheduledDate);
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);

  const assignments = await prisma.taskAssignment.findMany({
    where: {
      assignedToId: userId,
      scheduledDate: { gte: scheduledDate, lt: nextDate },
    },
    include: { workOrder: true },
    orderBy: [{ startTime: "asc" }],
  });

  const now = new Date();
  let overdue = 0;
  let scheduled = 0;
  let inProgress = 0;
  let completed = 0;

  for (const a of assignments) {
    if (a.status === AssignmentStatus.COMPLETED) {
      completed++;
      continue;
    }
    const endDt = combineDateTime(scheduledDate, a.endTime);
    const isOverdue = endDt.getTime() < now.getTime();
    if (isOverdue) {
      overdue++;
    } else if (a.status === AssignmentStatus.IN_PROGRESS) {
      inProgress++;
    } else {
      scheduled++;
    }
  }

  const nextTask = assignments.find(
    (a) =>
      a.status === AssignmentStatus.SCHEDULED ||
      (a.status === AssignmentStatus.IN_PROGRESS && overdue === 0),
  );

  return {
    dateKey: key,
    totalTasks: assignments.length,
    scheduled,
    inProgress,
    completed,
    overdue,
    nextTask: nextTask
      ? {
          title: nextTask.workOrder.title,
          startTime: nextTask.startTime,
          scheduledDate: nextTask.scheduledDate,
        }
      : null,
  };
}
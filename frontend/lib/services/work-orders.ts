import { prisma } from "@/lib/prisma";
import {
  type StaffRole,
  WorkOrderStatus,
  AssignmentStatus,
} from "@/lib/generated/prisma/client";
import {
  AssignmentConflictError,
  NotFoundError,
  InvalidTransitionError,
} from "@/lib/errors";

function timeToKey(t: Date): string {
  return t.toISOString().slice(11, 16);
}

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function combineDateTime(date: Date, time: Date): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      time.getUTCHours(),
      time.getUTCMinutes(),
      time.getUTCSeconds(),
      time.getUTCMilliseconds(),
    ),
  );
}

export function parseDateKey(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

export function parseTimeKey(timeKey: string): Date {
  const [h, m] = timeKey.split(":").map(Number);
  return new Date(Date.UTC(1970, 0, 1, h, m, 0, 0));
}

export function hasOverlap(
  existingStart: number,
  existingEnd: number,
  newStart: number,
  newEnd: number,
): boolean {
  return existingStart < newEnd && existingEnd > newStart;
}

export async function findAvailableStaff(
  requiredStaffRole: StaffRole,
  dateKey: string,
  startTime: string,
  endTime: string,
) {
  const scheduledDate = parseDateKey(dateKey);
  const start = combineDateTime(scheduledDate, parseTimeKey(startTime));
  const end = combineDateTime(scheduledDate, parseTimeKey(endTime));

  const candidates = await prisma.user.findMany({
    where: {
      isActive: true,
      role: { code: "STAFF" },
      staffRole: requiredStaffRole,
    },
    orderBy: { firstName: "asc" },
  });

  const results = await Promise.all(
    candidates.map(async (user) => {
      const dayAssignments = await prisma.taskAssignment.findMany({
        where: {
          assignedToId: user.id,
          scheduledDate,
          status: { in: [AssignmentStatus.SCHEDULED, AssignmentStatus.IN_PROGRESS] },
        },
      });

      const timeSlots = dayAssignments
        .map((a) => ({
          startTime: timeToKey(a.startTime),
          endTime: timeToKey(a.endTime),
          workOrderId: a.workOrderId,
        }))
        .sort((a, b) => a.startTime.localeCompare(b.startTime));

      const hasConflict = dayAssignments.some((a) =>
        hasOverlap(a.startTime.getTime(), a.endTime.getTime(), start.getTime(), end.getTime()),
      );

      return {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        staffRole: user.staffRole,
        tasksOnDate: dayAssignments.length,
        timeSlots,
        available: !hasConflict,
      };
    }),
  );

  return results;
}

export async function createWorkOrder(
  data: {
    title: string;
    description: string;
    requiredStaffRole: StaffRole;
    priority: "LOW" | "MEDIUM" | "HIGH";
    scheduledDate: string;
    startTime: string;
    endTime: string;
    assignedToId: string;
  },
  createdById: string,
) {
  const scheduledDate = parseDateKey(data.scheduledDate);
  const startTime = combineDateTime(scheduledDate, parseTimeKey(data.startTime));
  const endTime = combineDateTime(scheduledDate, parseTimeKey(data.endTime));

  if (endTime <= startTime) {
    throw new InvalidTransitionError("end time", "end time after start time");
  }

  const staff = await prisma.user.findUnique({ where: { id: data.assignedToId } });
  if (!staff) throw new NotFoundError("Staff member not found");
  if (staff.roleId !== (await prisma.role.findUnique({ where: { code: "STAFF" } }))?.id) {
    throw new InvalidTransitionError("assignedToId", "a valid staff member");
  }

  const conflict = await prisma.taskAssignment.findFirst({
    where: {
      assignedToId: data.assignedToId,
      scheduledDate,
      status: { in: [AssignmentStatus.SCHEDULED, AssignmentStatus.IN_PROGRESS] },
      OR: [
        { startTime: { lt: endTime }, endTime: { gt: startTime } },
      ],
    },
  });

  if (conflict) throw new AssignmentConflictError();

  const maxWo = await prisma.workOrder.findFirst({
    orderBy: { createdAt: "desc" },
    select: { woNumber: true },
  });

  let nextNumber = 1;
  if (maxWo) {
    const match = maxWo.woNumber.match(/WO-(\d+)/);
    if (match) nextNumber = parseInt(match[1], 10) + 1;
  }
  const woNumber = `WO-${String(nextNumber).padStart(4, "0")}`;

  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const workOrder = await tx.workOrder.create({
      data: {
        woNumber,
        title: data.title,
        description: data.description,
        requiredStaffRole: data.requiredStaffRole,
        priority: data.priority,
        scheduledDate,
        startTime,
        endTime,
        status: WorkOrderStatus.ASSIGNED,
        createdById,
      },
    });

    const assignment = await tx.taskAssignment.create({
      data: {
        workOrderId: workOrder.id,
        assignedToId: data.assignedToId,
        assignedById: createdById,
        scheduledDate,
        startTime,
        endTime,
        status: AssignmentStatus.SCHEDULED,
      },
    });

    await tx.taskStatusHistory.create({
      data: {
        taskAssignmentId: assignment.id,
        previousStatus: null,
        newStatus: AssignmentStatus.SCHEDULED,
        changedById: createdById,
        changedAt: now,
        remark: `Assigned to ${staff.firstName} ${staff.lastName} for ${data.title}`,
      },
    });

    return { workOrder, assignment };
  });

  return result;
}

export async function listWorkOrders(
  dateKey?: string,
  status?: string,
  offset = 0,
  limit = 50,
) {
  const where: Record<string, unknown> = {};
  if (dateKey) {
    const d = parseDateKey(dateKey);
    const next = new Date(d);
    next.setUTCDate(next.getUTCDate() + 1);
    where.scheduledDate = { gte: d, lt: next };
  }
  if (status) {
    where.status = status;
  }

  const [rows, total] = await Promise.all([
    prisma.workOrder.findMany({
      where,
      include: {
        assignment: {
          include: {
            assignedTo: true,
          },
        },
      },
      orderBy: [{ scheduledDate: "desc" }, { createdAt: "desc" }],
      skip: offset,
      take: limit,
    }),
    prisma.workOrder.count({ where }),
  ]);

  const enriched = rows.map((wo) => {
    const assignment = wo.assignment;
    let derivedStatus = assignment?.status ?? null;
    if (assignment) {
      const now = new Date();
      if (
        (assignment.status === AssignmentStatus.SCHEDULED ||
          assignment.status === AssignmentStatus.IN_PROGRESS) &&
        wo.endTime.getTime() < now.getTime()
      ) {
        derivedStatus = AssignmentStatus.OVERDUE;
      }
    }
    return { ...wo, derivedStatus };
  });

  return { data: enriched, total };
}

export async function getWorkOrderById(id: string) {
  const wo = await prisma.workOrder.findUnique({
    where: { id },
    include: {
      assignment: {
        include: {
          assignedTo: true,
          assignedBy: true,
          statusHistory: {
            include: { changedBy: true },
            orderBy: { changedAt: "asc" },
          },
        },
      },
      createdBy: true,
    },
  });
  if (!wo) throw new NotFoundError("Work order not found");
  const assignment = wo.assignment;
  let derivedStatus = assignment?.status ?? null;
  if (assignment) {
    const now = new Date();
    if (
      (assignment.status === AssignmentStatus.SCHEDULED ||
        assignment.status === AssignmentStatus.IN_PROGRESS) &&
      wo.endTime.getTime() < now.getTime()
    ) {
      derivedStatus = AssignmentStatus.OVERDUE;
    }
  }
  return { ...wo, derivedStatus };
}
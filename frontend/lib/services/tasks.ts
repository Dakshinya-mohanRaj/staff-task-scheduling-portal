import { prisma } from "@/lib/prisma";
import { AssignmentStatus } from "@/lib/generated/prisma/client";
import {
  NotFoundError,
  InvalidTransitionError,
} from "@/lib/errors";
import { combineDateTime, parseDateKey } from "./work-orders";

function computeDerivedStatus(
  status: AssignmentStatus,
  endTime: Date,
  scheduledDate: Date,
): AssignmentStatus {
  const now = new Date();
  if (
    (status === AssignmentStatus.SCHEDULED ||
      status === AssignmentStatus.IN_PROGRESS) &&
    combineDateTime(scheduledDate, endTime).getTime() < now.getTime()
  ) {
    return AssignmentStatus.OVERDUE;
  }
  return status;
}

export async function getStaffTasksForDate(userId: string, dateKey?: string) {
  const key = dateKey || new Date().toISOString().slice(0, 10);
  const scheduledDate = parseDateKey(key);
  const nextDate = new Date(scheduledDate);
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);

  const assignments = await prisma.taskAssignment.findMany({
    where: {
      assignedToId: userId,
      scheduledDate: { gte: scheduledDate, lt: nextDate },
    },
    include: {
      workOrder: true,
    },
    orderBy: [{ startTime: "asc" }],
  });

  return assignments.map((a) => ({
    ...a,
    derivedStatus: computeDerivedStatus(a.status, a.endTime, a.scheduledDate),
  }));
}

export async function getTaskById(taskAssignmentId: string) {
  const assignment = await prisma.taskAssignment.findUnique({
    where: { id: taskAssignmentId },
    include: {
      workOrder: true,
      assignedTo: true,
      assignedBy: true,
      statusHistory: {
        include: { changedBy: true },
        orderBy: { changedAt: "asc" },
      },
    },
  });
  if (!assignment) throw new NotFoundError("Task not found");
  return {
    ...assignment,
    derivedStatus: computeDerivedStatus(
      assignment.status,
      assignment.endTime,
      assignment.scheduledDate,
    ),
  };
}

export async function startTask(taskAssignmentId: string, userId: string) {
  const assignment = await prisma.taskAssignment.findUnique({
    where: { id: taskAssignmentId },
    include: { workOrder: true },
  });
  if (!assignment) throw new NotFoundError("Task not found");
  if (assignment.assignedToId !== userId)
    throw new InvalidTransitionError("access", "task owner");
  if (assignment.status !== AssignmentStatus.SCHEDULED)
    throw new InvalidTransitionError(assignment.status, "IN_PROGRESS");

  const startDateTime = combineDateTime(
    assignment.scheduledDate,
    assignment.startTime,
  );
  if (new Date() < startDateTime)
    throw new InvalidTransitionError("not started", "start time not reached");

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.taskAssignment.update({
      where: { id: taskAssignmentId },
      data: {
        status: AssignmentStatus.IN_PROGRESS,
        startedAt: now,
      },
    });

    await tx.taskStatusHistory.create({
      data: {
        taskAssignmentId,
        previousStatus: AssignmentStatus.SCHEDULED,
        newStatus: AssignmentStatus.IN_PROGRESS,
        changedById: userId,
        changedAt: now,
      },
    });
  });

  return getTaskById(taskAssignmentId);
}

export async function completeTask(taskAssignmentId: string, userId: string, remark?: string) {
  const assignment = await prisma.taskAssignment.findUnique({
    where: { id: taskAssignmentId },
  });
  if (!assignment) throw new NotFoundError("Task not found");
  if (assignment.assignedToId !== userId)
    throw new InvalidTransitionError("access", "task owner");
  if (assignment.status !== AssignmentStatus.IN_PROGRESS)
    throw new InvalidTransitionError(assignment.status, "COMPLETED");

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.taskAssignment.update({
      where: { id: taskAssignmentId },
      data: {
        status: AssignmentStatus.COMPLETED,
        completedAt: now,
      },
    });

    await tx.taskStatusHistory.create({
      data: {
        taskAssignmentId,
        previousStatus: AssignmentStatus.IN_PROGRESS,
        newStatus: AssignmentStatus.COMPLETED,
        changedById: userId,
        changedAt: now,
        remark: remark || null,
      },
    });
  });

  return getTaskById(taskAssignmentId);
}

export async function addRemark(taskAssignmentId: string, userId: string, text: string) {
  const assignment = await prisma.taskAssignment.findUnique({
    where: { id: taskAssignmentId },
  });
  if (!assignment) throw new NotFoundError("Task not found");
  if (assignment.assignedToId !== userId)
    throw new InvalidTransitionError("access", "task owner");
  if (assignment.status !== AssignmentStatus.IN_PROGRESS)
    throw new InvalidTransitionError(assignment.status, "add remark (must be IN_PROGRESS)");

  const now = new Date();

  await prisma.taskStatusHistory.create({
    data: {
      taskAssignmentId,
      previousStatus: AssignmentStatus.IN_PROGRESS,
      newStatus: AssignmentStatus.IN_PROGRESS,
      changedById: userId,
      changedAt: now,
      remark: text,
    },
  });

  return getTaskById(taskAssignmentId);
}
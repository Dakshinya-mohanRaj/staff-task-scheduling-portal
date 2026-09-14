import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  AssignmentStatus,
  StaffRole,
  Priority,
  WorkOrderStatus,
} from "../lib/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env["DATABASE_URL"] }),
});

const DEMO_PASSWORD = "password123";
const BCRYPT_ROUNDS = 10;

const today = new Date();
const day = (offset: number) => {
  const d = new Date(today);
  d.setDate(today.getDate() + offset);
  return d;
};

const at = (date: Date, time: string): Date => {
  const [h, m] = time.split(":").map(Number);
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d;
};

const dateOnly = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_ROUNDS);

  // -------- Roles --------
  await prisma.role.upsert({
    where: { code: "ADMIN" },
    update: { name: "Admin" },
    create: { code: "ADMIN", name: "Admin", description: "HOD / Department Head with full access" },
  });
  await prisma.role.upsert({
    where: { code: "STAFF" },
    update: { name: "Staff / User" },
    create: { code: "STAFF", name: "Staff / User", description: "Faculty who execute assigned tasks" },
  });

  const adminRole = await prisma.role.findUniqueOrThrow({ where: { code: "ADMIN" } });
  const staffRole = await prisma.role.findUniqueOrThrow({ where: { code: "STAFF" } });

  // -------- Users --------
  const users = new Map<string, { id: string }>();

  const userSpecs: Array<{
    key: string;
    firstName: string;
    lastName: string;
    email: string;
    roleId: string;
    staffRole?: StaffRole;
  }> = [
    { key: "hod", firstName: "Dr. Ananya", lastName: "Iyer", email: "hod@college.edu", roleId: adminRole.id },
    { key: "admin", firstName: "Prof. Rajesh", lastName: "Menon", email: "admin@college.edu", roleId: adminRole.id },
    { key: "faculty", firstName: "Prof. Kavitha", lastName: "Sharma", email: "kavitha@college.edu", roleId: staffRole.id, staffRole: StaffRole.FACULTY },
    { key: "placement", firstName: "Dr. Rohan", lastName: "Deshpande", email: "rohan@college.edu", roleId: staffRole.id, staffRole: StaffRole.PLACEMENT_COORDINATOR },
    { key: "training", firstName: "Prof. Meera", lastName: "Krishnan", email: "meera@college.edu", roleId: staffRole.id, staffRole: StaffRole.TRAINING_COORDINATOR },
    { key: "program", firstName: "Prof. Arjun", lastName: "Venkatesh", email: "arjun@college.edu", roleId: staffRole.id, staffRole: StaffRole.PROGRAM_COORDINATOR },
    { key: "academic", firstName: "Dr. Sneha", lastName: "Patil", email: "sneha@college.edu", roleId: staffRole.id, staffRole: StaffRole.ACADEMIC_COORDINATOR },
    { key: "studentActivity", firstName: "Prof. Vikram", lastName: "Rao", email: "vikram@college.edu", roleId: staffRole.id, staffRole: StaffRole.STUDENT_ACTIVITY_COORDINATOR },
    { key: "maintenance", firstName: "Mr. Suresh", lastName: "Nair", email: "suresh@college.edu", roleId: staffRole.id, staffRole: StaffRole.MAINTENANCE_COORDINATOR },
    { key: "documentation", firstName: "Dr. Lakshmi", lastName: "Natarajan", email: "lakshmi@college.edu", roleId: staffRole.id, staffRole: StaffRole.DOCUMENTATION_COORDINATOR },
  ];

  for (const spec of userSpecs) {
    const user = await prisma.user.upsert({
      where: { email: spec.email },
      update: {
        firstName: spec.firstName,
        lastName: spec.lastName,
        passwordHash,
        roleId: spec.roleId,
        staffRole: spec.staffRole ?? null,
        isActive: true,
      },
      create: {
        firstName: spec.firstName,
        lastName: spec.lastName,
        email: spec.email,
        passwordHash,
        roleId: spec.roleId,
        staffRole: spec.staffRole ?? null,
        isActive: true,
      },
    });
    users.set(spec.key, user);
  }

  const hod = users.get("hod")!;
  const admin = users.get("admin")!;

  // -------- Work Orders --------
  type WorkOrderSpec = {
    key: string;
    woNumber: string;
    title: string;
    description: string;
    requiredStaffRole: StaffRole;
    priority: Priority;
    dateOffset: number;
    startTime: string;
    endTime: string;
    assigneeKey: string;
    assignmentStatus: AssignmentStatus;
    startedOffsetDays?: number;
    completedOffsetDays?: number;
    cancelled?: boolean;
    cancellationReason?: string;
    remarks?: Array<{ text: string; byKey: string; offsetDays: number }>;
  };

  const workOrderSpecs: WorkOrderSpec[] = [
    {
      key: "wo-placement",
      woNumber: "WO-0001",
      title: "Campus Placement Drive – Day 1",
      description: "Coordinate the on-campus placement drive for final-year students with 12 recruiting companies, venue setup, and interview scheduling.",
      requiredStaffRole: StaffRole.PLACEMENT_COORDINATOR,
      priority: Priority.HIGH,
      dateOffset: 0,
      startTime: "09:00",
      endTime: "17:00",
      assigneeKey: "placement",
      assignmentStatus: AssignmentStatus.IN_PROGRESS,
      startedOffsetDays: 0,
      remarks: [
        { text: "Venue arranged in Block A seminar halls; company onboarding started.", byKey: "placement", offsetDays: 0 },
      ],
    },
    {
      key: "wo-training",
      woNumber: "WO-0002",
      title: "Faculty Development Program on AI Tools",
      description: "Organize a one-day FDP on AI-powered teaching tools for 60 faculty members, including hands-on lab session and feedback collection.",
      requiredStaffRole: StaffRole.TRAINING_COORDINATOR,
      priority: Priority.MEDIUM,
      dateOffset: -1,
      startTime: "10:00",
      endTime: "16:00",
      assigneeKey: "training",
      assignmentStatus: AssignmentStatus.COMPLETED,
      startedOffsetDays: -1,
      completedOffsetDays: -1,
    },
    {
      key: "wo-program",
      woNumber: "WO-0003",
      title: "Annual Tech Fest – Inauguration Ceremony",
      description: "Plan and manage the tech fest inaugural event with chief guest invite, stage setup, student volunteers, and program schedule.",
      requiredStaffRole: StaffRole.PROGRAM_COORDINATOR,
      priority: Priority.HIGH,
      dateOffset: 1,
      startTime: "11:00",
      endTime: "14:00",
      assigneeKey: "program",
      assignmentStatus: AssignmentStatus.SCHEDULED,
    },
    {
      key: "wo-academic",
      woNumber: "WO-0004",
      title: "Odd-Semester Timetable Finalization",
      description: "Consolidate department-wise slot requests and finalize the odd-semester timetable with no faculty clashes.",
      requiredStaffRole: StaffRole.ACADEMIC_COORDINATOR,
      priority: Priority.MEDIUM,
      dateOffset: -2,
      startTime: "09:30",
      endTime: "13:00",
      assigneeKey: "academic",
      assignmentStatus: AssignmentStatus.COMPLETED,
      startedOffsetDays: -2,
      completedOffsetDays: -2,
    },
    {
      key: "wo-student-activity",
      woNumber: "WO-0005",
      title: "NSS Blood Donation Camp",
      description: "Coordinate the NSS blood donation camp with the district blood bank, student registration desk, and donor refreshments.",
      requiredStaffRole: StaffRole.STUDENT_ACTIVITY_COORDINATOR,
      priority: Priority.LOW,
      dateOffset: 0,
      startTime: "08:30",
      endTime: "13:00",
      assigneeKey: "studentActivity",
      assignmentStatus: AssignmentStatus.IN_PROGRESS,
      startedOffsetDays: 0,
    },
    {
      key: "wo-maintenance",
      woNumber: "WO-0006",
      title: "Campus Infrastructure Audit",
      description: "Conduct a walkthrough audit of all classrooms, labs, and washrooms; log maintenance issues and propose a repair list.",
      requiredStaffRole: StaffRole.MAINTENANCE_COORDINATOR,
      priority: Priority.MEDIUM,
      dateOffset: 1,
      startTime: "14:00",
      endTime: "17:00",
      assigneeKey: "maintenance",
      assignmentStatus: AssignmentStatus.SCHEDULED,
    },
    {
      key: "wo-documentation",
      woNumber: "WO-0007",
      title: "NAAC SSR Compilation",
      description: "Collect and compile department evidence files for the NAAC Self-Study Report, including data tables and photo documentation.",
      requiredStaffRole: StaffRole.DOCUMENTATION_COORDINATOR,
      priority: Priority.HIGH,
      dateOffset: 0,
      startTime: "10:00",
      endTime: "15:00",
      assigneeKey: "documentation",
      assignmentStatus: AssignmentStatus.IN_PROGRESS,
      startedOffsetDays: 0,
      remarks: [
        { text: "Evidences from CSE and ECE departments uploaded; pending civil department.", byKey: "documentation", offsetDays: 0 },
      ],
    },
    {
      key: "wo-faculty",
      woNumber: "WO-0008",
      title: "Guest Lecture: Data Science Fundamentals",
      description: "Deliver an expert guest lecture on data science fundamentals for third-year students in the Computer Science department.",
      requiredStaffRole: StaffRole.FACULTY,
      priority: Priority.LOW,
      dateOffset: -1,
      startTime: "14:30",
      endTime: "16:00",
      assigneeKey: "faculty",
      assignmentStatus: AssignmentStatus.COMPLETED,
      startedOffsetDays: -1,
      completedOffsetDays: -1,
    },
    {
      key: "wo-maintenance-cancelled",
      woNumber: "WO-0009",
      title: "Generator Servicing – Block C",
      description: "Oversee the annual servicing of the emergency generator in Block C, including fuel and battery checks.",
      requiredStaffRole: StaffRole.MAINTENANCE_COORDINATOR,
      priority: Priority.MEDIUM,
      dateOffset: -3,
      startTime: "09:00",
      endTime: "12:00",
      assigneeKey: "maintenance",
      assignmentStatus: AssignmentStatus.CANCELLED,
      cancelled: true,
      cancellationReason: "Servicing rescheduled to the next quarter due to vendor unavailability.",
    },
  ];

  const workOrderIds = new Map<string, string>();

  for (const spec of workOrderSpecs) {
    const scheduledDate = dateOnly(day(spec.dateOffset));

    const workOrder = await prisma.workOrder.upsert({
      where: { woNumber: spec.woNumber },
      update: {
        title: spec.title,
        description: spec.description,
        requiredStaffRole: spec.requiredStaffRole,
        priority: spec.priority,
        scheduledDate,
        startTime: at(scheduledDate, spec.startTime),
        endTime: at(scheduledDate, spec.endTime),
        status: spec.cancelled ? WorkOrderStatus.CANCELLED : WorkOrderStatus.ASSIGNED,
        createdById: hod.id,
      },
      create: {
        woNumber: spec.woNumber,
        title: spec.title,
        description: spec.description,
        requiredStaffRole: spec.requiredStaffRole,
        priority: spec.priority,
        scheduledDate,
        startTime: at(scheduledDate, spec.startTime),
        endTime: at(scheduledDate, spec.endTime),
        status: spec.cancelled ? WorkOrderStatus.CANCELLED : WorkOrderStatus.ASSIGNED,
        createdById: hod.id,
      },
    });
    workOrderIds.set(spec.key, workOrder.id);
  }

  // -------- Task Assignments --------
  const assignmentIds = new Map<string, string>();

  for (const spec of workOrderSpecs) {
    const assignee = users.get(spec.assigneeKey)!;
    const scheduledDate = dateOnly(day(spec.dateOffset));
    const started = spec.startedOffsetDays !== undefined;
    const completed = spec.completedOffsetDays !== undefined;

    const startedAt = started ? at(day(spec.startedOffsetDays!), spec.startTime) : undefined;
    const completedAt = completed
      ? at(
          day(spec.completedOffsetDays!),
          spec.assignmentStatus === AssignmentStatus.COMPLETED
            ? spec.endTime
            : spec.startTime,
        )
      : undefined;

    const assignment = await prisma.taskAssignment.upsert({
      where: { workOrderId: workOrderIds.get(spec.key)! },
      update: {
        assignedToId: assignee.id,
        assignedById: hod.id,
        scheduledDate,
        startTime: at(scheduledDate, spec.startTime),
        endTime: at(scheduledDate, spec.endTime),
        status: spec.assignmentStatus,
        startedAt: startedAt ?? null,
        completedAt: completedAt ?? null,
        cancelledAt: spec.cancelled ? at(day(spec.dateOffset), spec.startTime) : null,
        cancellationReason: spec.cancellationReason ?? null,
      },
      create: {
        workOrderId: workOrderIds.get(spec.key)!,
        assignedToId: assignee.id,
        assignedById: hod.id,
        scheduledDate,
        startTime: at(scheduledDate, spec.startTime),
        endTime: at(scheduledDate, spec.endTime),
        status: spec.assignmentStatus,
        startedAt: startedAt ?? null,
        completedAt: completedAt ?? null,
        cancelledAt: spec.cancelled ? at(day(spec.dateOffset), spec.startTime) : null,
        cancellationReason: spec.cancellationReason ?? null,
      },
    });
    assignmentIds.set(spec.key, assignment.id);

    // -------- Status History (immutable audit trail) --------
    await prisma.taskStatusHistory.deleteMany({
      where: { taskAssignmentId: assignment.id },
    });

    const history: Array<{
      previousStatus: AssignmentStatus | null;
      newStatus: AssignmentStatus;
      changedById: string;
      changedAt: Date;
      remark?: string;
    }> = [];

    history.push({
      previousStatus: null,
      newStatus: AssignmentStatus.SCHEDULED,
      changedById: hod.id,
      changedAt: at(day(spec.dateOffset - 1), "17:30"),
      remark: `Assigned to ${assignee.firstName} ${assignee.lastName} for ${spec.title}`,
    });

    if (spec.assignmentStatus === AssignmentStatus.CANCELLED) {
      history.push({
        previousStatus: AssignmentStatus.SCHEDULED,
        newStatus: AssignmentStatus.CANCELLED,
        changedById: hod.id,
        changedAt: at(day(spec.dateOffset), spec.startTime),
        remark: spec.cancellationReason,
      });
    }

    if (spec.startedOffsetDays !== undefined) {
      history.push({
        previousStatus: AssignmentStatus.SCHEDULED,
        newStatus: AssignmentStatus.IN_PROGRESS,
        changedById: users.get(spec.assigneeKey)!.id,
        changedAt: at(day(spec.startedOffsetDays), spec.startTime),
      });
    }

    if (spec.completedOffsetDays !== undefined && !spec.cancelled) {
      history.push({
        previousStatus: AssignmentStatus.IN_PROGRESS,
        newStatus: AssignmentStatus.COMPLETED,
        changedById: users.get(spec.assigneeKey)!.id,
        changedAt: at(day(spec.completedOffsetDays), spec.endTime),
      });
    }

    for (const remark of spec.remarks ?? []) {
      history.push({
        previousStatus: AssignmentStatus.IN_PROGRESS,
        newStatus: AssignmentStatus.IN_PROGRESS,
        changedById: users.get(remark.byKey)!.id,
        changedAt: at(day(remark.offsetDays), spec.startTime),
        remark: remark.text,
      });
    }

    for (const entry of history) {
      await prisma.taskStatusHistory.create({
        data: {
          taskAssignmentId: assignment.id,
          previousStatus: entry.previousStatus,
          newStatus: entry.newStatus,
          changedById: entry.changedById,
          changedAt: entry.changedAt,
          remark: entry.remark ?? null,
        },
      });
    }
  }

  const [userCount, woCount, taCount, histCount] = await Promise.all([
    prisma.user.count(),
    prisma.workOrder.count(),
    prisma.taskAssignment.count(),
    prisma.taskStatusHistory.count(),
  ]);

  console.log(`Seed complete:`);
  console.log(`  roles: 2, users: ${userCount}, work_orders: ${woCount}, task_assignments: ${taCount}, task_status_history: ${histCount}`);
  console.log(`Demo password for all users: ${DEMO_PASSWORD}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { UnauthorizedError, ForbiddenError } from "@/lib/errors";
import type { StaffRole } from "@/lib/generated/prisma/client";

export interface AuthSession {
  userId: string;
  email: string;
  roleCode: "ADMIN" | "STAFF";
  staffRole: string | null;
  name: string;
}

export const verifySession = cache(async (): Promise<AuthSession> => {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
});

export async function requireAuth(): Promise<AuthSession> {
  const session = await getSession();
  if (!session) throw new UnauthorizedError();
  return session;
}

export async function requireHod(): Promise<AuthSession> {
  const session = await requireAuth();
  if (session.roleCode !== "ADMIN")
    throw new ForbiddenError("HOD access required");
  return session;
}

export async function requireStaff(): Promise<AuthSession> {
  const session = await requireAuth();
  if (session.roleCode !== "STAFF")
    throw new ForbiddenError("Staff access required");
  return session;
}

export async function getUserById(id: string) {
  return prisma.user.findUnique({ where: { id }, include: { role: true } });
}

export async function getActiveStaffByRole(staffRole: StaffRole) {
  return prisma.user.findMany({
    where: {
      isActive: true,
      role: { code: "STAFF" },
      staffRole,
    },
    include: { role: true },
  });
}

export async function getAllActiveStaff() {
  return prisma.user.findMany({
    where: {
      isActive: true,
      role: { code: "STAFF" },
    },
    include: { role: true },
  });
}
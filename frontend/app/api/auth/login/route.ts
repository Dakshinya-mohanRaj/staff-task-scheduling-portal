import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/passwords";
import { createSession } from "@/lib/auth/session";
import { loginSchema } from "@/lib/validations";
import { handleRouteError, jsonError, jsonSuccess } from "@/lib/api-helpers";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(
        parsed.error.issues.map((i) => i.message).join("; "),
        400,
      );
    }

    const { email, password } = parsed.data;
    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });

    if (!user || !user.isActive) {
      return jsonError("Invalid credentials", 401);
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return jsonError("Invalid credentials", 401);
    }

    const isHttps =
      request.headers.get("x-forwarded-proto") === "https" ||
      request.nextUrl.protocol === "https:";

    await createSession(
      {
        userId: user.id,
        email: user.email,
        roleCode: user.role.code as "ADMIN" | "STAFF",
        staffRole: user.staffRole ?? null,
        name: `${user.firstName} ${user.lastName}`,
      },
      { secure: isHttps },
    );

    return jsonSuccess({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roleCode: user.role.code,
      staffRole: user.staffRole,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
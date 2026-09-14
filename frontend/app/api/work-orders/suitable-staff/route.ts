import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/dal";
import { findAvailableStaff } from "@/lib/services/work-orders";
import { suitableStaffSchema } from "@/lib/validations";
import { handleRouteError, jsonError, jsonSuccess } from "@/lib/api-helpers";

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const parsed = suitableStaffSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(
        parsed.error.issues.map((i) => i.message).join("; "),
        400,
      );
    }
    const staff = await findAvailableStaff(
      parsed.data.requiredStaffRole,
      parsed.data.scheduledDate,
      parsed.data.startTime,
      parsed.data.endTime,
    );
    return jsonSuccess(staff);
  } catch (error) {
    return handleRouteError(error);
  }
}
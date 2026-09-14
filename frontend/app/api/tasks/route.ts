import { NextRequest } from "next/server";
import { requireStaff } from "@/lib/dal";
import { getStaffTasksForDate } from "@/lib/services/tasks";
import { handleRouteError, jsonSuccess } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  try {
    const session = await requireStaff();
    const { searchParams } = request.nextUrl;
    const date = searchParams.get("date") ?? undefined;
    const tasks = await getStaffTasksForDate(session.userId, date);
    return jsonSuccess(tasks);
  } catch (error) {
    return handleRouteError(error);
  }
}
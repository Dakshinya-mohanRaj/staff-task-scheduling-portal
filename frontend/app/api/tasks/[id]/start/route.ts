import { NextRequest } from "next/server";
import { requireStaff } from "@/lib/dal";
import { startTask } from "@/lib/services/tasks";
import { handleRouteError, jsonSuccess } from "@/lib/api-helpers";

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireStaff();
    const { id } = await context.params;
    const task = await startTask(id, session.userId);
    return jsonSuccess(task);
  } catch (error) {
    return handleRouteError(error);
  }
}
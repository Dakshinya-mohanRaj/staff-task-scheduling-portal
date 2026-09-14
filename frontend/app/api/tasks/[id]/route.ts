import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/dal";
import { getTaskById } from "@/lib/services/tasks";
import { NotFoundError } from "@/lib/errors";
import { handleRouteError, jsonSuccess } from "@/lib/api-helpers";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAuth();
    const { id } = await context.params;
    const task = await getTaskById(id);
    if (
      session.roleCode === "STAFF" &&
      task.assignedToId !== session.userId
    ) {
      throw new NotFoundError("Task not found");
    }
    return jsonSuccess(task);
  } catch (error) {
    return handleRouteError(error);
  }
}
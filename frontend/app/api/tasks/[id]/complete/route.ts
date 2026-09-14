import { NextRequest } from "next/server";
import { requireStaff } from "@/lib/dal";
import { completeTask } from "@/lib/services/tasks";
import { remarkSchema } from "@/lib/validations";
import { handleRouteError, jsonSuccess } from "@/lib/api-helpers";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireStaff();
    const { id } = await context.params;
    let remark: string | undefined;
    try {
      const body = await request.json();
      const parsed = remarkSchema.safeParse(body);
      if (parsed.success) remark = parsed.data.text;
    } catch {
      // no body is fine
    }
    const task = await completeTask(id, session.userId, remark);
    return jsonSuccess(task);
  } catch (error) {
    return handleRouteError(error);
  }
}
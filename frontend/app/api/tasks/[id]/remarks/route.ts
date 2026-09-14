import { NextRequest } from "next/server";
import { requireStaff } from "@/lib/dal";
import { addRemark } from "@/lib/services/tasks";
import { remarkSchema } from "@/lib/validations";
import { handleRouteError, jsonError, jsonSuccess } from "@/lib/api-helpers";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireStaff();
    const { id } = await context.params;
    const body = await request.json();
    const parsed = remarkSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(
        parsed.error.issues.map((i) => i.message).join("; "),
        400,
      );
    }
    const task = await addRemark(id, session.userId, parsed.data.text);
    return jsonSuccess(task);
  } catch (error) {
    return handleRouteError(error);
  }
}
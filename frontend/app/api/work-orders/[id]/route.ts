import { NextRequest } from "next/server";
import { requireHod } from "@/lib/dal";
import { getWorkOrderById } from "@/lib/services/work-orders";
import { handleRouteError, jsonSuccess } from "@/lib/api-helpers";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireHod();
    const { id } = await context.params;
    const wo = await getWorkOrderById(id);
    return jsonSuccess(wo);
  } catch (error) {
    return handleRouteError(error);
  }
}
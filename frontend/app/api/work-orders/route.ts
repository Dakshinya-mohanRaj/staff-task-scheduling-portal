import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/dal";
import {
  listWorkOrders,
  createWorkOrder,
} from "@/lib/services/work-orders";
import { createWorkOrderSchema } from "@/lib/validations";
import { handleRouteError, jsonError, jsonSuccess } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = request.nextUrl;
    const date = searchParams.get("date") ?? undefined;
    const status = searchParams.get("status") ?? undefined;
    const offset = Number(searchParams.get("offset") ?? 0);
    const limit = Number(searchParams.get("limit") ?? 100);
    const result = await listWorkOrders(date, status, offset, limit);
    return jsonSuccess(result.data, 200, result.total);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await request.json();
    const parsed = createWorkOrderSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(
        parsed.error.issues.map((i) => i.message).join("; "),
        400,
      );
    }
    const result = await createWorkOrder(parsed.data, session.userId);
    return jsonSuccess(result.workOrder, 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
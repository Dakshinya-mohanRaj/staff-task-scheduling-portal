import { NextRequest } from "next/server";
import { requireHod } from "@/lib/dal";
import { getAdminDashboardStats } from "@/lib/services/dashboard";
import { handleRouteError, jsonSuccess } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  try {
    await requireHod();
    const { searchParams } = request.nextUrl;
    const date = searchParams.get("date") ?? undefined;
    const stats = await getAdminDashboardStats(date);
    return jsonSuccess(stats);
  } catch (error) {
    return handleRouteError(error);
  }
}
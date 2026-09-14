import { requireStaff } from "@/lib/dal";
import { getStaffDashboardStats } from "@/lib/services/dashboard";
import { handleRouteError, jsonSuccess } from "@/lib/api-helpers";

export async function GET() {
  try {
    const session = await requireStaff();
    const stats = await getStaffDashboardStats(session.userId);
    return jsonSuccess(stats);
  } catch (error) {
    return handleRouteError(error);
  }
}
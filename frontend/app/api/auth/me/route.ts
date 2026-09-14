import { getSession } from "@/lib/auth/session";
import { jsonSuccess } from "@/lib/api-helpers";

export async function GET() {
  const session = await getSession();
  if (!session) return jsonSuccess(null, 401);
  return jsonSuccess({
    userId: session.userId,
    email: session.email,
    roleCode: session.roleCode,
    staffRole: session.staffRole,
    name: session.name,
  });
}
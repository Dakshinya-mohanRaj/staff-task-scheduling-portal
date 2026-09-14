import { destroySession } from "@/lib/auth/session";
import { jsonSuccess } from "@/lib/api-helpers";

export async function POST() {
  await destroySession();
  return jsonSuccess({ message: "Logged out" });
}
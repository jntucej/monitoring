import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok, fail } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";
import { listForClass, refreshLeaderboards } from "@/lib/student/leaderboard";

async function handleGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  const parts = new URL(req.url).pathname.split("/");
  const classId = decodeURIComponent(parts[parts.length - 2]);
  if (
    req.nextUrl.searchParams.get("refresh") === "1" &&
    ["hod", "dean", "admin", "sysadmin"].includes(auth.role)
  ) {
    await refreshLeaderboards().catch(() => {});
  }

  const res = await listForClass(classId, auth.userId, auth.role);
  if (!res.ok) return fail("FORBIDDEN", res.error, res.status);
  return ok({ class_id: classId, leaderboard: res.rows });
}

export const GET = withAuthorization(handleGet, {
  requiredRole: ["student", "faculty", "hod", "dean", "principal", "admin", "sysadmin"],
});

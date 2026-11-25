import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok, fail } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";
import { resolveSharedAchievement } from "@/lib/student/achievements";

async function handleGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  const parts = new URL(req.url).pathname.split("/");
  const token = parts[parts.length - 1];
  const row = await resolveSharedAchievement(token, auth.userId);
  if (!row) return fail("NOT_FOUND", "Achievement not found", 404);
  return ok(row);
}

export const GET = withAuthorization(handleGet, {
  requiredRole: ["student", "faculty", "hod", "dean", "principal", "admin", "sysadmin"],
});

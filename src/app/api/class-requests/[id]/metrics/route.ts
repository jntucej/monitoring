import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok, fail } from "@/server/http/response";
import { buildClassRequestMetrics } from "@/lib/student/calendar";

async function handleGet(req: NextRequest) {
  const parts = new URL(req.url).pathname.split("/");
  const requestId = parts[parts.length - 2];
  const metrics = await buildClassRequestMetrics(requestId);
  if (!metrics) return fail("NOT_FOUND", "Class request not found", 404);
  return ok(metrics);
}

export const GET = withAuthorization(handleGet, {
  requiredRole: ["student", "faculty", "hod", "dean", "admin", "sysadmin"],
});

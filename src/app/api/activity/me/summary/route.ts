import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";
import { summarizeByCategory } from "@/lib/student/activity";

async function handleGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  const days = Number(req.nextUrl.searchParams.get("days") ?? 30);
  const summary = await summarizeByCategory(auth.userId, Number.isFinite(days) ? days : 30);
  return ok(summary);
}

export const GET = withAuthorization(handleGet, {
  requiredRole: ["student", "admin", "sysadmin"],
});

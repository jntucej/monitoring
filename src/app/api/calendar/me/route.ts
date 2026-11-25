import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";
import { getDayComposite } from "@/lib/student/calendar";

async function handleGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  const date =
    req.nextUrl.searchParams.get("date") ??
    req.nextUrl.searchParams.get("from") ??
    new Date().toISOString().slice(0, 10);
  const composite = await getDayComposite(auth.userId, date);
  return ok(composite);
}

export const GET = withAuthorization(handleGet, {
  requiredRole: ["student", "faculty", "hod", "admin", "sysadmin"],
});

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { ok, fail } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";
import { archiveActivity } from "@/lib/student/activity";

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrfErr = assertCsrf(req);
  if (csrfErr) return csrfErr;

  const b = await req.json().catch(() => null);
  const ids = Array.isArray(b?.ids) ? b.ids.map(String) : [];
  if (ids.length === 0) return fail("INVALID_INPUT", "ids array is required", 400);

  const archived = await archiveActivity(auth.userId, ids);
  return ok({ archived });
}

export const POST = withAuthorization(handlePost, {
  requiredRole: ["student", "admin", "sysadmin"],
});

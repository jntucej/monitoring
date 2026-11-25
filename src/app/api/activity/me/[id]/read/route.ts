import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { ok } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";
import { markActivityRead } from "@/lib/student/activity";

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrfErr = assertCsrf(req);
  if (csrfErr) return csrfErr;

  const parts = new URL(req.url).pathname.split("/");
  const id = parts[parts.length - 2];
  await markActivityRead(auth.userId, id);
  return ok({ read: true, id });
}

export const POST = withAuthorization(handlePost, {
  requiredRole: ["student", "admin", "sysadmin"],
});

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { ok, fail } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";
import { logSosEvent } from "@/lib/security/dispatch";

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrfErr = assertCsrf(req);
  if (csrfErr) return csrfErr;

  const parts = new URL(req.url).pathname.split("/");
  const sosId = parts[parts.length - 2];
  const b = await req.json().catch(() => null);
  const note = String(b?.note ?? "").trim();
  if (!note) return fail("INVALID_INPUT", "note is required", 400);

  await logSosEvent(sosId, auth.userId, auth.role, "note_added", { note });
  return ok({ sos_id: sosId, note_added: true });
}

export const POST = withAuthorization(handlePost, {
  requiredRole: ["operator", "supervisor", "admin", "sysadmin"],
});

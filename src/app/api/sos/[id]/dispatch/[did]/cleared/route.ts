import { NextRequest, NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import type { AuthContext } from "@/lib/authContext";
import { transitionDispatch } from "@/lib/security/dispatch";

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrfErr = assertCsrf(req);
  if (csrfErr) return csrfErr;

  const parts = new URL(req.url).pathname.split("/");
  const did = parts[parts.length - 2];
  const sosId = parts[parts.length - 4];
  const b = await req.json().catch(() => ({}));
  const notes = b?.notes ? String(b.notes) : undefined;

  const res = await transitionDispatch(sosId, did, auth.userId, "cleared", notes);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json({ ok: true, status: "cleared" });
}

export const POST = withAuthorization(handlePost, {
  requiredRole: ["operator", "supervisor"],
});

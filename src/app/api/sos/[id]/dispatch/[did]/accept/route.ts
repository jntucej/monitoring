import { NextRequest, NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withActiveShift, type ActiveShiftContext } from "@/middleware/activeShift";
import { assertCsrf } from "@/lib/csrf";
import { acceptDispatch } from "@/lib/security/dispatch";

async function handlePost(req: NextRequest, ctx: ActiveShiftContext) {
  const csrfErr = assertCsrf(req);
  if (csrfErr) return csrfErr;

  const parts = new URL(req.url).pathname.split("/");
  const did = parts[parts.length - 2];
  const sosId = parts[parts.length - 4];

  const res = await acceptDispatch(sosId, did, ctx.auth.userId);
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: res.status });
  }
  return NextResponse.json({ ok: true, status: "accepted" });
}

export const POST = withAuthorization(
  withActiveShift(handlePost, { need: "sos_respond", operatorOnly: true }),
  { requiredRole: ["operator", "supervisor"] },
);

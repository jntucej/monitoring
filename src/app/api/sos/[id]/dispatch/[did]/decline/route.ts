import { NextRequest, NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withActiveShift, type ActiveShiftContext } from "@/middleware/activeShift";
import { assertCsrf } from "@/lib/csrf";
import { query } from "@/lib/postgres";
import { logSosEvent } from "@/lib/security/dispatch";

async function handlePost(req: NextRequest, ctx: ActiveShiftContext) {
  const csrfErr = assertCsrf(req);
  if (csrfErr) return csrfErr;

  const parts = new URL(req.url).pathname.split("/");
  const did = parts[parts.length - 2];
  const sosId = parts[parts.length - 4];
  const b = await req.json().catch(() => ({}));
  const reason = String(b?.reason ?? "declined").trim();

  const { rows } = await query<{ id: string }>(
    `UPDATE public.sos_dispatch
        SET status = 'declined', decline_reason = $3
      WHERE id = $1::uuid AND sos_id = $2::uuid AND operator_id = $4::uuid AND status = 'offered'
      RETURNING id`,
    [did, sosId, reason, ctx.auth.userId],
  );
  if (!rows[0]) {
    return NextResponse.json({ error: "cannot_decline" }, { status: 409 });
  }
  await logSosEvent(sosId, ctx.auth.userId, ctx.auth.role, "declined", { dispatch_id: did, reason });
  return NextResponse.json({ ok: true, status: "declined" });
}

export const POST = withAuthorization(
  withActiveShift(handlePost, { need: "sos_respond", operatorOnly: true }),
  { requiredRole: ["operator", "supervisor"] },
);

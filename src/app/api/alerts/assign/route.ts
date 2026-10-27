import { NextRequest, NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { assertCsrf } from "@/lib/csrf";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { addNotification, addAudit } from "@/lib/db";
import type { AuthContext } from "@/lib/authContext";

async function handlePost(
  req: NextRequest,
  { auth }: { auth: AuthContext }
): Promise<Response> {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  const body = await req.json().catch(() => ({}));
  const alertId = String(body.alertId ?? "").trim();
  const assigneeId = String(body.assigneeId ?? "").trim();

  if (!alertId || !assigneeId) {
    return NextResponse.json(
      { success: false, error: { code: "MISSING_FIELDS", message: "alertId and assigneeId required" } },
      { status: 400 }
    );
  }

  const supabase = getSupabaseServiceClient();
  const { data: assignee, error: aErr } = await supabase
    .from("users")
    .select("id, name, role, status")
    .eq("id", assigneeId)
    .maybeSingle();

  if (aErr || !assignee) {
    return NextResponse.json(
      { success: false, error: { code: "ASSIGNEE_NOT_FOUND", message: "Assignee not found" } },
      { status: 404 }
    );
  }
  if (assignee.status !== "ACTIVE") {
    return NextResponse.json(
      { success: false, error: { code: "ASSIGNEE_INACTIVE", message: "Assignee is not active" } },
      { status: 400 }
    );
  }

  const { data: alert, error: alErr } = await supabase
    .from("alerts")
    .select("id, title, severity, resolved")
    .eq("id", alertId)
    .maybeSingle();

  if (alErr || !alert) {
    return NextResponse.json(
      { success: false, error: { code: "ALERT_NOT_FOUND", message: "Alert not found" } },
      { status: 404 }
    );
  }
  if (alert.resolved) {
    return NextResponse.json(
      { success: false, error: { code: "ALERT_RESOLVED", message: "Cannot assign a resolved alert" } },
      { status: 409 }
    );
  }

  await addAudit({
    action: "ALERT_ASSIGNED",
    userId: auth.userId,
    userName: auth.email ?? auth.userId,
    role: auth.role,
    details: JSON.stringify({ alertId, assigneeId, assigneeRole: assignee.role }),
  });

  await addNotification(
    "user",
    assigneeId,
    "alert",
    "Alert Assigned",
    `You have been assigned alert: ${alert.title}`
  );

  return NextResponse.json({
    success: true,
    data: { alertId, assigneeId, assigneeName: assignee.name },
  });
}

export const POST = withRateLimit(withAuthorization(handlePost), {
  windowMs: 60_000,
  maxRequests: 60,
});

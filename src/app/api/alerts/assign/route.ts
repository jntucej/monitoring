import { NextRequest, NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { addNotification, addAudit } from "@/lib/db";
import type { AuthContext } from "@/lib/authContext";

/**
 * POST /api/alerts/assign
 *
 * Thin write endpoint that lets a supervisor (or higher) re-route / acknowledge
 * an alert to a specific operator or supervisor for follow-up.
 *
 * Body:
 *   {
 *     alert_id: string,
 *     assignee_user_id: string,   // target user (operator / supervisor / admin)
 *     assignee_role?: string,     // human-readable label for the audit trail
 *     note?: string               // optional free-text context
 *   }
 *
 * The alert row itself is not mutated (no `assigned_to` column in schema) —
 * instead this writes an audit-log entry and a system notification to the
 * assignee so the assignment is visible in the audit trail and the assignee's
 * inbox. This keeps the schema clean and makes the action reversible /
 * auditable without a new column.
 *
 * Rate-limited to 20 req/min per caller.
 */
async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  try {
    const db = getSupabaseServiceClient();
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "Invalid JSON body" } },
        { status: 400 }
      );
    }

    const alertId = typeof body.alert_id === "string" ? body.alert_id : "";
    const assigneeUserId = typeof body.assignee_user_id === "string" ? body.assignee_user_id : "";
    const assigneeRole = typeof body.assignee_role === "string" ? body.assignee_role : "operator";
    const note = typeof body.note === "string" ? body.note.slice(0, 500) : "";

    if (!alertId || !assigneeUserId) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "alert_id and assignee_user_id are required" } },
        { status: 400 }
      );
    }

    // Verify the alert exists and is still unresolved.
    const { data: alertRow, error: alertErr } = await db
      .from("alerts")
      .select("id, severity, title, resolved")
      .eq("id", alertId)
      .single();
    if (alertErr || !alertRow) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Alert not found or already resolved." } },
        { status: 404 }
      );
    }
    if (alertRow.resolved) {
      return NextResponse.json(
        { success: false, error: { code: "ALREADY_RESOLVED", message: "This alert is already resolved." } },
        { status: 409 }
      );
    }

    // Verify the assignee is a valid user.
    const { data: assignee, error: assigneeErr } = await db
      .from("users")
      .select("id, name, role")
      .eq("id", assigneeUserId)
      .single();
    if (assigneeErr || !assignee) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Assignee user not found." } },
        { status: 404 }
      );
    }

    const severity = alertRow.severity ?? "medium";
    const title = alertRow.title ?? "Alert";

    // Audit entry.
    await addAudit({
      action: "ALERT_ASSIGNED",
      userId: auth.userId,
      role: auth.role,
      details: JSON.stringify({ alert_id: alertId, alert_severity: severity, alert_title: title, assigned_to: assigneeUserId, assignee_role: assigneeRole, note }),
    });

    // Notify the assignee directly (reuse the shared helper for consistent row shape).
    try {
      await addNotification(
        "user",
        assigneeUserId,
        "alert_assignment",
        `Alert assigned: ${title}`,
        note || `You have been assigned alert ${alertId} (${severity}).`
      );
    } catch (notifErr) {
      console.warn("[alerts/assign] notification failed:", notifErr);
      // Non-fatal — the audit entry was already written.
    }

    return NextResponse.json({
      success: true,
      data: {
        alert_id: alertId,
        assigned_to: assigneeUserId,
        assigned_to_name: assignee.name,
        assigned_to_role: assignee.role,
        note,
      },
    });
  } catch (error) {
    console.error("[alerts/assign] error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to assign alert." } },
      { status: 500 }
    );
  }
}

export const POST = withRateLimit(
  withAuthorization(handlePost, {
    requiredRole: ["supervisor", "admin", "sysadmin", "principal"],
  }),
  { keyPrefix: "alert_assign", maxRequests: 20 }
);

export const dynamic = "force-dynamic";

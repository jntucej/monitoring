import { NextRequest, NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { applyScheduleSuggestion } from "@/lib/scheduling-assistant";
import { logAuditEvent } from "@/lib/audit";

async function handlePost(req: NextRequest) {
  try {
    const { suggestionId } = await req.json();
    const actorId = req.headers.get("x-user-id") || "admin";
    const actorRole = req.headers.get("x-user-role") || "admin";

    if (!suggestionId) {
      return NextResponse.json({ success: false, error: "Missing suggestionId" }, { status: 400 });
    }

    const applied = await applyScheduleSuggestion(suggestionId);
    if (applied) {
      await logAuditEvent({
        action: "SMART_SCHEDULE_APPLIED",
        userId: actorId,
        userName: `Admin (${actorId})`,
        userRole: actorRole,
        details: { suggestionId, appliedAt: new Date().toISOString() },
      }).catch(() => null);
    }

    return NextResponse.json({
      success: applied,
      message: "Schedule recommendation applied successfully and audit log updated.",
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export const POST = withAuthorization(handlePost, { requiredRole: ["admin", "sysadmin"] });
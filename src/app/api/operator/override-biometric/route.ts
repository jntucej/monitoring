import { NextRequest, NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { getSupabaseServiceClient } from "@/lib/supabaseClient";

/**
 * POST /api/operator/override-biometric
 *
 * Allows an operator to manually override biometric verification when a student/person
 * does not have biometrics enrolled or scanner fails.
 *
 * Persists an audit log, posts a high-severity alert, and dispatches a notification
 * to both `sysadmin` and `admin` roles.
 */
async function handlePost(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const actorId = req.headers.get("x-user-id") || "";
    const actorRole = req.headers.get("x-user-role") || "operator";
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip") || "unknown";

    const { personId, personName, gateId, gateName, reason } = body || {};

    if (!personId) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "personId is required" } },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServiceClient();
    const timestamp = new Date().toISOString();

    // 1. Audit log entry
    try {
      await supabase.from("audit_logs").insert({
        action: "BIOMETRIC_OVERRIDE",
        user_id: actorId || null,
        user_name: "Gate Operator",
        user_role: actorRole,
        details: {
          personId,
          personName: personName || "Unknown",
          gateId: gateId || null,
          gateName: gateName || "Gate Desk",
          reason: reason || "Manual operator override during gate scan",
        },
        ip_address: ip,
        user_agent: req.headers.get("user-agent") || "unknown",
        timestamp,
      });
    } catch (e) {
      console.error("Audit log insert error during biometric override:", e);
    }

    // 2. High severity alert for security monitoring
    try {
      await supabase.from("alerts").insert({
        severity: "warning",
        title: "Biometric Verification Overridden",
        message: `Operator (${actorRole}) manually overrode biometric check for ${personName || personId} at gate ${gateName || gateId || "Main Gate"}.`,
        timestamp,
        resolved: false,
      });
    } catch (e) {
      console.error("Alert insert error during biometric override:", e);
    }

    // 3. Notifications targeting sysadmin and admin roles
    const notificationIdSysAdmin = `notif-bio-override-sysadmin-${Date.now()}`;
    const notificationIdAdmin = `notif-bio-override-admin-${Date.now()}`;

    try {
      await supabase.from("notifications").insert([
        {
          id: notificationIdSysAdmin,
          type: "gate_biometric_override",
          priority: "high",
          title: "⚠️ Biometric Gate Override",
          message: `Operator overrode biometric verification for ${personName || personId} at ${gateName || "Gate"}.`,
          recipient_id: "sysadmin",
          recipient_type: "role",
          channels: ["in_app"],
          data: { personId, personName, gateId, gateName, operatorId: actorId },
          created_at: timestamp,
        },
        {
          id: notificationIdAdmin,
          type: "gate_biometric_override",
          priority: "high",
          title: "⚠️ Biometric Gate Override",
          message: `Operator overrode biometric verification for ${personName || personId} at ${gateName || "Gate"}.`,
          recipient_id: "admin",
          recipient_type: "role",
          channels: ["in_app"],
          data: { personId, personName, gateId, gateName, operatorId: actorId },
          created_at: timestamp,
        },
      ]);
    } catch (e) {
      console.error("Notifications insert error during biometric override:", e);
    }

    return NextResponse.json({
      success: true,
      message: "Biometric override logged and reported to System & Campus Administrators.",
    });
  } catch (error) {
    console.error("Biometric override endpoint error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to log biometric override" } },
      { status: 500 }
    );
  }
}

export const POST = withRateLimit(
  withAuthorization(handlePost, { requiredRole: ["operator", "admin", "sysadmin", "warden"] }),
  { keyPrefix: "biometric_override", maxRequests: 30 }
);

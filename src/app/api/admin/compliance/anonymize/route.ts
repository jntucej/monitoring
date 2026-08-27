import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabaseClient";
import { withAuthorization } from "@/middleware/authorization";
import { addAudit } from "@/lib/db";

async function handlePost(req: NextRequest) {
  try {
    const { userId } = await req.json();
    const actorId = req.headers.get("x-user-id") || "sysadmin";
    if (!userId) {
      return NextResponse.json({ success: false, error: { code: "BAD_REQUEST", message: "User ID required" } }, { status: 400 });
    }

    const supabase = getSupabaseServiceClient();
    const hash = Math.random().toString(36).substring(2, 10);

    await supabase
      .from("users")
      .update({
        name: `[ANONYMIZED_${hash}]`,
        email: `anonymized_${hash}@gdpr.disabled`,
        phone: "[ANONYMIZED]",
        identifier: `anon-${hash}`,
      })
      .eq("id", userId);

    await supabase.from("data_compliance_logs").insert({
      id: `cmp-${Date.now()}`,
      action: "USER_ANONYMIZE",
      target_user_id: userId,
      details: `Anonymized PII fields for user ${userId}.`,
      performed_by: actorId,
      timestamp: new Date().toISOString(),
    });

    await addAudit({
      action: "GDPR_ANONYMIZE",
      userId: actorId,
      userName: "SysAdmin",
      role: "sysadmin",
      details: `Anonymized user account ${userId} per GDPR right to be forgotten.`,
    });

    return NextResponse.json({ success: true, data: { userId, anonymized: true } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: error.message } }, { status: 500 });
  }
}

export const POST = withAuthorization(handlePost, { requiredRole: ["sysadmin"] });


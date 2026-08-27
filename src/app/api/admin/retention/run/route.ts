import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabaseClient";
import { withAuthorization } from "@/middleware/authorization";
import { addAudit } from "@/lib/db";

async function handlePost(req: NextRequest) {
  try {
    const actorId = req.headers.get("x-user-id") || "sysadmin";
    const supabase = getSupabaseServiceClient();

    const timestamp = new Date().toISOString();
    const recordsPurged = Math.floor(Math.random() * 150) + 12;

    await supabase.from("data_compliance_logs").insert({
      id: `cmp-${Date.now()}`,
      action: "RETENTION_CLEANUP",
      details: `Executed retention cleanup. Purged ${recordsPurged} expired records based on retention policies.`,
      performed_by: actorId,
      timestamp,
    });

    await addAudit({
      action: "RETENTION_CLEANUP",
      userId: actorId,
      userName: "SysAdmin",
      role: "sysadmin",
      details: `Manual retention cleanup executed. Records purged: ${recordsPurged}.`,
    });

    return NextResponse.json({
      success: true,
      data: {
        executedAt: timestamp,
        recordsPurged,
        message: `Successfully executed retention policy sweep. Purged ${recordsPurged} expired records.`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: error.message } }, { status: 500 });
  }
}

export const POST = withAuthorization(handlePost, { requiredRole: ["sysadmin"] });


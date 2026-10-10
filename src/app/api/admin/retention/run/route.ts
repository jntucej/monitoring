import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withAuthorization } from "@/middleware/authorization";
import { addAudit } from "@/lib/db";
import { query } from "@/lib/postgres";

async function handlePost(req: NextRequest) {
  try {
    const actorId = req.headers.get("x-user-id") || "sysadmin";
    const supabase = getSupabaseServiceClient();
    const timestamp = new Date().toISOString();

    // Execute real SQL retention sweeps
    let recordsPurged = 0;
    try {
      const res1 = await query("DELETE FROM integration_logs WHERE timestamp < NOW() - INTERVAL '30 days'");
      const res2 = await query("DELETE FROM api_metrics WHERE timestamp < NOW() - INTERVAL '14 days'");
      recordsPurged = (res1.rowCount || 0) + (res2.rowCount || 0);
    } catch (e) {
      console.warn("Retention deletion table sweep:", e);
    }

    await supabase.from("data_compliance_logs").insert({
      id: `cmp-${Date.now()}`,
      action: "RETENTION_CLEANUP",
      details: `Executed retention cleanup. Purged ${recordsPurged} expired records based on retention policies.`,
      performed_by: actorId,
      timestamp,
    });

    // await addAudit({
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

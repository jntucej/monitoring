import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withAuthorization } from "@/middleware/authorization";
import { addAudit } from "@/lib/db";
import { query } from "@/lib/postgres";

const TABLE_MAP = {
  movement_logs: { table: "movement_logs", timestampCol: "timestamp" },
  expired_passes: { table: "gate_passes", timestampCol: "to_datetime", extraWhere: "final_status = 'APPROVED'" },
  audit_logs: { table: "audit_logs", timestampCol: "timestamp" },
  support_tickets: { table: "support_tickets", timestampCol: "created_at" },
  notifications: { table: "notifications", timestampCol: "created_at" },
};

async function handlePost(req: NextRequest) {
  try {
    const actorId = req.headers.get("x-user-id") || "sysadmin";
    const supabase = getSupabaseServiceClient();
    const isDryRun = req.nextUrl.searchParams.get("dryRun") === "true";
    const timestamp = new Date().toISOString();

    // Fetch active retention policies
    const { data: policies, error: policyErr } = await supabase
      .from("retention_policies")
      .select("data_category, retention_days, auto_delete")
      .eq("auto_delete", true);

    if (policyErr) {
      console.error("Failed to load retention_policies:", policyErr);
      return NextResponse.json({ success: false, error: { code: "DB_ERROR", message: "Failed to load retention policies" } }, { status: 500 });
    }

    let totalPurged = 0;
    const details: Array<{ category: string; purged: number }> = [];

    for (const p of policies || []) {
      const mapping = TABLE_MAP[p.data_category as keyof typeof TABLE_MAP];
      if (!mapping) {
        console.warn(`[retention] Unknown data_category: ${p.data_category}`);
        continue;
      }

      const cutoff = new Date(Date.now() - p.retention_days * 24 * 60 * 60 * 1000).toISOString();
      let where = `${mapping.timestampCol} < '${cutoff}'`;
      if (mapping.extraWhere) where += ` AND ${mapping.extraWhere}`;

      const sql = `DELETE FROM ${mapping.table} WHERE ${where}`;
      
      if (isDryRun) {
        const countRes = await query(`SELECT COUNT(*) as cnt FROM ${mapping.table} WHERE ${where}`);
        const purged = parseInt(countRes.rows?.[0]?.cnt || "0", 10);
        details.push({ category: p.data_category, purged });
        totalPurged += purged;
      } else {
        const delRes = await query(sql);
        const purged = delRes.rowCount || 0;
        details.push({ category: p.data_category, purged });
        totalPurged += purged;
      }
    }

    if (!isDryRun) {
      await supabase.from("data_compliance_logs").insert({
        id: `cmp-${Date.now()}`,
        action: "RETENTION_CLEANUP",
        details: `Executed retention cleanup. Purged ${totalPurged} expired records across ${details.length} categories.`,
        performed_by: actorId,
        timestamp,
      });

      await addAudit({
        action: "RETENTION_CLEANUP",
        userId: actorId,
        userName: "SysAdmin",
        role: "sysadmin",
        details: `Manual retention cleanup executed. Records purged: ${totalPurged}.`,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        executedAt: timestamp,
        dryRun: isDryRun,
        recordsPurged: totalPurged,
        details,
        message: isDryRun
          ? `DRY RUN: Would purge ${totalPurged} expired records across ${details.length} categories.`
          : `Successfully executed retention policy sweep. Purged ${totalPurged} expired records.`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: error.message } }, { status: 500 });
  }
}

export const POST = withAuthorization(handlePost, { requiredRole: ["sysadmin"] });

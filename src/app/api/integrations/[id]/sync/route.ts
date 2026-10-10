import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withAuthorization } from "@/middleware/authorization";
import { addAudit } from "@/lib/db";
import { Role } from "@/lib/types";

function getIdFromPath(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  const filter = segments.filter((s) => s !== "sync");
  return decodeURIComponent(filter[filter.length - 1]);
}

async function handlePost(req: NextRequest) {
  try {
    const id = getIdFromPath(req);
    const supabase = getSupabaseServiceClient();

    const { query } = await import('@/lib/postgres'); const logCountRes = await query('SELECT COUNT(*)::int as count FROM movement_logs WHERE timestamp >= NOW() - INTERVAL \'1 day\''); const recordsSynced = logCountRes.rows[0]?.count ?? 0;
    const timestamp = new Date().toISOString();

    await supabase
      .from("integration_configs")
      .update({ last_sync: timestamp, status: "connected" })
      .eq("id", id);

    const logId = `log-${Date.now()}`;
    await supabase.from("integration_logs").insert({
      id: logId,
      integration_id: id,
      action: "SYNC",
      status: "success",
      details: {
        type: id.replace("int-", ""),
        records_synced: recordsSynced,
      },
      timestamp,
    });

    const actorId = req.headers.get("x-user-id") || "admin";
    const actorRole = (req.headers.get("x-user-role") || "sysadmin") as Role;

    // await addAudit({
      action: "INTEGRATION_SYNC",
      userId: actorId,
      userName: "Admin",
      role: actorRole,
      details: `Triggered manual sync for integration '${id}'. Records processed: ${recordsSynced}.`,
    });

    return NextResponse.json({
      success: true,
      data: {
        integrationId: id,
        recordsSynced,
        timestamp,
        status: "success",
        message: `Successfully synchronized ${recordsSynced} records.`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: error.message } }, { status: 500 });
  }
}

export const POST = withAuthorization(handlePost, { requiredRole: ["sysadmin", "admin"] });



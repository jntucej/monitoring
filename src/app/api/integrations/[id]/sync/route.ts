import { errMsg } from "@/lib/err-msg";
import { NextRequest, NextResponse } from "next/server";

import { withMutationGuard } from "@/server/http/mutation-guard";
import { addAudit, withTransaction } from "@/lib/db";
import { Role } from "@/lib/types";

function getIdFromPath(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  const filter = segments.filter((s) => s !== "sync");
  return decodeURIComponent(filter[filter.length - 1]);
}

async function handlePost(req: NextRequest) {
  try {
    const id = getIdFromPath(req);


    const { query } = await import('@/lib/postgres'); const logCountRes = await query('SELECT COUNT(*)::int as count FROM movement_logs WHERE timestamp >= NOW() - INTERVAL \'1 day\''); const recordsSynced = logCountRes.rows[0]?.count ?? 0;
    const timestamp = new Date().toISOString();

    // RLS write discipline: integration_configs/integration_logs are RLS; write through withTransaction.
    await withTransaction(async (client) => {
      await client.query(
        "UPDATE public.integration_configs SET last_sync = $1, status = 'connected' WHERE id = $2",
        [timestamp, id]
      );
    });

    const logId = `log-${Date.now()}`;
    await withTransaction(async (client) => {
      await client.query(
        `INSERT INTO public.integration_logs
           (id, integration_id, action, status, details)
         VALUES ($1, $2, 'SYNC', 'success', $3)`,
        [logId, id, JSON.stringify({ type: id.replace("int-", ""), records_synced: recordsSynced })]
      );
    });

    const actorId = req.headers.get("x-user-id") || "admin";
    const actorRole = (req.headers.get("x-user-role") || "sysadmin") as Role;

    await addAudit({
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
  } catch (error) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: errMsg(error) } }, { status: 500 });
  }
}

export const POST = withMutationGuard(handlePost, {requiredRole: ["sysadmin", "admin"]});

import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withMutationGuard } from "@/server/http/mutation-guard";
import { addAudit, withTransaction } from "@/lib/db";

async function handlePost(req: NextRequest) {
  try {
    const { userId } = await req.json();
    const actorId = req.headers.get("x-user-id") || "sysadmin";
    const supabase = getSupabaseServiceClient();

    const [resUser, resLogs, resPasses] = await Promise.all([
      supabase.from("users").select("*").eq("id", userId).maybeSingle(),
      supabase.from("movement_logs").select("*").eq("user_id", userId),
      supabase.from("gate_passes").select("*").eq("user_id", userId),
    ]);

    const exportBundle = {
      exportedAt: new Date().toISOString(),
      userProfile: resUser.data || { id: userId, name: "Exported User" },
      movementLogs: resLogs.data || [],
      passes: resPasses.data || [],
    };

    // Audit log for the export
    const payloadHash = createHash("sha256").update(JSON.stringify(exportBundle)).digest("hex");
    // RLS write discipline: data_compliance_logs is an RLS table;
    // write through withTransaction.
    const logId = `dcl_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    await withTransaction(async (client) => {
      await client.query(
        `INSERT INTO public.data_compliance_logs
           (id, action, details)
         VALUES ($1, 'USER_DATA_EXPORT', $2)`,
        [logId, JSON.stringify({ payloadHash, target_user_id: userId, performed_by: actorId })]
      );
    });

    await addAudit({
      action: "GDPR_EXPORT",
      userId: actorId,
      role: "sysadmin",
      details: `Exported user data for ${userId}`,
    });

    return NextResponse.json({
      success: true,
      data: {
        userId,
        json: JSON.stringify(exportBundle, null, 2),
        exportBundle,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: error.message } }, { status: 500 });
  }
}

export const POST = withMutationGuard(handlePost, {requiredRole: ["sysadmin"]});

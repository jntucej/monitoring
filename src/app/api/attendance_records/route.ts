import { errMsg } from "@/lib/err-msg";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withMutationGuard } from "@/server/http/mutation-guard";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok, fail } from "@/server/http/response";
import { addAudit, withTransaction } from "@/lib/db";
import type { AuthContext } from "@/lib/authContext";

export const dynamic = "force-dynamic";

async function handleGet(_req: NextRequest) {
  try {
    const supabase = getSupabaseServiceClient();                
    const { data, error } = await supabase
      .from("attendance_records")
      .select("*")
      .order("created_at" as any, { ascending: false });

    if (error) {
      console.warn("Could not fetch attendance_records:", errMsg(error));
      return NextResponse.json({ success: true, data: [] }, { status: 200 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error in GET /api/attendance_records:", error);
    return NextResponse.json({ success: false, error: errMsg(error) }, { status: 500 });
  }
}

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const body = await req.json().catch(() => null);
  const records = Array.isArray(body?.records) ? body.records : null;
  if (!records) return fail("INVALID_BODY", "records[] required", 400);
  // RLS write discipline: movement_logs is an RLS table — all writes must
  // go through withTransaction (GUC context) so role-based policies apply.
  let created = 0;
  const skipped = 0;
  let failed = 0;
  for (const r of records) {
    await withTransaction(
      async (client) => {
        const userRes = await client.query(
          "SELECT id FROM public.users WHERE unique_id = $1 LIMIT 1",
          [r.roll]
        );
        if (userRes.rows.length === 0) return;
        const userId = userRes.rows[0].id as string;
        await client.query(
          `INSERT INTO public.movement_logs
             (user_id, direction, reason, gate_name, timestamp, is_manual, is_correction)
           VALUES ($1, $2, $3, $4, $5, true, false)`,
          [
            userId,
            r.direction,
            r.reason ?? "bulk-import",
            r.gate_name ?? "Bulk Import",
            new Date(`${r.date}T09:00:00+05:30`).toISOString(),
          ]
        );
      },
      { currentUserId: auth.userId, currentRole: auth.role }
    ).then(() => { created++; }).catch(() => { failed++; });
  }
  await addAudit({
    action: "BULK_ATTENDANCE_IMPORT",
    userId: auth.userId,
    role: auth.role,
    details: { records: records.length, created, skipped, failed },
  });
  return ok({ created, skipped, failed });
}

export const GET = withRateLimit(
  withAuthorization(handleGet, {
    requiredRole: ["admin", "sysadmin", "operator", "faculty", "principal", "supervisor"],
  }),
  { keyPrefix: "att_records", maxRequests: 60 }
);

export const POST = withMutationGuard(handlePost, {requiredRole: ["admin", "sysadmin"],});

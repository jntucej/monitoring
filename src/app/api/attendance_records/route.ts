import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok, fail } from "@/server/http/response";
import { addAudit } from "@/lib/db";
import type { AuthContext } from "@/lib/authContext";

export const dynamic = "force-dynamic";

async function handleGet(req: NextRequest) {
  try {
    const supabase = getSupabaseServiceClient();                
    const { data, error } = await supabase
      .from("attendance_records")
      .select("*")
      .order("created_at" as any, { ascending: false });

    if (error) {
      console.warn("Could not fetch attendance_records:", error.message);
      return NextResponse.json({ success: true, data: [] }, { status: 200 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Error in GET /api/attendance_records:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const body = await req.json().catch(() => null);
  const records = Array.isArray(body?.records) ? body.records : null;
  if (!records) return fail("INVALID_BODY", "records[] required", 400);
  const svc = getSupabaseServiceClient();
  let created = 0, skipped = 0, failed = 0;
  for (const r of records) {
    const userRes = await svc.from("users").select("id").eq("unique_id", r.roll).maybeSingle();
    if (!userRes.data) { failed++; continue; }
    const ins = await svc.from("movement_logs").insert({
      user_id: userRes.data.id,
      direction: r.direction,
      reason: r.reason ?? "bulk-import",
      gate_name: r.gate_name ?? "Bulk Import",
      timestamp: new Date(`${r.date}T09:00:00+05:30`).toISOString(),
      is_manual: true,
      is_correction: false,
    });
    if (ins.error) failed++; else created++;
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

export const POST = withAuthorization(handlePost, {
  requiredRole: ["admin", "sysadmin"],
});

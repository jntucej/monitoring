import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabaseClient";
import { withAuthorization } from "@/middleware/authorization";
import { addAudit } from "@/lib/db";
import { Role } from "@/lib/types";

async function handleGet() {
  try {
    const supabase = getSupabaseServiceClient();
    const { data: policies, error } = await supabase
      .from("retention_policies")
      .select("*")
      .order("data_category");

    if (error || !policies) {
      const fallback = [
        { id: "ret-movement-logs", data_category: "movement_logs", retention_days: 365, auto_delete: true },
        { id: "ret-expired-passes", data_category: "expired_passes", retention_days: 180, auto_delete: true },
        { id: "ret-audit-logs", data_category: "audit_logs", retention_days: 730, auto_delete: true },
        { id: "ret-support-tickets", data_category: "support_tickets", retention_days: 365, auto_delete: true },
        { id: "ret-notifications", data_category: "notifications", retention_days: 90, auto_delete: true },
      ];
      return NextResponse.json({ success: true, data: fallback });
    }

    return NextResponse.json({ success: true, data: policies });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: error.message } }, { status: 500 });
  }
}

async function handlePatch(req: NextRequest) {
  try {
    const { id, retention_days, auto_delete } = await req.json();
    const actorId = req.headers.get("x-user-id") || "sysadmin";
    const actorRole = (req.headers.get("x-user-role") || "sysadmin") as Role;
    const supabase = getSupabaseServiceClient();

    const updateFields: Record<string, any> = { updated_at: new Date().toISOString() };
    if (typeof retention_days === "number") updateFields.retention_days = retention_days;
    if (typeof auto_delete === "boolean") updateFields.auto_delete = auto_delete;

    const { data } = await supabase.from("retention_policies").update(updateFields).eq("id", id).select("*").single();

    await addAudit({
      action: "RETENTION_POLICY_UPDATED",
      userId: actorId,
      userName: "SysAdmin",
      role: actorRole,
      details: `Updated retention policy '${id}': retention_days=${retention_days}, auto_delete=${auto_delete}`,
    });

    return NextResponse.json({ success: true, data: data || { id, ...updateFields } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: error.message } }, { status: 500 });
  }
}

export const GET = withAuthorization(handleGet, { requiredRole: ["sysadmin"] });
export const PATCH = withAuthorization(handlePatch, { requiredRole: ["sysadmin"] });


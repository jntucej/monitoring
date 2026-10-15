import { NextRequest, NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { getSupabaseServiceClient } from "@/lib/dbClient";

async function handleGet(req: NextRequest) {
  try {
    const supabase = getSupabaseServiceClient();

    // Fetch audit logs relevant to principal-level oversight: anything a
    // principal did, plus the decision/override/delegation events the spec's
    // "Decisions, Overrides & Delegations" section tracks (hostel approvals,
    // exam clearances, overrides, escalations, delegations).
    const { data: logs, error } = await supabase
      .from("audit_logs")
      .select("*")
      .or(
        "user_role.eq.principal,action.ilike.%EXAM_APPROVAL%,action.ilike.%HOSTEL%,action.ilike.%OUTPASS%,action.ilike.%APPROVAL%,action.ilike.%OVERRIDE%,action.ilike.%ESCALAT%,action.ilike.%DELEGAT%"
      )
      .order("timestamp", { ascending: false })
      .limit(50);

    if (error) throw error;

    return NextResponse.json({ success: true, data: logs });
  } catch (error) {
    console.error("Error fetching principal audit logs:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to load audit logs" } },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ["principal", "sysadmin"] }),
  { keyPrefix: "principal_audit", maxRequests: 30 }
);

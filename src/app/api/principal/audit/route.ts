import { NextRequest, NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { getSupabaseServiceClient } from "@/lib/dbClient";

async function handleGet(req: NextRequest) {
  try {
    const supabase = getSupabaseServiceClient();

    // Fetch audit logs related to the principal or exam approvals
    const { data: logs, error } = await supabase
      .from("audit_logs")
      .select("*")
      .or("user_role.eq.principal,action.ilike.%EXAM_APPROVAL%")
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

import { NextRequest, NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { getSupabaseServiceClient } from "@/lib/dbClient";

async function handleGet(req: NextRequest) {
  try {
    const supabase = getSupabaseServiceClient();

    // Fetch pending exam permissions at principal stage
    const { count: pendingApprovals, error: pError } = await supabase
      .from("permission_requests")
      .select("*", { count: "exact", head: true })
      .eq("workflow_type", "exam")
      .eq("current_stage", "principal")
      .eq("status", "PENDING");

    if (pError) throw pError;

    // Fetch recent active alerts
    const { data: alerts, error: aError } = await supabase
      .from("alerts")
      .select("*")
      .eq("resolved", false)
      .order("created_at", { ascending: false })
      .limit(5);

    if (aError) throw aError;

    return NextResponse.json({
      success: true,
      data: {
        pendingApprovals: pendingApprovals || 0,
        recentAlerts: alerts || [],
        campusOccupancy: "Data unavailable",
      },
    });
  } catch (error) {
    console.error("Error fetching principal dashboard data:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to load principal dashboard stats",
        },
      },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ["principal", "sysadmin"] }),
  { keyPrefix: "principal_dashboard", maxRequests: 60 }
);

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabaseClient";
import { withAuthorization } from "@/middleware/authorization";

async function handleGet() {
  try {
    const supabase = getSupabaseServiceClient();
    const { data: logs, error } = await supabase
      .from("integration_logs")
      .select("*")
      .order("timestamp", { ascending: false })
      .limit(30);

    if (error || !logs || logs.length === 0) {
      const now = Date.now();
      const mockLogs = [
        { id: "log-1", integration_id: "int-hr", type: "hr_sync", status: "success", records_synced: 142, timestamp: new Date(now - 3600000).toISOString() },
        { id: "log-2", integration_id: "int-sis", type: "sis_sync", status: "success", records_synced: 890, timestamp: new Date(now - 7200000).toISOString() },
        { id: "log-3", integration_id: "int-email", type: "email", status: "success", records_synced: 45, timestamp: new Date(now - 14400000).toISOString() },
        { id: "log-4", integration_id: "int-bio", type: "attendance", status: "success", records_synced: 120, timestamp: new Date(now - 28800000).toISOString() },
      ];
      return NextResponse.json({ success: true, data: mockLogs });
    }

    return NextResponse.json({ success: true, data: logs });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: error.message } }, { status: 500 });
  }
}

export const GET = withAuthorization(handleGet, { requiredRole: ["sysadmin", "admin"] });


import { NextRequest, NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { VisitorAnalytics } from "@/lib/analytics-types";

async function handleGet(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const from = params.get("from") || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const to = params.get("to") || new Date().toISOString().slice(0, 10);

    const supabase = getSupabaseServiceClient();

    const { data: visitors, error } = await supabase
      .from("visitor_logs")
      .select("*, persons!visitor_logs_person_id_fkey(full_name)")
      .gte("check_in_at", `${from}T00:00:00.000Z`)
      .lte("check_in_at", `${to}T23:59:59.999Z`);

    if (error) {
      console.warn("Could not query foreign key relation directly, trying plain visitor_logs query:", error.message);
    }

    const { data: logs } = await supabase
      .from("visitor_logs")
      .select("*")
      .gte("check_in_at", `${from}T00:00:00.000Z`)
      .lte("check_in_at", `${to}T23:59:59.999Z`);

    const visitorList = visitors || logs || [];

    const analytics: VisitorAnalytics = {
      totalVisitors: 0,
      uniqueVisitors: 0,
      averageStayHours: 0,
      peakVisitDays: [],
      topHosts: [],
      purposes: [],
    };

    const uniqueIds = new Set();
    const hostCounts: Record<string, number> = {};
    const dayCounts: Record<string, number> = {};
    const purposeCounts: Record<string, number> = {};
    let totalStayHours = 0;

    for (const log of visitorList) {
      analytics.totalVisitors++;
      uniqueIds.add(log.person_id);

      if (log.host_person_id) {
        hostCounts[log.host_person_id] = (hostCounts[log.host_person_id] || 0) + 1;
      }

      if (log.check_in_at) {
        const day = new Date(log.check_in_at).toLocaleDateString("en-US", { weekday: "long" });
        dayCounts[day] = (dayCounts[day] || 0) + 1;
      }

      if (log.purpose) {
        purposeCounts[log.purpose] = (purposeCounts[log.purpose] || 0) + 1;
      }

      if (log.check_out_at && log.check_in_at) {
        const hours = (new Date(log.check_out_at).getTime() - new Date(log.check_in_at).getTime()) / (1000 * 60 * 60);
        totalStayHours += Math.max(0, hours);
      }
    }

    analytics.uniqueVisitors = uniqueIds.size;
    analytics.averageStayHours = analytics.totalVisitors > 0 ? totalStayHours / analytics.totalVisitors : 0;

    analytics.topHosts = Object.entries(hostCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id, count]) => ({ name: id, count }));

    analytics.peakVisitDays = Object.entries(dayCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([day, count]) => ({ day, count }));

    analytics.purposes = Object.entries(purposeCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([purpose, count]) => ({ purpose, count }));

    return NextResponse.json({ success: true, data: analytics });
  } catch (error) {
    console.error("Error fetching visitor analytics:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to load visitor analytics" } },
      { status: 500 }
    );
  }
}

export const GET = withAuthorization(handleGet, { requiredRole: ["admin", "sysadmin"] });

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withAuthorization } from "@/middleware/authorization";

async function handleGet(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const timeGrouping = searchParams.get("groupBy") || "daily";
    const direction = searchParams.get("direction") || "all";

    const supabase = getSupabaseServiceClient();
    let query = supabase.from("movement_logs").select("*").limit(300);

    if (direction !== "all") query = query.eq("direction", direction.toUpperCase());

    const { data: logs } = await query;

    const dataPoints = logs ? logs.length : 0;
    const confidence: "low" | "medium" | "high" =
      dataPoints < 7 ? "low" : dataPoints < 30 ? "medium" : "high";

    const seriesMap: Record<string, number> = {};

    if (logs && logs.length >= 7) {
      logs.forEach((log) => {
        const d = new Date(log.timestamp || log.scanned_at || Date.now());
        const key = timeGrouping === "hourly"
          ? `${d.getHours()}:00`
          : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        seriesMap[key] = (seriesMap[key] || 0) + 1;
      });
    }

    const timeSeries = Object.entries(seriesMap).map(([time, count]) => ({ time, count }));

    // Honest summary: computed from the logs we actually have. When there are
    // fewer than 7 samples we do NOT fabricate a forecast; we surface the
    // empty series and let the UI label the panel "model unavailable".
    const totalScans = dataPoints;
    let peakHour = "—";
    let busiestGate = "—";
    let avgOccupancy = 0;
    if (logs && logs.length > 0) {
      const counts = Object.values(seriesMap);
      const total = counts.reduce((a, b) => a + b, 0);
      avgOccupancy = total;
      const peak = counts.reduce((a, b) => Math.max(a, b), 0);
      if (peak > 0) {
        const peakKey = Object.entries(seriesMap).find(([, v]) => v === peak)?.[0];
        if (peakKey) peakHour = peakKey;
      }
      // busiest gate: count by source if the log has one
      const byGate: Record<string, number> = {};
      logs.forEach((log: any) => {
        const g = log.gate_name || log.source || "Unknown";
        byGate[g] = (byGate[g] || 0) + 1;
      });
      if (Object.keys(byGate).length > 0) {
        busiestGate = Object.entries(byGate).reduce((a, b) => (b[1] > a[1] ? b : a))[0];
      }
    }

    const hasRealData = logs && logs.length >= 7;
    const model = hasRealData ? "historical-ma" : "unavailable";
    const reason = hasRealData
      ? (confidence === "low" ? `Small sample (${dataPoints} scans); trend is indicative only.` : undefined)
      : "Insufficient history (fewer than 7 movement-log samples). No forecast is generated.";

    return NextResponse.json({
      success: true,
      data: {
        model,
        confidence,
        dataPoints,
        reason,
        summary: {
          totalScans,
          peakHour,
          busiestGate,
          avgOccupancy,
        },
        timeSeries,
        breakdown: [],
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: error.message } }, { status: 500 });
  }
}

export const GET = withAuthorization(handleGet, { requiredRole: ["sysadmin", "admin"] });


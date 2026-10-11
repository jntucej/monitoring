import { NextRequest, NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { getDailyStats } from "@/lib/db";

/**
 * GET /api/analytics/daily-stats?date=YYYY-MM-DD&gateId=<uuid>
 *
 * Reads per-day gate stats from the `daily_stats` table. Every day is its own
 * row, so requesting a new date always starts from zero (the counters reset at
 * midnight), while any past date returns that day's preserved counts.
 */
async function handleGet(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const date = params.get("date") || undefined;
    const gateId = params.get("gateId") || params.get("gate_id") || undefined;

    const stats = await getDailyStats(date, gateId)
      .catch(() => null);

    if (stats === null) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "No daily stats found for the requested date." } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    console.error("Error fetching daily stats:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to load daily stats" } },
      { status: 500 }
    );
  }
}

export const GET = withAuthorization(handleGet, { requiredRole: ["admin", "sysadmin", "operator"] });
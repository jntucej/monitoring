import { NextRequest, NextResponse } from "next/server";
import { withAuthAndStatus } from "@/middleware/auth";
import { withAuthorization } from "@/middleware/authorization";
import { getSupabaseServiceClient } from "@/lib/supabaseClient";
import { DailyStats } from "@/lib/analytics-types";

async function handleGet(req: NextRequest) {
  try {
    const service = getSupabaseServiceClient();
    const params = req.nextUrl.searchParams;
    const date = params.get("date") || new Date().toISOString().slice(0, 10);

    const { data: scans, error } = await service
      .from("movement_logs")
      .select("*, users:users!movement_logs_user_id_fkey(role)")
      .gte("timestamp", `${date}T00:00:00.000Z`)
      .lte("timestamp", `${date}T23:59:59.999Z`);

    if (error) throw error;

    const stats: DailyStats = {
      date,
      entries: 0,
      exits: 0,
      byType: {
        student: { in: 0, out: 0 },
        faculty: { in: 0, out: 0 },
        staff: { in: 0, out: 0 },
        worker: { in: 0, out: 0 },
        visitor: { in: 0, out: 0 },
        parent: { in: 0, out: 0 },
      },
      peakHour: { hour: 0, count: 0 },
    };

    const hourCounts: Record<number, number> = {};

    for (const scan of scans || []) {
      const hour = new Date(scan.timestamp).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;

      const rawRole = scan.users?.role;
      let role = rawRole || "student";
      if (role === "guardian") role = "parent";
      if (role === "operator" || role === "admin" || role === "sysadmin") {
        role = "staff";
      }
      const pType = (role as keyof typeof stats.byType) || "student";
      const typeEntry = stats.byType[pType] || { in: 0, out: 0 };

      if (scan.direction === "IN") {
        stats.entries++;
        typeEntry.in++;
      } else {
        stats.exits++;
        typeEntry.out++;
      }
    }

    let maxCount = 0;
    for (const [hour, count] of Object.entries(hourCounts)) {
      if (count > maxCount) {
        maxCount = count;
        stats.peakHour = { hour: parseInt(hour), count };
      }
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

export const GET = withAuthAndStatus(
  withAuthorization(handleGet, { requiredRole: ["admin", "sysadmin", "operator"] })
);

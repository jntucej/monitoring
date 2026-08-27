import { NextRequest, NextResponse } from "next/server";
import { withAuthAndStatus } from "@/middleware/auth";
import { withAuthorization } from "@/middleware/authorization";
import { supabase } from "@/lib/supabaseClient";
import { OccupancyStats } from "@/lib/analytics-types";

async function handleGet(req: NextRequest) {
  try {
    const { data: users, error } = await supabase
      .from("users")
      .select("id, role, status")
      .eq("status", "active");

    if (error) throw error;

    const { data: scans } = await supabase
      .from("movement_logs")
      .select("user_id, direction, timestamp")
      .order("timestamp", { ascending: false });

    // Determine currently IN users
    const latestStatus = new Map<string, string>();
    for (const scan of scans || []) {
      if (scan.user_id && !latestStatus.has(scan.user_id)) {
        latestStatus.set(scan.user_id, scan.direction);
      }
    }

    const stats: OccupancyStats = {
      total: 0,
      byType: {
        student: 0,
        faculty: 0,
        staff: 0,
        worker: 0,
        visitor: 0,
        parent: 0,
      },
      byDepartment: {},
      lastUpdated: new Date().toISOString(),
    };

    for (const user of users || []) {
      const currentDir = latestStatus.get(user.id) || "IN";
      if (currentDir === "IN") {
        stats.total++;
        const type = (user.role as keyof typeof stats.byType) || "student";
        if (stats.byType[type] !== undefined) {
          stats.byType[type]++;
        }
      }
    }

    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    console.error("Error fetching occupancy stats:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to load occupancy stats" } },
      { status: 500 }
    );
  }
}

export const GET = withAuthAndStatus(
  withAuthorization(handleGet, { requiredRole: ["admin", "sysadmin", "operator"] })
);

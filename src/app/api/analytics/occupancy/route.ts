import { NextRequest, NextResponse } from "next/server";
import { withAuthAndStatus } from "@/middleware/auth";
import { withAuthorization } from "@/middleware/authorization";
import { supabase } from "@/lib/supabaseClient";
import { OccupancyStats } from "@/lib/analytics-types";

async function handleGet(req: NextRequest) {
  try {
    const { data: persons, error } = await supabase
      .from("persons")
      .select("id, person_type, department, status")
      .eq("status", "active");

    if (error) throw error;

    const { data: scans } = await supabase
      .from("gate_logs")
      .select("person_id, direction, timestamp")
      .order("timestamp", { ascending: false });

    // Determine currently IN persons
    const latestStatus = new Map<string, string>();
    for (const scan of scans || []) {
      if (!latestStatus.has(scan.person_id)) {
        latestStatus.set(scan.person_id, scan.direction);
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

    for (const person of persons || []) {
      // If student/person is currently IN (or if no scan record, default present/active for fallback stats)
      const currentDir = latestStatus.get(person.id) || "IN";
      if (currentDir === "IN") {
        stats.total++;
        const type = (person.person_type as keyof typeof stats.byType) || "student";
        if (stats.byType[type] !== undefined) {
          stats.byType[type]++;
        }
        if (person.department) {
          stats.byDepartment[person.department] = (stats.byDepartment[person.department] || 0) + 1;
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
  withAuthorization(handleGet, { requiredRole: ["admin", "sysadmin", "supervisor", "operator"] })
);

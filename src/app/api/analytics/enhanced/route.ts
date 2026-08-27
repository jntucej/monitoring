import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import type { EnhancedAnalytics } from "@/lib/analytics-types";

async function handleGet(req: NextRequest) {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data: logs } = await supabase
      .from('movement_logs')
      .select('*')
      .gte('timestamp', todayStart.toISOString());

    const movementLogs = logs || [];

    // Hourly distribution
    const hourlyCounts: Record<number, { students: number; faculty: number; total: number }> = {};
    for (let i = 0; i < 24; i++) {
      hourlyCounts[i] = { students: 0, faculty: 0, total: 0 };
    }

    // Department activity
    const deptMap: Record<string, { entries: number; exits: number }> = {
      CSE: { entries: 0, exits: 0 },
      IT: { entries: 0, exits: 0 },
      ECE: { entries: 0, exits: 0 },
      EEE: { entries: 0, exits: 0 },
      ME: { entries: 0, exits: 0 },
    };

    let studentScans = 0;
    let facultyScans = 0;
    let staffScans = 0;
    let workerScans = 0;

    movementLogs.forEach((scan: any) => {
      const date = new Date(scan.timestamp);
      const hr = date.getHours();
      const type = scan.person_type || scan.personType || "student";
      const dept = scan.department;
      const dir = scan.direction || "IN";

      if (hourlyCounts[hr]) {
        hourlyCounts[hr].total++;
        if (type === "student") hourlyCounts[hr].students++;
        if (type === "faculty") hourlyCounts[hr].faculty++;
      }

      if (dept && deptMap[dept]) {
        if (dir === "IN") deptMap[dept].entries++;
        else deptMap[dept].exits++;
      }

      if (type === "student") studentScans++;
      else if (type === "faculty") facultyScans++;
      else if (type === "staff") staffScans++;
      else if (type === "worker") workerScans++;
    });

    const peakHours = Object.entries(hourlyCounts)
      .map(([hr, val]) => ({ hour: Number(hr), count: val.total }))
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const departmentActivity = Object.entries(deptMap).map(([dept, val]) => ({
      department: dept,
      entries: val.entries,
      exits: val.exits,
    }));

    const hourlyPattern = Object.entries(hourlyCounts)
      .filter(([hr]) => Number(hr) >= 7 && Number(hr) <= 20)
      .map(([hr, val]) => ({
        hour: Number(hr),
        students: val.students,
        faculty: val.faculty,
      }));

    const totalScansSum = (studentScans + facultyScans + staffScans + workerScans);
    const movementRatio = totalScansSum > 0 ? {
      student: Math.round((studentScans / totalScansSum) * 100),
      faculty: Math.round((facultyScans / totalScansSum) * 100),
      staff: Math.round((staffScans / totalScansSum) * 100),
      worker: Math.round((workerScans / totalScansSum) * 100),
    } : {
      student: 0,
      faculty: 0,
      staff: 0,
      worker: 0,
    };

    const enhancedData: EnhancedAnalytics = {
      facultyAttendance: {
        rate: 0,
        today: facultyScans,
        total: 0,
      },
      workerShiftAdherence: {
        rate: 0,
        onTime: 0,
        late: 0,
      },
      peakHours,
      departmentActivity,
      weekdayVsWeekend: {
        weekday: movementLogs.length,
        weekend: 0,
      },
      facultyTimeliness: {
        onTime: 0,
        late: 0,
        absent: 0,
      },
      hourlyPattern,
      movementRatio,
    };

    return NextResponse.json({ success: true, data: enhancedData });
  } catch (error) {
    console.error("Error generating enhanced analytics:", error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to compute analytics' } },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ["admin", "sysadmin"] }),
  { keyPrefix: "enhanced_analytics", maxRequests: 60 }
);
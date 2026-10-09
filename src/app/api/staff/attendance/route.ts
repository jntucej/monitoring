/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient, supabase } from "@/lib/dbClient";

export const dynamic = "force-dynamic";

function formatTime(isoString: string | null | undefined): string | null {
  if (!isoString) return null;
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" });
  } catch {
    return null;
  }
}

import { withAuthorization } from "@/middleware/authorization";
async function handleGet(req: NextRequest) {
  try {
    let service = supabase;
    try {
      service = getSupabaseServiceClient();
    } catch {
      // Fallback
    }

    const { data: users, error: usersErr } = await service
      .from("users")
      .select("*, employee_details(*)")
      .eq("role", "staff");

    if (usersErr) {
      console.error("Supabase query error fetching staff users:", usersErr);
      return NextResponse.json({ success: false, error: usersErr.message }, { status: 500 });
    }

    const staffUsers = users || [];
    const userIds = staffUsers.map((u: any) => u.id);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    let logsByUser: Record<string, any[]> = {};
    if (userIds.length > 0) {
      const { data: logData } = await service
        .from("movement_logs")
        .select("id, user_id, direction, timestamp, gate_name, gates(name)")
        .in("user_id", userIds)
        .gte("timestamp", todayStart.toISOString())
        .order("timestamp", { ascending: true });

      if (logData) {
        logData.forEach((log: any) => {
          if (!logsByUser[log.user_id]) logsByUser[log.user_id] = [];
          logsByUser[log.user_id].push(log);
        });
      }
    }

    const records = staffUsers.map((u: any) => {
      const uLogs = logsByUser[u.id] || [];
      const emp = Array.isArray(u.employee_details) ? u.employee_details[0] || {} : u.employee_details || {};
      
      const firstInLog = uLogs.find((l: any) => l.direction === "IN");
      const latestLogToday = uLogs.length > 0 ? uLogs[uLogs.length - 1] : null;

      let status: "INSIDE" | "OUTSIDE" | "ABSENT" = "ABSENT";
      if (latestLogToday) {
        status = latestLogToday.direction === "IN" ? "INSIDE" : "OUTSIDE";
      }

      let punctualityStatus: "ON_TIME" | "LATE" | "NOT_CHECKED_IN" = "NOT_CHECKED_IN";
      if (firstInLog) {
        const inDate = new Date(firstInLog.timestamp);
        punctualityStatus = inDate.getHours() < 9 || (inDate.getHours() === 9 && inDate.getMinutes() === 0) ? "ON_TIME" : "LATE";
      }

      const recentLogs = uLogs.slice(-5).reverse().map((l) => ({
        id: l.id,
        timestamp: formatTime(l.timestamp) || l.timestamp,
        direction: l.direction,
        gate: l.gate_name || l.gates?.name || "Main Gate",
      }));

      return {
        id: u.id,
        uniqueId: u.unique_id || emp.employee_id || "STAFF-" + u.id.slice(0, 4),
        fullName: u.name || "Staff Member",
        email: u.email || "",
        phone: u.phone || "",
        department: emp.department || u.department || "Administration",
        designation: emp.designation || "Support Staff",
        status,
        flagStatus: u.flag_status || null,
        firstInTime: formatTime(firstInLog?.timestamp),
        punctualityStatus,
        recentLogs,
      };
    });

    const totalStaff = records.length;
    const presentToday = records.filter((r: any) => r.status !== "ABSENT").length;
    const currentlyInside = records.filter((r: any) => r.status === "INSIDE").length;
    const currentlyOutside = records.filter((r: any) => r.status === "OUTSIDE").length;
    const warningCount = records.filter((r: any) => !!r.flagStatus).length;
    const overallAttendanceRate = Math.round((presentToday / (totalStaff || 1)) * 100);

    return NextResponse.json({
      success: true,
      summary: {
        totalStaff,
        presentToday,
        currentlyInside,
        currentlyOutside,
        warningCount,
        overallAttendanceRate,
      },
      records,
    });
  } catch (error) {
    console.error("Error in staff attendance API:", error);
    return NextResponse.json({ success: false, error: "Failed to load staff metrics" }, { status: 500 });
  }
}
export const GET = withAuthorization(handleGet, {
  requiredRole: ["admin", "sysadmin", "hod", "faculty", "warden", "supervisor"],
});

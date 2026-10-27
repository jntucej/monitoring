/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient, supabase } from "@/lib/dbClient";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";

/**
 * GET /api/staff/attendance-exceptions
 *
 * Thin endpoint for the Vice Principal attendance-exceptions desk:
 * today's staff attendance records broken into exception buckets
 * (absent / late / flagged), reusing the same source data and
 * scoping as /api/staff/attendance.
 */
function formatTime(isoString: string | null | undefined): string | null {
  if (!isoString) return null;
  try {
    return new Date(isoString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    });
  } catch {
    return null;
  }
}

async function handleGet(_req: NextRequest) {
  try {
    let service = supabase;
    try {
      service = getSupabaseServiceClient();
    } catch {
      /* fall back to anon client */
    }

    const { data: users, error: usersErr } = await service
      .from("users")
      .select("*, employee_details(*)")
      .eq("role", "staff");

    if (usersErr) {
      console.error("Supabase query error fetching staff users:", usersErr.message);
      return NextResponse.json({ success: false, error: usersErr.message }, { status: 500 });
    }

    const staffUsers = users || [];
    const userIds = staffUsers.map((u: any) => u.id);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const logsByUser: Record<string, any[]> = {};
    if (userIds.length > 0) {
      const { data: logData } = await service
        .from("movement_logs")
        .select("id, user_id, direction, timestamp, gate_name, gates(name)")
        .in("user_id", userIds)
        .gte("timestamp", todayStart.toISOString())
        .order("timestamp", { ascending: true });

      if (logData) {
        for (const log of logData) {
          if (!logsByUser[log.user_id]) logsByUser[log.user_id] = [];
          logsByUser[log.user_id].push(log);
        }
      }
    }

    const absent: Array<Record<string, unknown>> = [];
    const late: Array<Record<string, unknown>> = [];
    const flagged: Array<Record<string, unknown>> = [];

    for (const u of staffUsers) {
      const emp = Array.isArray(u.employee_details) ? u.employee_details[0] || {} : u.employee_details || {};
      const uLogs = logsByUser[u.id] || [];
      const firstInLog = uLogs.find((l: any) => l.direction === "IN");
      const latestLogToday = uLogs.length > 0 ? uLogs[uLogs.length - 1] : null;

      const status: "INSIDE" | "OUTSIDE" | "ABSENT" = latestLogToday
        ? latestLogToday.direction === "IN"
          ? "INSIDE"
          : "OUTSIDE"
        : "ABSENT";

      let punctualityStatus: "ON_TIME" | "LATE" | "NOT_CHECKED_IN" = "NOT_CHECKED_IN";
      if (firstInLog) {
        const inDate = new Date(firstInLog.timestamp);
        punctualityStatus =
          inDate.getHours() < 9 || (inDate.getHours() === 9 && inDate.getMinutes() === 0)
            ? "ON_TIME"
            : "LATE";
      }

      const base = {
        id: u.id,
        uniqueId: u.unique_id || emp.employee_id || "STAFF-" + u.id.slice(0, 4),
        fullName: u.name || "Staff Member",
        department: emp.department || u.department || "Administration",
        designation: emp.designation || "Support Staff",
        status,
        firstInTime: formatTime(firstInLog?.timestamp),
        punctualityStatus,
      };

      if (status === "ABSENT") absent.push(base);
      if (punctualityStatus === "LATE") late.push(base);
      if (u.flag_status) flagged.push({ ...base, flagStatus: u.flag_status });
    }

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalStaff: staffUsers.length,
          absentCount: absent.length,
          lateCount: late.length,
          flaggedCount: flagged.length,
        },
        exceptions: { absent, late, flagged },
      },
    });
  } catch (error: any) {
    console.error("Error in attendance-exceptions API:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load attendance exceptions" },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(
  withAuthorization(handleGet, {
    requiredRole: [
      "admin",
      "sysadmin",
      "hod",
      "faculty",
      "staff",
      "principal",
      "vice_principal",
      "supervisor",
    ],
  }),
  { keyPrefix: "staff_att_exceptions", maxRequests: 30 }
);

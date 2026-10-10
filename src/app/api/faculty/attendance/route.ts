/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient, supabase } from "@/lib/dbClient";
import { getDepartments } from "@/lib/departments";
import { withAuthorization } from "@/middleware/authorization";
import type { HeatmapDay, MovementLogEntry, FacultyMemberAttendance, DepartmentAttendanceSummary } from "@/lib/types";

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

async function handleGet(req: NextRequest, context: { auth: any }) {
  try {
    const authRole = context?.auth?.role;
    const isAdmin = ["admin", "sysadmin"].includes(authRole);
    const callerDept = context?.auth?.departmentId || context?.auth?.department;

    const depts = await getDepartments();
    const deptCodeToShortName: Record<string, string> = {};
    depts.forEach((d) => {
      deptCodeToShortName[d.code] = d.shortName;
      if (d.numericCode) deptCodeToShortName[d.numericCode] = d.shortName;
    });

    let service = supabase;
    try {
      service = getSupabaseServiceClient();
    } catch {
      // Fallback to anon client if service role key is not available
    }

    let usersQuery = service
      .from("users")
      .select("*, employee_details(*)")
      .in("role", ["faculty", "staff"]);

    if (!isAdmin && callerDept) {
      usersQuery = usersQuery.eq("department_id", callerDept);
    }

    const { data: users, error: usersErr } = await usersQuery;

    if (usersErr) {
      console.error("Supabase query error fetching faculty users:", usersErr);
      return NextResponse.json({ success: false, error: usersErr.message }, { status: 500 });
    }

    const facultyUsers = users || [];

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const userIds = facultyUsers.map((u: any) => u.id);

    let logsByUser: Record<string, any[]> = {};
    if (userIds.length > 0) {
      const { data: logData, error: logErr } = await service
        .from("movement_logs")
        .select("id, user_id, direction, timestamp, gate_name, gates(name)")
        .in("user_id", userIds)
        .gte("timestamp", thirtyDaysAgo.toISOString())
        .order("timestamp", { ascending: true });

      if (logErr) {
        console.warn("Error fetching faculty movement logs:", logErr);
      } else if (logData) {
        logData.forEach((log: any) => {
          if (!logsByUser[log.user_id]) logsByUser[log.user_id] = [];
          logsByUser[log.user_id].push(log);
        });
      }
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const now = new Date();

    const records: FacultyMemberAttendance[] = facultyUsers.map((u: any) => {
      const emp = u.employee_details || {};
      const rawDept = emp.department_id || u.department_id || "CSE";
      const department = deptCodeToShortName[rawDept] || rawDept || "CSE";
      const uLogs = logsByUser[u.id] || [];

      // Filter today's movement logs
      const todayLogs = uLogs.filter((l: any) => l.timestamp.startsWith(todayStr));
      const firstInLog = todayLogs.find((l) => l.direction === "IN");
      const lastOutLog = [...todayLogs].reverse().find((l) => l.direction === "OUT");
      const latestLogToday = todayLogs[todayLogs.length - 1];
      const latestLogOverall = uLogs[uLogs.length - 1];

      // Determine today's real status
      let status: "INSIDE" | "OUTSIDE" | "ABSENT" = "ABSENT";
      if (todayLogs.length > 0) {
        status = latestLogToday.direction === "IN" ? "INSIDE" : "OUTSIDE";
      }

      // Determine punctuality
      let punctualityStatus: "ON_TIME" | "LATE" | "NOT_CHECKED_IN" = "NOT_CHECKED_IN";
      if (firstInLog) {
        const inDate = new Date(firstInLog.timestamp);
        const inHour = inDate.getHours();
        const inMinute = inDate.getMinutes();
        if (inHour < 10 || (inHour === 10 && inMinute === 0)) {
          punctualityStatus = "ON_TIME";
        } else {
          punctualityStatus = "LATE";
        }
      }

      // Calculate total hours worked today
      let totalHoursToday = "0 hrs";
      let totalMinutesToday = 0;
      if (firstInLog) {
        const startTime = new Date(firstInLog.timestamp).getTime();
        const endTime = lastOutLog ? new Date(lastOutLog.timestamp).getTime() : now.getTime();
        const diffMs = Math.max(0, endTime - startTime);
        const hrs = (diffMs / (1000 * 60 * 60)).toFixed(1);
        totalHoursToday = `${hrs} hrs`;
        totalMinutesToday = Math.round(diffMs / (1000 * 60));
      }

      // Format times & gate location
      const firstInTime = formatTime(firstInLog?.timestamp);
      const lastOutTime = formatTime(lastOutLog?.timestamp);
      const activeLog = latestLogToday || latestLogOverall;
      const gateLocation = activeLog?.gate_name || activeLog?.gates?.name || null;

      // Build 30-day attendance heatmap & statistics from real database logs
      const attendanceHeatmap: HeatmapDay[] = [];
      let presentDays = 0;
      let lateDays = 0;
      let absentDays = 0;
      let totalHoursSum = 0;

      if (uLogs.length > 0) {
        for (let i = 29; i >= 0; i--) {
          const d = new Date(now);
          d.setDate(now.getDate() - i);
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, "0");
          const dayNum = String(d.getDate()).padStart(2, "0");
          const dateStr = `${year}-${month}-${dayNum}`;
          const dayLabel = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
          const dayOfWeek = d.getDay();

          if (dayOfWeek === 0 || dayOfWeek === 6) {
            // Weekend
            attendanceHeatmap.push({
              date: dateStr,
              dayLabel,
              status: "WEEKEND",
              inTime: null,
              outTime: null,
              hours: 0,
            });
          } else {
            // Weekday: check real logs for this date
            const dateLogs = uLogs.filter((l) => l.timestamp.startsWith(dateStr));
            if (dateLogs.length > 0) {
              presentDays++;
              const dayFirstIn = dateLogs.find((l) => l.direction === "IN");
              const dayLastOut = [...dateLogs].reverse().find((l) => l.direction === "OUT");

              let dayHrs = 0;
              if (dayFirstIn) {
                const startT = new Date(dayFirstIn.timestamp).getTime();
                const endT = dayLastOut ? new Date(dayLastOut.timestamp).getTime() : startT + 7.5 * 3600 * 1000;
                dayHrs = parseFloat((Math.max(0, endT - startT) / (1000 * 60 * 60)).toFixed(1));
              }
              totalHoursSum += dayHrs;

              let dayStatus: "ON_TIME" | "LATE" | "INSIDE" = "ON_TIME";
              if (dayFirstIn) {
                const inD = new Date(dayFirstIn.timestamp);
                if (inD.getHours() > 10 || (inD.getHours() === 10 && inD.getMinutes() > 0)) {
                  dayStatus = "LATE";
                  lateDays++;
                }
              }
              if (i === 0 && status === "INSIDE") {
                dayStatus = "INSIDE";
              }

              attendanceHeatmap.push({
                date: dateStr,
                dayLabel,
                status: dayStatus,
                inTime: formatTime(dayFirstIn?.timestamp),
                outTime: formatTime(dayLastOut?.timestamp),
                hours: dayHrs,
              });
            } else {
              absentDays++;
              attendanceHeatmap.push({
                date: dateStr,
                dayLabel,
                status: "ABSENT",
                inTime: null,
                outTime: null,
                hours: 0,
              });
            }
          }
        }
      }

      const totalWorkDays = presentDays + absentDays;
      const attendanceRate = totalWorkDays > 0 ? Math.round((presentDays / totalWorkDays) * 100) : 0;
      const avgHoursPerDay = presentDays > 0 ? parseFloat((totalHoursSum / presentDays).toFixed(1)) : 0;

      const recentLogs: MovementLogEntry[] = [...uLogs]
        .reverse()
        .slice(0, 10)
        .map((l) => ({
          id: l.id,
          timestamp: formatTime(l.timestamp) || l.timestamp,
          direction: l.direction,
          gate: l.gate_name || l.gates?.name || "Main Gate",
        }));

      return {
        id: u.id,
        uniqueId: u.unique_id || emp.employee_id || "FAC",
        fullName: u.name || "Faculty Member",
        email: u.email || "",
        phone: u.phone || "",
        department,
        designation: emp.designation || (u.role === "staff" ? "Office Staff" : "Faculty Member"),
        status,
        firstInTime,
        lastOutTime,
        punctualityStatus,
        totalHoursToday,
        totalMinutesToday,
        gateLocation,
        attendanceRate,
        monthlyStats: {
          presentDays,
          lateDays,
          absentDays,
          avgHoursPerDay,
        },
        attendanceHeatmap,
        recentLogs,
      };
    });

    const totalFaculty = records.length;
    const presentToday = records.filter((r) => r.status !== "ABSENT").length;
    const currentlyInside = records.filter((r) => r.status === "INSIDE").length;
    const currentlyOutside = records.filter((r) => r.status === "OUTSIDE").length;
    const lateArrivals = records.filter((r) => r.punctualityStatus === "LATE").length;
    const absentCount = records.filter((r) => r.status === "ABSENT").length;
    const overallAttendanceRate = Math.round((presentToday / (totalFaculty || 1)) * 100);

    const deptMap: Record<string, { total: number; present: number; inside: number; outside: number }> = {};
    const deptHoursMap: Record<string, number[]> = {};
    records.forEach((r) => {
      if (!deptMap[r.department]) {
        deptMap[r.department] = { total: 0, present: 0, inside: 0, outside: 0 };
        deptHoursMap[r.department] = [];
      }
      deptMap[r.department].total += 1;
      if (r.status !== "ABSENT") {
        deptMap[r.department].present += 1;
        if (typeof r.totalMinutesToday === "number") {
          deptHoursMap[r.department].push(r.totalMinutesToday);
        }
      }
      if (r.status === "INSIDE") deptMap[r.department].inside += 1;
      if (r.status === "OUTSIDE") deptMap[r.department].outside += 1;
    });

    const departmentSummaries: DepartmentAttendanceSummary[] = Object.entries(deptMap).map(
      ([dept, counts]) => {
        const minsList = deptHoursMap[dept] || [];
        const avgMins = minsList.length > 0 ? Math.round(minsList.reduce((a, b) => a + b, 0) / minsList.length) : 0;
        const avgHrsStr = `${(avgMins / 60).toFixed(1)} hrs`;
        return {
          department: dept,
          totalFaculty: counts.total,
          presentToday: counts.present,
          currentlyInside: counts.inside,
          presentCount: counts.present,
          insideCount: counts.inside,
          outsideCount: counts.outside,
          attendanceRate: Math.round((counts.present / (counts.total || 1)) * 100),
          avgMinutesToday: avgMins,
          avgHoursToday: avgHrsStr,
        };
      }
    );

    return NextResponse.json({
      success: true,
      summary: {
        totalFaculty,
        presentToday,
        currentlyInside,
        currentlyOutside,
        lateArrivals,
        absentCount,
        overallAttendanceRate,
      },
      departmentSummaries,
      records,
    });
  } catch (error) {
    console.error("Error in faculty attendance API:", error);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve faculty attendance metrics" },
      { status: 500 }
    );
  }
}
export const GET = withAuthorization(handleGet, {
  requiredRole: ["admin", "sysadmin", "hod", "faculty", "warden"],
});

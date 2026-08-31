import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabaseClient";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";

interface StudentStats {
  total: number;
  active: number;
  suspended: number;
  flagged: number;
  byDepartment: Array<{ code: string; name: string; count: number; color: string }>;
  byType: Array<{ type: string; label: string; count: number; color: string }>;
  byGender: Array<{ gender: string; count: number; color: string }>;
  byYear: Array<{ year: string; count: number; color: string }>;
  onCampusToday: number;
  todayEntries: number;
  todayExits: number;
}

const DEPT_COLORS: Record<string, string> = {
  CSE: "bg-blue-500",
  IT: "bg-purple-500",
  ECE: "bg-emerald-500",
  EEE: "bg-amber-500",
  ME: "bg-rose-500",
};

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  HM: { label: "Hostel Male", color: "bg-blue-500" },
  HF: { label: "Hostel Female", color: "bg-pink-500" },
  DM: { label: "Day Scholar Male", color: "bg-emerald-500" },
  DF: { label: "Day Scholar Female", color: "bg-amber-500" },
};

async function handleGet(req: NextRequest) {
  try {
    const svc = getSupabaseServiceClient();
    
    // Parse filters from query params
    const deptFilter = req.nextUrl.searchParams.get("department");
    const yearFilter = req.nextUrl.searchParams.get("year");
    const statusFilter = req.nextUrl.searchParams.get("status");
    const genderFilter = req.nextUrl.searchParams.get("gender");
    const typeFilter = req.nextUrl.searchParams.get("type");

    // Total students with optional filters
    let query = svc.from("users").select("id, role, status, flag_status, gender", { count: "exact" }).eq("role", "student");
    if (statusFilter && statusFilter !== "ALL") query = query.eq("status", statusFilter);
    if (genderFilter && genderFilter !== "ALL") query = query.eq("gender", genderFilter);
    const { data: allStudents, error: studentsErr } = await query;
    if (studentsErr) throw studentsErr;

    const total = allStudents?.length || 0;
    const active = allStudents?.filter((s: any) => s.status === "ACTIVE").length || 0;
    const suspended = allStudents?.filter((s: any) => s.status === "SUSPENDED").length || 0;
    const flagged = allStudents?.filter((s: any) => s.flag_status === "suspicious").length || 0;

    // Department breakdown
    let deptQuery = svc.from("users").select(`
        id,
        student_details:user_details!users_id_fkey (department)
      `).eq("role", "student");
    if (deptFilter && deptFilter !== "ALL") deptQuery = deptQuery.eq("student_details.department", deptFilter);
    const { data: deptData } = await deptQuery;

    const deptCounts: Record<string, number> = {};
    (deptData || []).forEach((u: any) => {
      const dept = u.student_details?.department || "UNKNOWN";
      deptCounts[dept] = (deptCounts[dept] || 0) + 1;
    });

    const byDepartment = Object.entries(deptCounts)
      .map(([code, count]) => ({
        code,
        name: code,
        count,
        color: DEPT_COLORS[code] || "bg-slate-500",
      }))
      .sort((a, b) => b.count - a.count);

    // Student type breakdown (HM/HF/DM/DF)
    let typeQuery = svc.from("users").select("id, student_type").eq("role", "student");
    if (typeFilter && typeFilter !== "ALL") typeQuery = typeQuery.eq("student_type", typeFilter);
    const { data: typeData } = await typeQuery;

    const typeCounts: Record<string, number> = {};
    (typeData || []).forEach((u: any) => {
      const t = u.student_type || "DM";
      typeCounts[t] = (typeCounts[t] || 0) + 1;
    });

    const byType = Object.entries(typeCounts)
      .map(([type, count]) => ({
        type,
        label: TYPE_LABELS[type]?.label || type,
        count,
        color: TYPE_LABELS[type]?.color || "bg-slate-500",
      }));

    // Gender breakdown
    let genderQuery = svc.from("users").select("id, gender").eq("role", "student");
    if (genderFilter && genderFilter !== "ALL") genderQuery = genderQuery.eq("gender", genderFilter);
    const { data: genderData } = await genderQuery;

    const genderCounts: Record<string, number> = {};
    (genderData || []).forEach((u: any) => {
      const g = (u.gender || "male").toLowerCase();
      genderCounts[g] = (genderCounts[g] || 0) + 1;
    });

    const byGender = Object.entries(genderCounts)
      .map(([gender, count]) => ({
        gender: gender.charAt(0).toUpperCase() + gender.slice(1),
        count,
        color: gender === "male" ? "bg-blue-500" : "bg-pink-500",
      }));

    // Year breakdown
    let yearQuery = svc.from("users").select("id, student_details").eq("role", "student");
    if (yearFilter && yearFilter !== "ALL") yearQuery = yearQuery.eq("student_details.year", yearFilter);
    const { data: yearData } = await yearQuery;

    const yearCounts: Record<string, number> = {};
    (yearData || []).forEach((u: any) => {
      const year = u.student_details?.year || "1";
      yearCounts[String(year)] = (yearCounts[String(year)] || 0) + 1;
    });

    const byYear = Object.entries(yearCounts)
      .map(([year, count]) => ({
        year: `Year ${year}`,
        count,
        color: ["bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-purple-500"][parseInt(year) - 1] || "bg-slate-500",
      }))
      .sort((a, b) => parseInt(a.year) - parseInt(b.year));

    // Today's movement stats from movement_logs (not filtered by department/year etc, just role)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { data: todayLogs } = await svc
      .from("movement_logs")
      .select("direction, person_type")
      .eq("person_type", "student")
      .gte("timestamp", todayStart.toISOString());

    let onCampusToday = 0;
    let todayEntries = 0;
    let todayExits = 0;
    (todayLogs || []).forEach((log: any) => {
      if (log.direction === "IN") todayEntries++;
      else todayExits++;
    });
    onCampusToday = Math.max(0, todayEntries - todayExits);

    return NextResponse.json({
      success: true,
      data: {
        total,
        active,
        suspended,
        flagged,
        byDepartment,
        byType,
        byGender,
        byYear,
        onCampusToday,
        todayEntries,
        todayExits,
      } as StudentStats,
    });
  } catch (error) {
    console.error("Error fetching student stats:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to load student statistics" } },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ["admin", "sysadmin"] }),
  { keyPrefix: "student_stats", maxRequests: 30 }
);

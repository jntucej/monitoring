/* eslint-disable */
// /api/staff/stats — staff (non-student) roster statistics for the sysadmin
// Staff page infographic row. Mirrors the /api/students/stats pattern:
// server-side aggregation over users + employee_details, grouped by the
// role hierarchy, department and staff category, plus status counts.
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";

const STAFF_ROLES = [
  "operator", "admin", "sysadmin", "supervisor", "guardian", "hod",
  "faculty", "staff", "principal", "worker", "visitor", "caretaker",
  "deputy_warden", "hostel_manager", "principal", "vice_principal",
  "oie", "exam_branch",
];

// Hierarchy buckets for the role infographic (matches the sysadmin staff page
// filter groups: Admin / Academic / Hostel / Field).
const ROLE_GROUPS: Array<{ label: string; roles: string[]; color: string }> = [
  { label: "Admin", roles: ["sysadmin", "admin"], color: "bg-red-500" },
  { label: "Academic", roles: ["principal", "vice_principal", "oie", "exam_branch", "hod", "faculty"], color: "bg-blue-500" },
  { label: "Hostel", roles: ["principal", "deputy_warden", "hostel_manager", "caretaker", "supervisor"], color: "bg-cyan-500" },
  { label: "Field", roles: ["operator", "staff", "worker"], color: "bg-emerald-500" },
  { label: "Other", roles: ["guardian", "visitor"], color: "bg-slate-500" },
];

interface StaffStats {
  total: number;
  active: number;
  suspended: number;
  byGroup: Array<{ group: string; count: number; color: string; roles: Array<{ role: string; count: number }> }>;
  byDepartment: Array<{ code: string; name: string; count: number }>;
  byStaffCategory: Array<{ category: string; count: number }>;
  byDesignation: Array<{ designation: string; count: number }>;
}

async function handleGet(req: NextRequest) {
  try {
    const svc = getSupabaseServiceClient();
    const roleFilter = req.nextUrl.searchParams.get("role");
    // The sysadmin staff console sends dept + status filters; honor them so
    // the department/status dropdowns actually drive the infographic.
    const deptFilter = req.nextUrl.searchParams.get("dept");
    const statusFilter = req.nextUrl.searchParams.get("status");

    const [usersRes, empRes] = await Promise.all([
      svc.from("users")
        .select("id, role, status, department_id")
        .in("role", STAFF_ROLES),
      svc.from("employee_details").select("user_id, designation, department_id, staff_category"),
    ]);

    const users = (usersRes.data || []).filter((u: any) => {
      if (roleFilter && roleFilter !== "ALL" && u.role !== roleFilter) return false;
      if (statusFilter && statusFilter !== "ALL" && u.status !== statusFilter) return false;
      return true;
    });

    const empMap = new Map((empRes.data || []).map((e: any) => [e.user_id, e]));

    // Resolve the department for each staff member: explicit department_id,
    // otherwise employee_details.department_id.
    let staffRows = users.map((u: any) => {
      const emp = empMap.get(u.id) || {};
      const rawDept = u.department_id || emp.department_id || "";
      return {
        ...u,
        department_id: rawDept || null,
        designation: emp.designation || null,
        staff_category: emp.staff_category || null,
      };
    });
    if (deptFilter && deptFilter !== "ALL") {
      staffRows = staffRows.filter((s: any) => s.department_id === deptFilter);
    }

    const total = staffRows.length;
    const active = staffRows.filter((s: any) => s.status === "ACTIVE").length;
    const suspended = staffRows.filter((s: any) => s.status === "SUSPENDED" || s.status === "LOCKED").length;

    // --- Role hierarchy (grouped, each group with its role breakdown) ---
    const roleCounts: Record<string, number> = {};
    staffRows.forEach((s: any) => { roleCounts[s.role] = (roleCounts[s.role] || 0) + 1; });

    const byGroup = ROLE_GROUPS.map((g) => ({
      group: g.label,
      color: g.color,
      count: g.roles.reduce((sum, r) => sum + (roleCounts[r] || 0), 0),
      roles: g.roles
        .filter((r) => roleCounts[r])
        .map((r) => ({ role: r, count: roleCounts[r] })),
    })).filter((g) => g.count > 0);

    // --- Department breakdown ---
    const deptCounts: Record<string, number> = {};
    staffRows.forEach((s: any) => {
      const code = s.department_id || "UNASSIGNED";
      deptCounts[code] = (deptCounts[code] || 0) + 1;
    });
    const byDepartment = Object.entries(deptCounts)
      .map(([code, count]) => ({ code, name: code === "UNASSIGNED" ? "Unassigned" : code, count }))
      .sort((a, b) => b.count - a.count);

    // --- Staff category (the hierarchy dimension: teaching / office / support ...) ---
    const catCounts: Record<string, number> = {};
    staffRows.forEach((s: any) => {
      const cat = s.staff_category || "other";
      catCounts[cat] = (catCounts[cat] || 0) + 1;
    });
    const byStaffCategory = Object.entries(catCounts)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    // --- Designation breakdown ---
    const desigCounts: Record<string, number> = {};
    staffRows.forEach((s: any) => {
      const d = s.designation || "Unspecified";
      desigCounts[d] = (desigCounts[d] || 0) + 1;
    });
    const byDesignation = Object.entries(desigCounts)
      .map(([designation, count]) => ({ designation, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    return NextResponse.json({
      success: true,
      data: { total, active, suspended, byGroup, byDepartment, byStaffCategory, byDesignation } as StaffStats,
    });
  } catch (error) {
    console.error("Error fetching staff stats:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to load staff statistics" } },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ["admin", "sysadmin", "hod", "faculty", "staff"] }),
  { keyPrefix: "staff_stats", maxRequests: 120 }
);

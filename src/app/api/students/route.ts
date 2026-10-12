import { NextRequest, NextResponse } from "next/server";
import { findAllStudents, searchStudents, getParentChildren } from "@/lib/db";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { mPerson } from "@/lib/db";
import type { Person, Student } from "@/lib/types";

const HOSTEL_CODES = ["CSE", "IT", "ECE", "EEE", "ME"];
const WARDEN_ROLES = ["principal", "supervisor"];
const PRINCIPAL_ROLES = ["principal"];

/**
 * Warden/supervisor scoped roster query, via the Postgres service client:
 *   ?scope=active&hostel=CSE  -> students not checked out, optional hostel block
 *   ?scope=active             -> all students not checked out
 *   (hostel without scope is rejected — wardens only get scoped listings)
 */
async function findWardenScopedStudents(scope: string | null, hostel: string | null): Promise<Student[]> {
  const service = getSupabaseServiceClient();
  let query = service
    .from("users")
    .select("*")
    .eq("role", "student")
    .eq("status", "ACTIVE");
  if (hostel && HOSTEL_CODES.includes(hostel.toUpperCase())) {
    query = query.eq("department", hostel.toUpperCase());
  }
  if (scope === "active") {
    query = query.or(`checked_out_at.is.null`);
  }
  const { data, error } = await query;
  if (error) throw error;
  if (!data || data.length === 0) return [];

  const ids = data.map((u: any) => u.id);
  const { data: studentRows } = await service
    .from("student_details")
    .select("*")
    .in("user_id", ids);

  const studentMap = new Map((studentRows || []).map((s: any) => [s.user_id, s]));
  return data.map((u: any) =>
    mPerson({
      ...u,
      student_details: studentMap.get(u.id) || null,
      employee_details: null,
    })
  );
}

async function handleGet(req: NextRequest) {
  try {
    const authRole = req.headers.get("x-user-role");
    const authUserId = req.headers.get("x-user-id");
    if (!authRole || !authUserId) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    const params = req.nextUrl.searchParams;
    const q = params.get("q");
    const parentId = params.get("parentId");
    const scope = params.get("scope");
    const hostel = params.get("hostel");
    // status=ALL returns every student regardless of ACTIVE/DEPROVISIONED;
    // any other value filters on users.status (used by the alumni page).
    const statusParam = params.get("status");
    const status = statusParam && statusParam !== "ALL" ? statusParam : undefined;

    // Parents can only list their own children
    if (parentId) {
      if (authRole !== "admin" && authRole !== "sysadmin" && authUserId !== parentId) {
        return NextResponse.json(
          { success: false, error: { code: "FORBIDDEN", message: "You can only access your own linked students." } },
          { status: 403 }
        );
      }
      const children = await getParentChildren(parentId);
      return NextResponse.json({ success: true, data: children });
    }

    // Warden/supervisor/principal: scoped query (active roster, optional hostel block)
    if (WARDEN_ROLES.includes(authRole) || PRINCIPAL_ROLES.includes(authRole)) {
      const data = await findWardenScopedStudents(scope, hostel);
      return NextResponse.json({ success: true, data });
    }

    // Only admins/sysadmins may list the full roster
    if (authRole !== "admin" && authRole !== "sysadmin") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Insufficient permissions to list students." } },
        { status: 403 }
      );
    }

    const result: Person[] = q ? await searchStudents(q) : await findAllStudents(status);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Error fetching students:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to load students" } },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(
  withAuthorization(handleGet, {
    requiredRole: ["admin", "sysadmin", "parent", "guardian", "principal", "supervisor"],
  }),
  { keyPrefix: "students_list", maxRequests: 100 }
);

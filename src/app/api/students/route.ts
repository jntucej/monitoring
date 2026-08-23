import { NextRequest, NextResponse } from "next/server";
import { findAllStudents, searchStudents, findStudentByRoll, getParentChildren } from "@/lib/db";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { getGateStudentInfo } from "@/lib/authContext";
import type { Student } from "@/lib/types";

/**
 * Helper: extract bearer token from request for authContext lookups.
 */
function extractToken(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice(7);
}

async function handleGet(req: NextRequest) {
  try {
    const token = extractToken(req);
    if (!token) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    const authRole = req.headers.get("x-user-role");
    const authUserId = req.headers.get("x-user-id");
    const params = req.nextUrl.searchParams;
    const roll = params.get("roll");
    const q = params.get("q");
    const parentId = params.get("parentId");

    // If parentId is provided, return students for that parent
    if (parentId) {
      // Only the parent themselves or an admin can access this
      if (authRole !== "admin" && authRole !== "sysadmin" && authUserId !== parentId) {
        return NextResponse.json(
          { success: false, error: { code: "FORBIDDEN", message: "You can only access your own children." } },
          { status: 403 }
        );
      }

      const children = await getParentChildren(parentId);
      // Sanitize: remove sensitive fields for parents
      const sanitized = children.map((s: Student) => ({
        id: s.id,
        roll: s.roll,
        name: s.name,
        department: s.department,
        year: s.year,
        section: s.section,
        photo: s.photo,
        status: s.status,
        hostelBlock: s.hostelBlock,
        roomNumber: s.roomNumber,
      }));
      return NextResponse.json({ success: true, data: sanitized });
    }

    if (roll) {
      // Operator: only receive minimal PII-free fields for gate verification
      if (authRole === "operator") {
        const minimal = await getGateStudentInfo(token, roll);
        return NextResponse.json({ success: true, data: minimal });
      }

      // Supervisor, admin, sysadmin: full record
      if (["supervisor", "admin", "sysadmin"].includes(authRole || "")) {
        const student = await findStudentByRoll(roll);
        if (!student) {
          return NextResponse.json(
            { success: false, error: { code: "NOT_FOUND", message: "Student not found" } },
            { status: 404 }
          );
        }
        return NextResponse.json({ success: true, data: student });
      }

      // Everyone else (student, parent): cannot look up arbitrary students
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Insufficient permissions to look up students." } },
        { status: 403 }
      );
    }

    if (q) {
      // Searching for students is limited to administrative/supervisory roles
      if (!["supervisor", "admin", "sysadmin"].includes(authRole || "")) {
        return NextResponse.json(
          { success: false, error: { code: "FORBIDDEN", message: "Insufficient permissions to search students." } },
          { status: 403 }
        );
      }
      const data = await searchStudents(q);
      // For search results, strip PII fields that should not be exposed
      const sanitized = data.map((s: Student) => ({
        id: s.id,
        roll: s.roll,
        name: s.name,
        department: s.department,
        year: s.year,
        section: s.section,
        photo: s.photo,
        status: s.status,
      }));
      return NextResponse.json({ success: true, data: sanitized });
    }

    // Listing all students is highly restricted to admin/sysadmin
    if (!["admin", "sysadmin"].includes(authRole || "")) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "You do not have permission to list all students." } },
        { status: 403 }
      );
    }

    const data = await findAllStudents();
    // Strip PII from the full listing as well
    const sanitized = data.map((s: Student) => ({
      id: s.id,
      roll: s.roll,
      name: s.name,
      department: s.department,
      year: s.year,
      section: s.section,
      batch: s.batch,
      photo: s.photo,
      status: s.status,
    }));
    return NextResponse.json({ success: true, data: sanitized });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message.includes("NOT_FOUND") || error.message.includes("FORBIDDEN") || error.message.includes("INACTIVE"))) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: error.message } },
        { status: 403 }
      );
    }
    console.error("Error fetching student data:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to load students" } },
      { status: 500 }
    );
  }
}

// Apply authentication, authorization, and rate limiting to ALL operations
// Parent role added so parents can fetch their own children's basic info
export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ["operator", "supervisor", "admin", "sysadmin", "parent"] }),
  { keyPrefix: "students_get", maxRequests: 100 }
);

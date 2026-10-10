import { NextRequest, NextResponse } from "next/server";
import { findAllStudents, searchStudents, findStudentByRoll, getParentChildren, searchStudents as searchStudentsLib } from "@/lib/db";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit, rateLimitByKey } from "@/lib/rate-limit";
import { getGateStudentInfo, type AuthContext } from "@/lib/authContext";
import type { Student } from "@/lib/types";

/**
 * Helper: extract bearer token from request for authContext lookups.
 */
function extractToken(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice(7);
}

const PRIVILEGED_ROLES = ["sysadmin", "admin", "warden", "supervisor", "hod"] as const;
const FULL_PII_ROLES = ["sysadmin", "admin"] as const;

function stripStudentPII(s: Student) {
  return {
    id: s.id,
    roll: s.roll,
    name: s.name,
    department: s.department,
    year: s.year,
    section: s.section,
    status: s.status,
  };
}

async function handleGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  const url = new URL(req.url);
  const search = url.searchParams.get("q");
  const parentId = url.searchParams.get("guardianId") ?? url.searchParams.get("parentId");

  // ── Path 1: Parent fetching their own children ──
  if (parentId) {
    const scopedParentId =
      auth.role === "parent" || auth.role === "guardian"
        ? auth.userId
        : parentId;

    if (!scopedParentId) {
      return NextResponse.json({ error: "MISSING_PARENT" }, { status: 400 });
    }
    const children = await getParentChildren(scopedParentId);
    return NextResponse.json({ success: true, data: children });
  }

  // ── Path 2: Everyone else — must be privileged ──
  if (!PRIVILEGED_ROLES.includes(auth.role as any)) {
    return NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "Forbidden" } }, { status: 403 });
  }

  // ── Path 3: Search with rate limit ──
  if (search) {
    const rl = await rateLimitByKey(`student-search:${auth.userId}`, {
      windowMs: 60000,
      maxRequests: 30,
    });
    if (rl.limited) {
      return NextResponse.json({ success: false, error: { code: "RATE_LIMITED", message: "Too many requests" } }, { status: 429 });
    }

    const students = await searchStudentsLib(search);
    const fullPii = FULL_PII_ROLES.includes(auth.role as any);
    return NextResponse.json({
      success: true,
      data: fullPii ? students : students.map(stripStudentPII),
    });
  }

  // ── Path 4: List all ──
  const students = await findAllStudents();
  const fullPii = FULL_PII_ROLES.includes(auth.role as any);
  return NextResponse.json({
    success: true,
    data: fullPii ? students : students.map(stripStudentPII),
  });
}

// Apply authentication, authorization, and rate limiting to ALL operations
// Parent role added so parents can fetch their own children's basic info
export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ["operator", "admin", "sysadmin", "parent", "warden", "supervisor", "hod", "faculty"] }),
  { keyPrefix: "students_get", maxRequests: 100 }
);

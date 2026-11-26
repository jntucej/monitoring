/**
 * GET /api/faculty/attendance/student-disputes
 *
 * Disputes raised by a specific student (attendance_disputes).
 * Faculty-scoped: the caller must be assigned to the student's class
 * (or admin/sysadmin).
 *
 * Query params:
 *   studentId — required (user id of the student)
 */

import { NextRequest } from "next/server";
import { withApiChain } from "@/lib/api-chain";
import { query } from "@/lib/postgres";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok, fail } from "@/server/http/response";
import { TIER } from "@/server/policy/roles";
import type { AuthContext } from "@/lib/authContext";

async function implGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  const sp = req.nextUrl.searchParams;
  const studentId = sp.get("studentId");
  if (!studentId) return fail("VALIDATION", "studentId required");

  // Admin/sysadmin can view any; faculty must be assigned to the student's class.
  const isAdmin = ["admin", "sysadmin"].includes(auth.role);

  if (!isAdmin) {
    // Verify the faculty member teaches a class the student belongs to
    const assignR = await query<{ class_id: string }>(
      `SELECT fa.class_id::text
         FROM faculty_assignments fa
         JOIN attendance_records ar ON ar.class_id = fa.class_id
        WHERE fa.faculty_id = $1::uuid AND ar.person_id = $2::uuid
        LIMIT 1`,
      [auth.userId, studentId]
    );
    if (assignR.rows.length === 0) {
      return fail("FORBIDDEN", "Not your student", 403);
    }
  }

  const rows = await query<{
    date: string;
    reason: string;
    status: string;
    created_at: string;
  }>(
    `SELECT to_char(ad.date, 'YYYY-MM-DD') AS date,
            ad.reason,
            ad.status,
            to_char(ad.created_at, 'YYYY-MM-DD HH24:MI') AS created_at
       FROM attendance_disputes ad
      WHERE ad.person_id = $1::uuid
        AND ad.status NOT IN ('RESOLVED','DISMISSED')
      ORDER BY ad.created_at DESC
      LIMIT 10`,
    [studentId]
  );

  return ok({
    studentId,
    disputes: rows.rows.map((r) => ({
      date: r.date,
      reason: r.reason,
      status: r.status,
      raisedAt: r.created_at,
    })),
  });
}

export const GET = withApiChain(implGet, {
  route: "/api/faculty/attendance/student-disputes",
  auth: "user",
  requiredRole: TIER.OPERATOR,
  rateLimit: { keyPrefix: "faculty-student-disputes", maxRequests: 30, windowMs: 60_000 },
});

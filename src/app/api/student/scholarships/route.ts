// /api/student/scholarships/route.ts
// Scholarship status tracking (STEP 3.1).

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

async function implGet(_req: NextRequest, ctx: { auth: AuthContext }) {
  const { auth } = ctx;
  const { rows } = await query<{
    id: string; scheme: string; status: string;
    amount: string | null; academic_year: number | null; notes: string | null;
  }>(
    `SELECT id, scheme, status, amount::text AS amount, academic_year, notes
       FROM public.scholarships WHERE student_id = $1 ORDER BY academic_year DESC NULLS LAST`,
    [auth.userId],
  );
  return ok({
    userId: auth.userId,
    scholarships: rows.map((r) => ({
      id: r.id, scheme: r.scheme, status: r.status,
      amount: r.amount === null ? null : Number(r.amount),
      academicYear: r.academic_year, notes: r.notes,
    })),
  });
}

export const GET = withRateLimit(
  withAuthorization(implGet, { requiredRole: ["student", "parent", "guardian", "admin", "sysadmin"] }),
  { keyPrefix: "student-scholarships", maxRequests: 30, windowMs: 60_000 },
);

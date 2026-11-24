/**
 * POST /api/student/attendance/dispute
 *
 * Raise an attendance dispute ("I was present" / "mark was wrong").
 * Student-tier only. Creates a row in attendance_disputes.
 *
 * Body: { date: "YYYY-MM-DD", reason: string, evidence?: string }
 */

import { NextRequest } from "next/server";
import { query } from "@/lib/postgres";
import { withMutationGuard } from "@/server/http/mutation-guard";
import { ok, fail } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";

async function implPost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const body = await req.json();
  const date: string = body.date?.trim();
  const reason: string = body.reason?.trim();
  const evidence: string | undefined = body.evidence?.trim() || undefined;

  if (!date || !reason) {
    return fail("VALIDATION", "date and reason are required");
  }

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return fail("VALIDATION", "date must be YYYY-MM-DD");
  }

  const result = await query<{ id: string }>(
    `INSERT INTO attendance_disputes (person_id, date, reason, evidence, status, created_at)
     VALUES ($1, $2::date, $3, $4, 'OPEN', NOW())
     ON CONFLICT DO NOTHING
     RETURNING id::text AS id`,
    [auth.userId, date, reason, evidence]
  );

  if (result.rows.length === 0) {
    return fail("DUPLICATE", "An open dispute already exists for this date");
  }

  return ok({ id: result.rows[0].id, status: "OPEN" });
}

export const POST = withMutationGuard(implPost, {
  requiredRole: ["student"],
  rateLimit: { maxRequests: 10, windowMs: 60_000 },
});

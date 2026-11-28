/**
 * GET /api/student/academic-plan — this student's active academic plan.
 * POST /api/student/academic-plan — upsert (one active plan per student+semester).
 *
 * Backed by student_academic_plans (migration 20270131000048).
 */
import { NextRequest } from "next/server";
import { withApiChain } from "@/lib/api-chain";
import { withMutationGuard } from "@/server/http/mutation-guard";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

interface PlanRow {
  id: string;
  semester: string;
  electives: unknown;
  project_title: string | null;
  internship_status: string;
  updated_at: string;
}

async function implGet(_req: NextRequest, ctx: { auth: AuthContext }) {
  const { rows } = await query<PlanRow>(
    `SELECT id::text, semester, electives, project_title, internship_status, updated_at
       FROM public.student_academic_plans
      WHERE student_id = $1::uuid
      ORDER BY updated_at DESC
      LIMIT 10`,
    [ctx.auth.userId],
  );
  return ok({ plans: rows });
}

async function implPost(req: NextRequest, ctx: { auth: AuthContext }) {
  const body = await req.json().catch(() => ({}));
  const semester = String(body.semester ?? "").trim();
  const electives = Array.isArray(body.electives) ? body.electives : [];
  const projectTitle = body.project_title ? String(body.project_title).trim() : null;
  const internshipStatus = String(body.internship_status ?? "NONE").trim();

  if (!semester) {
    return fail("VALIDATION", "semester is required");
  }
  const allowed = ["NONE", "APPLIED", "SELECTED", "IN_PROGRESS", "COMPLETED"];
  if (!allowed.includes(internshipStatus)) {
    return fail("VALIDATION", "internship_status must be one of: " + allowed.join(", "));
  }

  await query(
    `INSERT INTO public.student_academic_plans
        (student_id, semester, electives, project_title, internship_status)
     VALUES ($1::uuid, $2, $3, $4, $5)
     ON CONFLICT (student_id, semester)
     DO UPDATE SET electives = EXCLUDED.electives,
                   project_title = EXCLUDED.project_title,
                   internship_status = EXCLUDED.internship_status,
                   updated_at = NOW()`,
    [ctx.auth.userId, semester, JSON.stringify(electives), projectTitle, internshipStatus],
  );
  return ok({ semester, status: "saved" });
}

export const GET = withApiChain(implGet, {
  route: "/api/student/academic-plan",
  auth: "user",
  requiredRole: ["student"],
  rateLimit: { keyPrefix: "student_academic_plan_read", maxRequests: 60 },
});
export const POST = withMutationGuard(implPost, {
  requiredRole: ["student"],
  rateLimit: { maxRequests: 10, windowMs: 60_000 },
});

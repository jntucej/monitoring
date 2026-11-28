/**
 * GET /api/student/parent-visits — list this student's parent-visit bookings.
 * POST /api/student/parent-visits — request a new visit slot.
 *
 * Backed by student_parent_visits (migration 20270131000047). RLS scopes all
 * rows to the caller (gate_app) + service_role for workers.
 */
import { NextRequest } from "next/server";
import { withApiChain } from "@/lib/api-chain";
import { withMutationGuard } from "@/server/http/mutation-guard";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

interface ParentVisitRow {
  id: string;
  visitor_name: string;
  relation: string;
  visit_date: string;
  time_slot: string;
  qr_token: string | null;
  status: string;
  hostel_block: string | null;
  requested_at: string;
}

async function implGet(_req: NextRequest, ctx: { auth: AuthContext }) {
  const { rows } = await query<ParentVisitRow>(
    `SELECT id::text, visitor_name, relation, visit_date::text, time_slot,
            qr_token, status, hostel_block, requested_at
       FROM public.student_parent_visits
      WHERE student_id = $1::uuid
      ORDER BY visit_date DESC, requested_at DESC
      LIMIT 50`,
    [ctx.auth.userId],
  );
  return ok({ visits: rows });
}

async function implPost(req: NextRequest, ctx: { auth: AuthContext }) {
  const body = await req.json().catch(() => ({}));
  const visitorName = String(body.visitor_name ?? "").trim();
  const relation = String(body.relation ?? "parent").trim();
  const visitDate = String(body.visit_date ?? "").trim();
  const timeSlot = String(body.time_slot ?? "").trim();

  if (!visitorName || !visitDate || !timeSlot) {
    return fail("VALIDATION", "visitor_name, visit_date, time_slot are required");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(visitDate)) {
    return fail("VALIDATION", "visit_date must be YYYY-MM-DD");
  }

  const { rows } = await query<{ id: string }>(
    `INSERT INTO public.student_parent_visits
        (student_id, visitor_name, relation, visit_date, time_slot, status)
     VALUES ($1::uuid, $2, $3, $4::date, $5, 'PENDING')
     RETURNING id::text AS id`,
    [ctx.auth.userId, visitorName, relation || "parent", visitDate, timeSlot],
  );
  return ok({ id: rows[0].id, status: "PENDING" });
}

export const GET = withApiChain(implGet, {
  route: "/api/student/parent-visits",
  auth: "user",
  requiredRole: ["student"],
  rateLimit: { keyPrefix: "student_parent_visits_read", maxRequests: 60 },
});
export const POST = withMutationGuard(implPost, {
  requiredRole: ["student"],
  rateLimit: { maxRequests: 5, windowMs: 60_000 },
});

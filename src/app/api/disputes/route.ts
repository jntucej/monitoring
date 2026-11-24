// /api/disputes/route.ts
// POST — create a universal dispute. entity_type + entity_id + reason +
//       evidence. The universal dispute API: one endpoint handles
//       "I was marked absent", "my meal was cold", "my pass was rejected".
// GET  — list the current user's disputes (?status=open).
//
// Auth: withAuthorization (Bearer JWT) + withRateLimit. The dispute is
// scoped to the calling user.

import { NextRequest } from "next/server";
import { withAuthorization, type AuthContext } from "@/middleware/authorization";
import { withMutationGuard } from "@/server/http/mutation-guard";
import { withRateLimit } from "@/lib/rate-limit";
import { query } from "@/lib/postgres";

const VALID_ENTITY_TYPES = [
  "attendance", "event", "meal", "pass", "document", "complaint", "conduct",
];

async function implGet(req: NextRequest, ctx: { auth: AuthContext }) {
  const uid = ctx.auth.userId;
  const status = req.nextUrl.searchParams.get("status");

  const { rows } = await query(
    status
      ? `SELECT id, entity_type, entity_id, reason, status, resolution_note, escalated_to, created_at, resolved_at
         FROM public.disputes WHERE user_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT 50`
      : `SELECT id, entity_type, entity_id, reason, status, resolution_note, escalated_to, created_at, resolved_at
         FROM public.disputes WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
    status ? [uid, status] : [uid],
  );

  return Response.json({ success: true, disputes: rows });
}

async function implPost(req: NextRequest, ctx: { auth: AuthContext }) {
  const uid = ctx.auth.userId;

  const body = (await req.json().catch(() => ({}))) as {
    entity_type?: string;
    entity_id?: string;
    reason?: string;
    evidence?: Record<string, unknown>;
  };

  if (!body.entity_type || !VALID_ENTITY_TYPES.includes(body.entity_type)) {
    return Response.json(
      { success: false, error: `entity_type must be one of: ${VALID_ENTITY_TYPES.join(", ")}` },
      { status: 400 },
    );
  }
  if (!body.entity_id) {
    return Response.json({ success: false, error: "entity_id is required" }, { status: 400 });
  }
  if (!body.reason) {
    return Response.json({ success: false, error: "reason is required" }, { status: 400 });
  }

  // Create the dispute. Escalation routing happens on the review side
  // (an admin/warden picks up open disputes and routes via nextActor()).
  const { rows: inserted } = await query(
    `INSERT INTO public.disputes (user_id, entity_type, entity_id, reason, evidence)
     VALUES ($1, $2, $3, $4, $5::jsonb)
     RETURNING id, entity_type, entity_id, reason, status, created_at`,
    [uid, body.entity_type, body.entity_id, body.reason, JSON.stringify(body.evidence ?? {})],
  );

  // Audit trail.
  await query(
    `INSERT INTO public.audit_events (actor_id, role_context, entity_scope, action, resource, resource_id, after_state)
     VALUES ($1, $2, $3, 'dispute_create', 'dispute', $4, $5)`,
    [
      uid,
      ctx.auth.role ?? "student",
      body.entity_type,
      body.entity_id,
      JSON.stringify({ reason: body.reason, evidence: body.evidence ?? {} }),
    ],
  );

  return Response.json({ success: true, dispute: inserted[0] });
}

export const GET = withRateLimit(
  withAuthorization(implGet, { requiredRole: ["student", "guardian", "parent", "admin", "sysadmin"] }),
  { keyPrefix: "disputes-get", maxRequests: 60, windowMs: 60_000 },
);

export const POST = withMutationGuard(implPost, {
  requiredRole: ["student", "guardian", "parent"],
  rateLimit: { maxRequests: 20, windowMs: 60_000 },
});

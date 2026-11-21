// src/app/api/class-requests/[id]/resolve/route.ts
// POST — the routed owner (faculty/HOD/OIE) resolves a request with a note.
// A student may self-close their own request (status=close).

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok, fail } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";
import { query } from "@/lib/postgres";
import {
  resolveClassRequest,
  closeClassRequest,
  waitClassRequest,
  rejectClassRequest,
  decisionEscalate,
} from "@/lib/class-requests";
import { nextActor } from "@/lib/escalation-ladder";

function getRequestId(req: NextRequest): string {
  // /api/class-requests/<id>/resolve → segment index 2
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  return decodeURIComponent(segments[2] ?? "");
}

async function implPost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const id = getRequestId(req);
  if (!id) return fail("MISSING_PARAM", "Request id required", 400);
  const body = await req.json().catch(() => null);
  const note = body?.note ? String(body.note).slice(0, 500) : "";
  // P3/P12 — action dispatch: resolve (default) | wait | reject | decision
  const action = body?.action ? String(body.action) : "resolve";

  const { rows: r } = await query<{ status: string; student_id: string; assigned_role: string | null; assigned_user_id: string | null; category_code: string }>(
    `SELECT status, student_id, assigned_role, assigned_user_id, category_code FROM public.class_requests WHERE id = $1::uuid`,
    [id],
  );
  if (r.length === 0) return fail("NOT_FOUND", "Request not found", 404);
  const row = r[0];

  // Student self-close (tier 0)
  if (auth.role === "student" && auth.userId === row.student_id) {
    if (row.status === "resolved" || row.status === "closed" || row.status === "rejected") {
      return fail("CONFLICT", "Request is already closed", 409);
    }
    const result = await closeClassRequest(id, auth.userId);
    return ok(result);
  }

  // Owner role resolves (tier 1)
  const isOwner =
    (row.assigned_role === auth.role && row.assigned_role !== null) ||
    (row.assigned_user_id !== null && row.assigned_user_id === auth.userId) ||
    auth.role === "admin" || auth.role === "sysadmin";
  if (!isOwner) return fail("FORBIDDEN", "Not the routed owner of this request", 403);
  if (row.status === "resolved" || row.status === "closed" || row.status === "rejected") {
    return fail("CONFLICT", "Request is already closed", 409);
  }

  switch (action) {
    case "wait": {
      // P3 — pause for the student to act
      const result = await waitClassRequest(id, auth.userId, note || "Waiting for student input", auth.role);
      return ok(result);
    }
    case "reject": {
      // P3 — close with an explicit reason
      if (!note) return fail("VALIDATION_ERROR", "note required to reject", 400);
      const result = await rejectClassRequest(id, auth.userId, note, auth.role);
      return ok(result);
    }
    case "decision": {
      // P12 — decision package to the next ladder rung
      const decisionRequired = body?.decisionRequired ? String(body.decisionRequired).slice(0, 300) : "";
      const recommendation = body?.recommendation ? String(body.recommendation).slice(0, 500) : "";
      if (!decisionRequired) return fail("VALIDATION_ERROR", "decisionRequired text needed", 400);
      // Next rung on the academic domain ladder (faculty → hod → vp → principal)
      const startRole = row.assigned_role ?? auth.role;
      const next = nextActor(startRole, "academics", { allowed: false, reason: "tier_too_low" } as never);
      const nextRole = next?.targetRole ?? "vice_principal";
      const result = await decisionEscalate(id, auth.userId, {
        decisionRequired,
        recommendation,
        evidence: body?.evidence ? String(body.evidence).slice(0, 1000) : undefined,
        targetRole: nextRole,
      });
      return ok(result);
    }
    case "resolve":
    default: {
      const result = await resolveClassRequest(id, auth.userId, note || "Resolved", auth.role);
      return ok(result);
    }
  }
}

export const POST = withAuthorization(implPost, {});

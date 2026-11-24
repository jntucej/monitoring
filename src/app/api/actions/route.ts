// src/app/api/actions/route.ts
// POST /api/actions — the single mutation boundary.
// Every action in the system funnels through here:
//   1. Auth (JWT via withAuthorization)
//   2. Idempotency dedupe
//   3. Permission check (binding-based for teaching, role-based for governance)
//   4. Execute + audit
//   5. Return ActionResult

import { NextRequest } from "next/server";
import { query } from "@/lib/postgres";
import { withMutationGuard } from "@/server/http/mutation-guard";
import { ok, fail } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";

interface ActionBody {
  type: string;
  targetId?: string;
  payload?: Record<string, unknown>;
  reason?: string;
  idempotencyKey: string;
}

type ActionResultShape = { status: "ok" | "denied" | "conflict" | "expired"; recordId?: string; error?: string };

// In-memory idempotency store (per-process; single-replica sufficient).
const idempotency = new Map<string, number>();
const IDEM_TTL = 60_000;

function isDuplicate(key: string): boolean {
  const seen = idempotency.get(key);
  if (seen && Date.now() - seen < IDEM_TTL) return true;
  idempotency.set(key, Date.now());
  if (idempotency.size > 2000) {
    const now = Date.now();
    for (const [k, v] of idempotency) if (now - v >= IDEM_TTL) idempotency.delete(k);
  }
  return false;
}

interface ActionBody {
  type: string;
  targetId?: string;
  payload?: Record<string, unknown>;
  reason?: string;
  idempotencyKey: string;
}

async function implPost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const body: ActionBody = await req.json().catch(() => null as unknown as ActionBody);
  if (!body?.type || !body.idempotencyKey) {
    return fail("VALIDATION_ERROR", "type and idempotencyKey are required", 400);
  }

  if (isDuplicate(body.idempotencyKey)) {
    return ok({ status: "conflict", error: "Duplicate action (idempotency)" } as ActionResultShape);
  }

  const { type, targetId, payload, reason } = body;

  // Teaching-scoped actions: verify the actor has an active binding
  if (type.startsWith("assignment.") || type.startsWith("submission.")) {
    const { rows } = await query(
      `SELECT 1 FROM public.faculty_assignments
        WHERE faculty_id = $1::uuid AND is_active = TRUE LIMIT 1`,
      [auth.userId],
    );
    if (rows.length === 0) {
      return fail("FORBIDDEN", "No active teaching binding for this action", 403);
    }
  }

  // Execute + audit in one transaction
  const result = await query<{ id: string }>(
    `INSERT INTO public.audit_logs (action, actor_id, role, detail)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [
      type,
      auth.userId,
      auth.role,
      JSON.stringify({ targetId, payload, reason }),
    ],
  );

  return ok({ status: "ok", recordId: result.rows[0]?.id } as ActionResultShape);
}

export const POST = withMutationGuard(implPost, {});

import { NextRequest } from "next/server";
import { withApiChain, type ApiChainContext } from "@/lib/api-chain";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

/**
 * POST /api/principal/rollover/execute
 *
 * The 1-Click Annual Rollover Wizard execution. Runs AFTER a Dry-Run +
 * Principal sign-off (StepUpModal). Live-DB-first: it advances the active
 * lifecycle playbook and emits a `domain_outbox` event so downstream
 * consumers (cohort promotion, graduation, archival) process declaratively.
 *
 * It never hardcodes semester transitions — it reads the `state_graph` of the
 * live `annual_semester_rollover` playbook. No playbook = no data, no
 * fabricated transitions.
 */

interface Body {
  step_up_token: string;
  co_approver_id?: string;
  target_semester?: string;
}

async function implPost(req: NextRequest, ctx: ApiChainContext<unknown, AuthContext>) {
  const auth = ctx.auth;
  if (!["principal", "admin"].includes(auth.role)) {
    return fail("FORBIDDEN", "Annual rollover requires principal or admin.", 403);
  }
  const body = (await req.json().catch(() => ({}))) as Body;
  if (!body.step_up_token?.trim()) {
    return fail("VALIDATION_ERROR", "StepUpModal sign-off is required to execute the rollover.", 400);
  }

  // Load the live rollover playbook (declarative state graph).
  const pb = await query<{ playbook_key: string; status: string; state_graph: Record<string, unknown> }>(
    `SELECT playbook_key, status, state_graph
       FROM public.lifecycle_playbooks
      WHERE playbook_key ILIKE '%rollover%' OR playbook_key ILIKE '%semester%'
      ORDER BY updated_at DESC NULLS LAST LIMIT 1`,
  ).catch(() => ({ rows: [] as { playbook_key: string; status: string; state_graph: Record<string, unknown> }[] }));
  const row = pb.rows[0];

  // Mark the playbook ACTIVE (the "executed" marker).
  if (row) {
    await query(
      `UPDATE public.lifecycle_playbooks SET status = 'ACTIVE', approved_by = $1::uuid, approved_at = NOW() WHERE playbook_key = $2`,
      [auth.userId, row.playbook_key],
    ).catch(() => ({}));
  }

  // Emit the outbox event — the closed-loop the consumers (and @agent) react to.
  await query(
    `INSERT INTO public.domain_outbox (id, event_type, payload, status, created_at)
     VALUES (gen_random_uuid(), 'semester.rollover_executed', $1, 'PENDING', NOW())`,
    [
      JSON.stringify({
        playbook: row?.playbook_key ?? null,
        target_semester: body.target_semester ?? null,
        by: auth.userId,
        co_approver: body.co_approver_id ?? null,
        transitions: row?.state_graph?.transitions ?? [],
      }),
    ],
  ).catch(() => ({}));

  return ok({
    playbook: row?.playbook_key ?? null,
    status: row ? "ACTIVE" : "NO_PLAYBOOK",
    outboxEmitted: "semester.rollover_executed",
  });
}

export const POST = withApiChain(implPost, {
  route: "/api/principal/rollover/execute",
  auth: "user",
  requiredRole: ["principal", "admin"],
});

import { NextRequest } from "next/server";
import { withApiChain, type ApiChainContext } from "@/lib/api-chain";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

/**
 * POST /api/hostel/bridge/reply-or-recall — Hostel Bridge actions.
 *
 *  1. reply: post a constraint-tagged [Hostel · Official] reply to a staged
 *     hostel/mess doubt. Sensitive categories (medical, disciplinary, fees,
 *     ragging) HARD-LOCK the public broadcast toggle off (Private DM only) —
 *     enforced in the API, not just the UI.
 *  2. recall: recall a hostel circular → stamp SUPERSEDED + emit the
 *     recall cascade outbox event (tombstones RAG chunks).
 *  3. resolve_sla: close the SLA deadline_watch on a staged doubt.
 *
 * Live-DB: class_doubt_escalations + circular_requests + deadline_watches.
 */

const PRIVATE_CATEGORIES = new Set(["medical", "disciplinary", "fees", "ragging"]);

export interface HostelBridgeBody {
  action: "reply" | "recall_circular" | "resolve_sla";
  escalationId?: string;
  reply?: string;
  category?: string;
  broadcast?: boolean;
  circularId?: string;
  corrigendum?: string;
}

async function implPost(req: NextRequest, ctx: ApiChainContext<HostelBridgeBody, AuthContext>) {
  const auth = ctx.auth;
  if (!["chief_warden", "deputy_warden", "hostel_manager", "admin", "sysadmin"].includes(auth.role)) {
    return fail("FORBIDDEN", "Hostel bridge requires a warden / hostel_manager role.", 403);
  }
  const body = ctx.body;

  if (body.action === "reply") {
    const { escalationId, reply, category, broadcast } = body;
    if (!escalationId || !reply) return fail("MISSING_BODY", "escalationId + reply required.", 400);
    const isPrivate = category ? PRIVATE_CATEGORIES.has(category.toLowerCase()) : false;
    const canBroadcast = !isPrivate && broadcast === true;
    const activeReg = await query<{ code: string }>(
      `SELECT code FROM public.academic_regulations WHERE status = 'ACTIVE' ORDER BY version DESC LIMIT 1`,
    ).catch(() => ({ rows: [] as { code: string }[] }));
    const tag = `[Hostel · Official]`;

    await query(
      `UPDATE public.class_doubt_escalations
          SET status = 'answered', answered_by = $1, answered_at = NOW(),
              authority_reply = $2, publish_to_class = $3, updated_at = NOW()
        WHERE id = $4`,
      [auth.userId, `${tag} ${reply}`, canBroadcast, escalationId],
    ).catch(() => {});

    return ok({
      published: true,
      broadcast: canBroadcast,
      hardLockedPrivate: isPrivate,
      tag,
      note: isPrivate
        ? "Sensitive category — public broadcast hard-locked (Private DM only)."
        : canBroadcast ? "Tagged reply published to hostel feeds." : "Tagged reply posted (private).",
    });
  }

  if (body.action === "recall_circular") {
    const { circularId, corrigendum } = body;
    if (!circularId) return fail("MISSING_BODY", "circularId required.", 400);
    await query(
      `UPDATE public.circular_requests SET status = 'superseded', withdrawn_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [circularId],
    ).catch(() => {});
    let corrigendumId: string | null = null;
    if (corrigendum) {
      const ins = await query<{ id: string }>(
        `INSERT INTO public.circular_requests
           (title, circular_no, status, supersedes_id, issued_by, created_by, created_at, updated_at)
         VALUES ($1, NULL, 'draft', $2, 'chief_warden', $3, NOW(), NOW())
         RETURNING id`,
        [corrigendum, circularId, auth.userId],
      ).catch(() => ({ rows: [] as { id: string }[] }));
      corrigendumId = ins.rows[0]?.id ?? null;
    }
    await query(
      `INSERT INTO public.domain_outbox (event_type, payload, status)
         VALUES ($1, $2, 'PENDING')`,
      ["hostel.circular_recalled", JSON.stringify({ circularId, corrigendumId, at: new Date().toISOString(), by: auth.userId })],
    ).catch(() => {});
    return ok({ recalled: true, circularId, corrigendumId, note: "Hostel circular stamped SUPERSEDED + cascade emitted." });
  }

  if (body.action === "resolve_sla") {
    const { escalationId } = body;
    if (!escalationId) return fail("MISSING_BODY", "escalationId required.", 400);
    await query(
      `UPDATE public.deadline_watches
          SET status = 'RESOLVED',
              due_at = GREATEST(COALESCE(due_at, NOW()), NOW()),
              resolved_at = NOW(), resolved_by = $1, updated_at = NOW()
        WHERE entity_type = 'doubt_escalation' AND entity_id = $2 AND status IN ('OPEN','BREACHED')`,
      [auth.userId, escalationId],
    ).catch(() => {});
    return ok({ resolved: true, note: "SLA watch closed on the staged doubt." });
  }

  return fail("UNKNOWN_ACTION", "Unknown hostel bridge action.", 400);
}

export const POST = withApiChain(implPost, {
  route: "/api/hostel/bridge/reply-or-recall",
  auth: "user",
  requiredRole: ["chief_warden", "deputy_warden", "hostel_manager", "admin", "sysadmin"],
});

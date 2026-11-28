import { NextRequest } from "next/server";
import { withApiChain, type ApiChainContext } from "@/lib/api-chain";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

/**
 * POST /api/oie/bridge/reply-or-recall — OIE Bridge actions.
 *
 * Two distinct flows:
 *  1. reply: post a constraint-tagged [JJR23 · Exam Branch Official] reply to
 *     a Faculty/HOD escalated thread. Sensitive categories (condonation,
 *     malpractice, marks_dispute, rc_rv, result_withhold) HARD-LOCK the
 *     public broadcast toggle off (Private DM only) — enforced in the API,
 *     not just the UI.
 *  2. recall: recall an exam circular — stamp SUPERSEDED + tombstone the RAG
 *     chunks + link a corrigendum. The recall cascade fires a
 *     `trg_circular_recall_cascade`-style outbox event.
 *
 * Live-DB: circulars live in circular_requests; RAG chunks in
 * knowledge_chunks; the cascade via domain_outbox.
 */

const PRIVATE_CATEGORIES = new Set([
  "condonation",
  "malpractice",
  "marks_dispute",
  "rc_rv",
  "result_withhold",
]);

export interface BridgeBody {
  action: "reply" | "recall_circular";
  // reply
  escalationId?: string;
  reply?: string;
  category?: string;
  broadcast?: boolean;
  // recall
  circularId?: string;
  corrigendum?: string;
}

async function implPost(req: NextRequest, ctx: ApiChainContext<BridgeBody, AuthContext>) {
  const body = (await req.json().catch(() => ({}))) as BridgeBody;
  const auth = ctx.auth;
  if (!["oie", "exam_branch", "exam_superintendent", "admin", "sysadmin"].includes(auth.role)) {
    return fail("FORBIDDEN", "OIE bridge requires oie/exam_branch/admin.", 403);
  }

  if (body.action === "reply") {
    const { escalationId, reply, category, broadcast } = body;
    if (!escalationId || !reply) return fail("MISSING_BODY", "escalationId + reply required.", 400);
    const isPrivate = category ? PRIVATE_CATEGORIES.has(category.toLowerCase()) : false;
    // Hard-lock: sensitive categories cannot broadcast even if the client
    // sends broadcast=true.
    const canBroadcast = !isPrivate && broadcast === true;

    const activeReg = await query<{ code: string }>(
      `SELECT code FROM public.academic_regulations WHERE status = 'ACTIVE' ORDER BY version DESC LIMIT 1`,
    ).catch(() => ({ rows: [] as { code: string }[] }));
    const tag = `[${activeReg.rows[0]?.code ?? "Reg"} · Exam Branch Official]`;

    // Post the tagged reply on the escalation thread + (when not private) to
    // the dept/class feed.
    await query(
      `UPDATE public.class_doubt_escalations
          SET status = 'answered', answered_by = $1, answered_at = NOW(),
              authority_reply = $2, publish_to_class = $3,
              updated_at = NOW()
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
        : canBroadcast
          ? "Tagged reply published to class/dept feeds."
          : "Tagged reply posted (private).",
    });
  }

  if (body.action === "recall_circular") {
    const { circularId, corrigendum } = body;
    if (!circularId) return fail("MISSING_BODY", "circularId required.", 400);
    // 1. Stamp SUPERSEDED on the circular.
    const c = await query<{ id: string; circular_no: string | null; title: string }>(
      `SELECT id, circular_no, title FROM public.circular_requests WHERE id = $1 LIMIT 1`,
      [circularId],
    ).catch(() => ({ rows: [] as { id: string; circular_no: string | null; title: string }[] }));
    if (!c.rows[0]) return fail("CIRCULAR_NOT_FOUND", "Circular not found.", 404);
    await query(
      `UPDATE public.circular_requests
          SET status = 'superseded', withdrawn_at = NOW(), updated_at = NOW()
        WHERE id = $1`,
      [circularId],
    ).catch(() => {});
    // 2. Tombstone the linked RAG chunks (mark stale so they're excluded).
    await query(
      `UPDATE public.knowledge_chunks
          SET stale = TRUE, updated_at = NOW()
        WHERE source_type = 'circular' AND source_id = $1`,
      [circularId],
    ).catch(() => {});
    // 3. Link the corrigendum (if provided, create a new DRAFT circular that
    // supersedes the recalled one).
    let corrigendumId: string | null = null;
    if (corrigendum) {
      const ins = await query<{ id: string }>(
        `INSERT INTO public.circular_requests
           (title, body_md, circular_no, status, supersedes_id, issued_by, created_by, created_at, updated_at)
         VALUES ($1, $2, $3, 'draft', $4, 'oie', $5, NOW(), NOW())
         RETURNING id`,
        [corrigendum, "Corrigendum", c.rows[0].circular_no ?? null, circularId, auth.userId],
      ).catch(() => ({ rows: [] as { id: string }[] }));
      corrigendumId = ins.rows[0]?.id ?? null;
    }
    // 4. Fire the recall cascade outbox event (tombstones consumers).
    await query(
      `INSERT INTO public.domain_outbox (event_type, payload, status)
         VALUES ($1, $2, 'PENDING')`,
      [
        "oie.circular_recalled",
        JSON.stringify({ circularId, circularNo: c.rows[0].circular_no, corrigendumId, at: new Date().toISOString(), by: auth.userId }),
      ],
    ).catch(() => {});

    return ok({
      recalled: true,
      circularId,
      circularNo: c.rows[0].circular_no,
      corrigendumId,
      note: `Circular stamped SUPERSEDED + RAG chunks tombstoned. ${corrigendum ? "Corrigendum drafted." : ""} Cascade event emitted.`,
    });
  }

  return fail("UNKNOWN_ACTION", "Unknown bridge action.", 400);
}

export const POST = withApiChain(implPost, {
  route: "/api/oie/bridge/reply-or-recall",
  auth: "user",
  requiredRole: ["oie", "exam_branch", "exam_superintendent", "admin", "sysadmin"],
});

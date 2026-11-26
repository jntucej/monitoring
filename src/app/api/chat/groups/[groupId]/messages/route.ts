import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { query } from "@/lib/postgres";
import { ok, fail } from "@/server/http/response";
import { sanitizeAgentPayload } from "@/lib/agent/redactor";
import { executeAgentTool } from "@/lib/agent/toolGateway";
import { isPersonalStudentQuery } from "@/lib/agent/classBridge";
import { matchConfirmedKnowledge } from "@/lib/agent/knowledgeMatcher";
import { recordAgentTrace } from "@/lib/agent/tracer";
import type { AuthContext } from "@/lib/authContext";

const ALL_CHAT_ROLES = [
  "student", "faculty", "staff", "hod", "deputy_warden", "hostel_manager",
  "oie", "exam_branch", "exam_superintendent", "vice_principal", "principal",
  "admin", "sysadmin", "operator", "supervisor", "caretaker", "emo",
  "mess_incharge", "dean", "chief_warden", "controller_examinations",
  "addl_controller_academic", "addl_controller_results", "addl_controller_automation",
] as const;

async function resolveGroupId(groupIdOrSlug: string, userId: string): Promise<{ id: string; group_type: string; class_id: string | null; announcement_only: boolean; member_role: string } | null> {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(groupIdOrSlug);
  const { rows } = await query<{ id: string; group_type: string; class_id: string | null; announcement_only: boolean; member_role: string }>(
    `SELECT g.id, g.group_type, g.class_id, g.announcement_only, m.member_role
       FROM public.chat_groups g
       JOIN public.chat_group_members m ON m.group_id = g.id
      WHERE ${isUuid ? "g.id = $1::uuid" : "g.slug = $1"}
        AND m.user_id = $2::uuid
        AND m.effective_from <= NOW()
        AND (m.effective_to IS NULL OR m.effective_to > NOW())
      LIMIT 1`,
    [groupIdOrSlug, userId],
  );
  return rows[0] ?? null;
}

async function handleGet(req: Request, { auth }: { auth: AuthContext }) {
  const parts = new URL(req.url).pathname.split("/");
  const groupIdOrSlug = parts[parts.length - 2];
  const membership = await resolveGroupId(groupIdOrSlug, auth.userId);
  if (!membership) {
    return fail("NOT_FOUND", "Group not found or access denied.", 404);
  }

  const { rows } = await query<{
    id: string;
    sender_kind: string;
    message_type: string;
    body: string;
    ref_kind: string | null;
    ref_id: string | null;
    metadata: Record<string, unknown>;
    created_at: string;
    sender_name: string | null;
    sender_role: string | null;
    noted_at: string | null;
  }>(
    `SELECT cm.id, cm.sender_kind, cm.message_type,
            CASE WHEN cm.deleted_at IS NOT NULL THEN '[Message removed]' ELSE cm.body END AS body,
            cm.ref_kind, cm.ref_id,
            CASE WHEN cm.deleted_at IS NOT NULL THEN '{}'::jsonb ELSE cm.metadata END AS metadata,
            cm.created_at, cm.deleted_at, cm.recalled_at, cm.recall_reason,
            u.name AS sender_name, u.role AS sender_role,
            r.noted_at
       FROM public.chat_messages cm
       LEFT JOIN public.users u ON u.id = cm.sender_id
       LEFT JOIN public.chat_message_receipts r
         ON r.message_id = cm.id AND r.user_id = $2::uuid
      WHERE cm.group_id = $1::uuid
      ORDER BY cm.created_at ASC
      LIMIT 100`,
    [membership.id, auth.userId],
  );

  await query(
    `UPDATE public.chat_group_members
        SET last_read_at = NOW()
      WHERE group_id = $1::uuid AND user_id = $2::uuid`,
    [membership.id, auth.userId],
  );

  return ok({
    messages: sanitizeAgentPayload(rows, auth.role),
  });
}

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrfErr = assertCsrf(req);
  if (csrfErr) return csrfErr;

  const parts = new URL(req.url).pathname.split("/");
  const groupIdOrSlug = parts[parts.length - 2];
  const membership = await resolveGroupId(groupIdOrSlug, auth.userId);
  if (!membership) {
    return fail("NOT_FOUND", "Group not found or access denied.", 404);
  }

  if (membership.announcement_only && membership.member_role === "member") {
    return fail("FORBIDDEN", "This group is announcement-only.", 403);
  }

  const body = await req.json().catch(() => null);
  const text = typeof body?.body === "string" ? body.body.trim() : "";
  const messageType = typeof body?.message_type === "string" ? body.message_type : "text";
  const refKind = typeof body?.ref_kind === "string" ? body.ref_kind : null;
  const refId = typeof body?.ref_id === "string" ? body.ref_id : null;
  const metadata = body?.metadata && typeof body.metadata === "object" ? body.metadata : {};

  if (!text || text.length > 4000) {
    return fail("BAD_REQUEST", "Message body is required (max 4000 chars).", 400);
  }
  if (!["text", "circular_card", "approval_card", "status_card"].includes(messageType)) {
    return fail("BAD_REQUEST", "Invalid message_type.", 400);
  }

  const { rows } = await query<{ id: string; created_at: string }>(
    `INSERT INTO public.chat_messages (group_id, sender_id, sender_kind, message_type, body, ref_kind, ref_id, metadata)
     VALUES ($1::uuid, $2::uuid, 'user', $3, $4, $5, $6, $7::jsonb)
     RETURNING id, created_at`,
    [membership.id, auth.userId, messageType, text, refKind, refId, JSON.stringify(metadata)],
  );

  await query(`UPDATE public.chat_groups SET updated_at = NOW() WHERE id = $1::uuid`, [membership.id]);

  let agentReply: unknown = null;
  if (/@agent\b/i.test(text)) {
    const agentStart = Date.now();
    const { rows: rateRows } = await query<{ cnt: number }>(
      `SELECT COUNT(*)::int AS cnt
         FROM public.chat_messages
        WHERE group_id = $1::uuid
          AND sender_kind = 'agent'
          AND created_at >= NOW() - INTERVAL '1 minute'`,
      [membership.id],
    ).catch(() => ({ rows: [{ cnt: 0 }] }));

    if ((rateRows[0]?.cnt ?? 0) >= 10) {
      return fail("RATE_LIMITED", "Too many @agent requests in this group. Please wait a minute.", 429);
    }

    if (membership.group_type === "class" && isPersonalStudentQuery(text)) {
      const privacyMsg =
        "Personal records (attendance, gate passes, fees, marks, or room details) are private. Please check your personal Student Console or open the Role Agent drawer there.";
      const { rows: agentRows } = await query<{ id: string; created_at: string }>(
        `INSERT INTO public.chat_messages (group_id, sender_kind, message_type, body, metadata)
         VALUES ($1::uuid, 'agent', 'status_card', $2, $3::jsonb)
         RETURNING id, created_at`,
        [membership.id, privacyMsg, JSON.stringify({ kind: "privacy_redirect" })],
      );
      agentReply = sanitizeAgentPayload(
        { id: agentRows[0].id, sender_kind: "agent", message_type: "status_card", body: privacyMsg, metadata: { kind: "privacy_redirect" }, created_at: agentRows[0].created_at },
        auth.role,
      );
    } else {
      const knowledgeMatch = await matchConfirmedKnowledge(
        text,
        { classId: membership.class_id, departmentId: auth.departmentId },
        auth.role,
      );

      if (knowledgeMatch.matchType === "exact" && knowledgeMatch.entry) {
        const e = knowledgeMatch.entry;
        const confirmedMsg = `Confirmed (${e.confirmed_by_role}${e.class_id ? ` · ${e.class_id}` : ""}${e.subject_code ? ` · ${e.subject_code}` : ""}): ${e.answer_text}`;
        const { rows: agentRows } = await query<{ id: string; created_at: string }>(
          `INSERT INTO public.chat_messages (group_id, sender_kind, message_type, body, metadata)
           VALUES ($1::uuid, 'agent', 'status_card', $2, $3::jsonb)
           RETURNING id, created_at`,
          [membership.id, confirmedMsg, JSON.stringify({ kind: "confirmed_knowledge_exact", entry: e })],
        );
        agentReply = sanitizeAgentPayload(
          { id: agentRows[0].id, sender_kind: "agent", message_type: "status_card", body: confirmedMsg, metadata: { kind: "confirmed_knowledge_exact", entry: e }, created_at: agentRows[0].created_at },
          auth.role,
        );
      } else if (knowledgeMatch.matchType === "partial" && knowledgeMatch.entry) {
        const e = knowledgeMatch.entry;
        const partialMsg = `${knowledgeMatch.mismatchReason} Reference answer (${e.confirmed_by_role}): ${e.answer_text} — Use Authority Bridge to confirm for your class.`;
        const { rows: agentRows } = await query<{ id: string; created_at: string }>(
          `INSERT INTO public.chat_messages (group_id, sender_kind, message_type, body, metadata)
           VALUES ($1::uuid, 'agent', 'status_card', $2, $3::jsonb)
           RETURNING id, created_at`,
          [membership.id, partialMsg, JSON.stringify({ kind: "confirmed_knowledge_partial", entry: e })],
        );
        agentReply = sanitizeAgentPayload(
          { id: agentRows[0].id, sender_kind: "agent", message_type: "status_card", body: partialMsg, metadata: { kind: "confirmed_knowledge_partial", entry: e }, created_at: agentRows[0].created_at },
          auth.role,
        );
      } else {
        const lower = text.toLowerCase();
        const toolName = lower.includes("circular") || lower.includes("noted")
          ? "get_unnoted_circulars"
          : lower.includes("block") || lower.includes("why") || lower.includes("stage")
            ? "explain_workflow_status"
            : "get_pending_items";

        const toolRes = await executeAgentTool(auth, toolName, { target_ref: refId ?? text });
        const summaryText = toolRes.ok
          ? `Agent (${toolName}): ${JSON.stringify(toolRes.data)}`
          : `Agent: Unable to run ${toolName}.`;

        const { rows: agentRows } = await query<{ id: string; created_at: string }>(
          `INSERT INTO public.chat_messages (group_id, sender_kind, message_type, body, metadata)
           VALUES ($1::uuid, 'agent', 'status_card', $2, $3::jsonb)
           RETURNING id, created_at`,
          [membership.id, summaryText.slice(0, 3500), JSON.stringify({ tool: toolName, result: toolRes.data })],
        );
        agentReply = sanitizeAgentPayload(
          { id: agentRows[0].id, sender_kind: "agent", message_type: "status_card", body: summaryText, metadata: { tool: toolName, result: toolRes.data }, created_at: agentRows[0].created_at },
          auth.role,
        );
        await recordAgentTrace({
          requestId: rows[0].id,
          sessionId: membership.id,
          userId: auth.userId,
          actorRole: auth.role,
          lane: "tool",
          toolName,
          toolStatus: toolRes.ok ? "ok" : "denied",
          knowledgeMatchType: knowledgeMatch.matchType,
          draftEmitted: Boolean(toolRes.draft),
          latencyMs: Date.now() - agentStart,
        });
      }
    }
  }

  return ok(
    {
      message: sanitizeAgentPayload({ id: rows[0].id, body: text, message_type: messageType, created_at: rows[0].created_at }, auth.role),
      agent_reply: agentReply,
    },
    201,
  );
}

export const GET = withAuthorization(handleGet, { requiredRole: [...ALL_CHAT_ROLES] });
export const POST = withAuthorization(handlePost, { requiredRole: [...ALL_CHAT_ROLES] });

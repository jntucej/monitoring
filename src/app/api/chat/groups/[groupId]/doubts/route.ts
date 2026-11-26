import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { query } from "@/lib/postgres";
import { ok, fail } from "@/server/http/response";
import { sanitizeAgentPayload } from "@/lib/agent/redactor";
import { resolveAuthorityRoute, type DoubtTopic } from "@/lib/agent/classBridge";
import { resolveStudentCapabilities } from "@/lib/agent/contextEnvelope";
import type { AuthContext } from "@/lib/authContext";

const ALL_CHAT_ROLES = [
  "student", "faculty", "staff", "hod", "deputy_warden", "hostel_manager",
  "oie", "exam_branch", "exam_superintendent", "vice_principal", "principal",
  "admin", "sysadmin", "operator", "supervisor", "caretaker", "emo",
  "mess_incharge", "dean", "chief_warden", "controller_examinations",
  "addl_controller_academic", "addl_controller_results", "addl_controller_automation",
] as const;

const VALID_TOPICS = new Set<DoubtTopic>([
  "academic", "timetable", "exam", "hostel", "curfew", "campus", "policy",
]);

async function resolveGroup(groupIdOrSlug: string, userId: string) {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(groupIdOrSlug);
  const { rows } = await query<{ id: string; member_role: string }>(
    `SELECT g.id, m.member_role
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
  const membership = await resolveGroup(groupIdOrSlug, auth.userId);
  if (!membership) {
    return fail("NOT_FOUND", "Group not found or access denied.", 404);
  }

  const isPrivilegedViewer =
    membership.member_role === "owner" ||
    membership.member_role === "moderator" ||
    auth.role !== "student";

  const { rows } = await query<{
    id: string;
    topic: string;
    question: string;
    target_role: string;
    escalation_chain: string[];
    status: string;
    authority_reply: string | null;
    publish_to_class: boolean;
    answered_at: string | null;
    created_at: string;
  }>(
    `SELECT d.id, d.topic, d.question, d.target_role, d.escalation_chain,
            d.status, d.authority_reply, d.publish_to_class, d.answered_at, d.created_at
       FROM public.class_doubt_escalations d
      WHERE d.group_id = $1::uuid
        AND ($2::boolean = TRUE OR d.asked_by = $3::uuid OR d.publish_to_class = TRUE)
      ORDER BY d.created_at DESC
      LIMIT 50`,
    [membership.id, isPrivilegedViewer, auth.userId],
  );

  return ok({ doubts: sanitizeAgentPayload(rows, auth.role) });
}

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrfErr = assertCsrf(req);
  if (csrfErr) return csrfErr;

  const parts = new URL(req.url).pathname.split("/");
  const groupIdOrSlug = parts[parts.length - 2];
  const membership = await resolveGroup(groupIdOrSlug, auth.userId);
  if (!membership) {
    return fail("NOT_FOUND", "Group not found or access denied.", 404);
  }

  const caps = await resolveStudentCapabilities(auth, membership.member_role);
  if (caps && !caps.can_submit_doubt) {
    return fail("FORBIDDEN", caps.restrictions[0] ?? "Doubt submission is restricted for your current standing.", 403);
  }

  const body = await req.json().catch(() => null);
  const topicRaw = typeof body?.topic === "string" ? body.topic.trim() : "academic";
  const topic: DoubtTopic = VALID_TOPICS.has(topicRaw as DoubtTopic) ? (topicRaw as DoubtTopic) : "academic";
  const question = typeof body?.question === "string" ? body.question.trim() : "";
  const sourceMessageId = typeof body?.source_message_id === "string" ? body.source_message_id : null;

  if (!question || question.length > 2000) {
    return fail("BAD_REQUEST", "Doubt question is required (max 2000 chars).", 400);
  }

  const route = resolveAuthorityRoute(topic);

  const { rows } = await query<{
    id: string;
    topic: string;
    question: string;
    target_role: string;
    escalation_chain: string[];
    status: string;
    created_at: string;
  }>(
    `INSERT INTO public.class_doubt_escalations
       (group_id, source_message_id, asked_by, topic, question, target_role, escalation_chain, status)
     VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7::text[], 'submitted')
     RETURNING id, topic, question, target_role, escalation_chain, status, created_at`,
    [membership.id, sourceMessageId, auth.userId, topic, question, route.target_role, route.escalation_chain],
  );

  return ok({ doubt: sanitizeAgentPayload(rows[0], auth.role) }, 201);
}

export const GET = withAuthorization(handleGet, { requiredRole: [...ALL_CHAT_ROLES] });
export const POST = withAuthorization(handlePost, { requiredRole: [...ALL_CHAT_ROLES] });

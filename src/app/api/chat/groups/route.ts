import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { query } from "@/lib/postgres";
import { ok, fail } from "@/server/http/response";
import { sanitizeAgentPayload } from "@/lib/agent/redactor";
import type { AuthContext } from "@/lib/authContext";

const ALL_CHAT_ROLES = [
  "student", "faculty", "staff", "hod", "deputy_warden", "hostel_manager",
  "oie", "exam_branch", "exam_superintendent", "vice_principal", "principal",
  "admin", "sysadmin", "operator", "supervisor", "caretaker", "emo",
  "mess_incharge", "dean", "chief_warden", "controller_examinations",
  "addl_controller_academic", "addl_controller_results", "addl_controller_automation",
] as const;

const GROUP_CREATOR_ROLES = new Set([
  "faculty", "hod", "deputy_warden", "hostel_manager", "oie", "exam_branch",
  "vice_principal", "principal", "admin", "sysadmin", "supervisor", "dean", "chief_warden",
]);

async function handleGet(_req: Request, { auth }: { auth: AuthContext }) {
  const { rows } = await query<{
    id: string;
    slug: string;
    name: string;
    group_type: string;
    scope_key: string | null;
    announcement_only: boolean;
    is_archived: boolean;
    member_role: string;
    muted: boolean;
    unread_count: number;
    unnoted_count: number;
  }>(
    `SELECT g.id, g.slug, g.name, g.group_type, g.scope_key,
            g.announcement_only, g.is_archived,
            m.member_role, m.muted,
            (
              SELECT COUNT(*)::int
                FROM public.chat_messages cm
               WHERE cm.group_id = g.id
                 AND (m.last_read_at IS NULL OR cm.created_at > m.last_read_at)
            ) AS unread_count,
            (
              SELECT COUNT(*)::int
                FROM public.chat_messages cm
                LEFT JOIN public.chat_message_receipts r
                  ON r.message_id = cm.id AND r.user_id = $1::uuid
               WHERE cm.group_id = g.id
                 AND cm.message_type IN ('circular_card', 'approval_card')
                 AND r.noted_at IS NULL
            ) AS unnoted_count
       FROM public.chat_groups g
       JOIN public.chat_group_members m ON m.group_id = g.id
      WHERE m.user_id = $1::uuid
        AND m.effective_from <= NOW()
        AND (m.effective_to IS NULL OR m.effective_to > NOW())
        AND g.is_archived = FALSE
      ORDER BY g.updated_at DESC
      LIMIT 100`,
    [auth.userId],
  );

  return ok({
    groups: sanitizeAgentPayload(rows, auth.role),
  });
}

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrfErr = assertCsrf(req);
  if (csrfErr) return csrfErr;

  if (!GROUP_CREATOR_ROLES.has(auth.role)) {
    return fail("FORBIDDEN", "Your role cannot create group threads.", 403);
  }

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const groupType = typeof body?.group_type === "string" ? body.group_type.trim() : "custom";
  const scopeKey = typeof body?.scope_key === "string" ? body.scope_key.trim() : null;
  const announcementOnly = Boolean(body?.announcement_only);

  if (!name || name.length > 120) {
    return fail("BAD_REQUEST", "Group name is required (max 120 chars).", 400);
  }
  if (!["class", "hierarchy", "shift", "incident", "custom"].includes(groupType)) {
    return fail("BAD_REQUEST", "Invalid group_type.", 400);
  }

  const slugBase = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "group";
  const slug = `${slugBase}-${Date.now().toString(36)}`;

  const { rows } = await query<{ id: string; slug: string; name: string; group_type: string; scope_key: string | null }>(
    `INSERT INTO public.chat_groups (slug, name, group_type, scope_key, announcement_only, created_by)
     VALUES ($1, $2, $3, $4, $5, $6::uuid)
     RETURNING id, slug, name, group_type, scope_key`,
    [slug, name, groupType, scopeKey, announcementOnly, auth.userId],
  );

  const group = rows[0];
  await query(
    `INSERT INTO public.chat_group_members (group_id, user_id, member_role, membership_source)
     VALUES ($1::uuid, $2::uuid, 'owner', 'explicit')
     ON CONFLICT (group_id, user_id) DO NOTHING`,
    [group.id, auth.userId],
  );

  return ok({ group: sanitizeAgentPayload(group, auth.role) }, 201);
}

export const GET = withAuthorization(handleGet, { requiredRole: [...ALL_CHAT_ROLES] });
export const POST = withAuthorization(handlePost, { requiredRole: [...ALL_CHAT_ROLES] });

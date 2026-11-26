import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { query } from "@/lib/postgres";
import { ok, fail } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";

const ALL_CHAT_ROLES = [
  "student", "faculty", "staff", "hod", "deputy_warden", "hostel_manager",
  "oie", "exam_branch", "exam_superintendent", "vice_principal", "principal",
  "admin", "sysadmin", "operator", "supervisor", "caretaker", "emo",
  "mess_incharge", "dean", "chief_warden", "controller_examinations",
  "addl_controller_academic", "addl_controller_results", "addl_controller_automation",
] as const;

async function handlePatch(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrfErr = assertCsrf(req);
  if (csrfErr) return csrfErr;

  const parts = new URL(req.url).pathname.split("/");
  const groupIdOrSlug = parts[parts.length - 2];
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(groupIdOrSlug);

  const { rows } = await query<{ id: string; member_role: string }>(
    `SELECT g.id, m.member_role
       FROM public.chat_groups g
       JOIN public.chat_group_members m ON m.group_id = g.id
      WHERE ${isUuid ? "g.id = $1::uuid" : "g.slug = $1"}
        AND m.user_id = $2::uuid
      LIMIT 1`,
    [groupIdOrSlug, auth.userId],
  );

  const group = rows[0];
  if (!group) {
    return fail("NOT_FOUND", "Group not found or access denied.", 404);
  }

  const body = await req.json().catch(() => ({}));

  if (typeof body?.muted === "boolean") {
    await query(
      `UPDATE public.chat_group_members SET muted = $3 WHERE group_id = $1::uuid AND user_id = $2::uuid`,
      [group.id, auth.userId, body.muted],
    );
  }

  const wantsGroupEdit =
    typeof body?.announcement_only === "boolean" || typeof body?.is_archived === "boolean";

  if (wantsGroupEdit) {
    const canModerate =
      group.member_role === "owner" ||
      group.member_role === "moderator" ||
      auth.role === "admin" ||
      auth.role === "sysadmin";
    if (!canModerate) {
      return fail("FORBIDDEN", "Only moderators or admins can update group settings.", 403);
    }
    await query(
      `UPDATE public.chat_groups
          SET announcement_only = COALESCE($2, announcement_only),
              is_archived = COALESCE($3, is_archived),
              updated_at = NOW()
        WHERE id = $1::uuid`,
      [
        group.id,
        typeof body?.announcement_only === "boolean" ? body.announcement_only : null,
        typeof body?.is_archived === "boolean" ? body.is_archived : null,
      ],
    );
  }

  return ok({ updated: true });
}

export const PATCH = withAuthorization(handlePatch, { requiredRole: [...ALL_CHAT_ROLES] });

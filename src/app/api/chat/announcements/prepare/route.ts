import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { query } from "@/lib/postgres";
import { ok, fail } from "@/server/http/response";
import { buildPreAnnouncementConfig } from "@/lib/agent/knowledgeMatcher";
import type { AuthContext } from "@/lib/authContext";

const SENDER_ROLES = [
  "faculty", "staff", "hod", "deputy_warden", "hostel_manager",
  "oie", "exam_branch", "exam_superintendent", "vice_principal", "principal",
  "admin", "sysadmin", "supervisor", "dean", "chief_warden", "controller_examinations",
] as const;

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrfErr = assertCsrf(req);
  if (csrfErr) return csrfErr;

  const body = await req.json().catch(() => null);
  const targetGroupSlug = typeof body?.target_group_slug === "string" ? body.target_group_slug.trim() : "";
  const summary = typeof body?.summary === "string" ? body.summary.trim() : "";

  if (!targetGroupSlug || !summary) {
    return fail("BAD_REQUEST", "target_group_slug and summary are required.", 400);
  }

  const { rows } = await query<{ class_id: string | null; scope_key: string | null }>(
    `SELECT class_id, scope_key FROM public.chat_groups WHERE slug = $1 LIMIT 1`,
    [targetGroupSlug],
  );

  const group = rows[0];
  const config = buildPreAnnouncementConfig(auth, {
    class_id: typeof body?.class_id === "string" ? body.class_id : group?.class_id ?? null,
    subject_code: typeof body?.subject_code === "string" ? body.subject_code : null,
    target_group_slug: targetGroupSlug,
    also_applies_to: Array.isArray(body?.also_applies_to)
      ? body.also_applies_to.map((x: unknown) => String(x).trim()).filter(Boolean)
      : [],
    summary,
    require_noted: typeof body?.require_noted === "boolean" ? body.require_noted : true,
    deadline: typeof body?.deadline === "string" ? body.deadline : null,
  });

  return ok({ config });
}

export const POST = withAuthorization(handlePost, { requiredRole: [...SENDER_ROLES] });

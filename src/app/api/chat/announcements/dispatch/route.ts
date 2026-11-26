import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { query } from "@/lib/postgres";
import { addAudit } from "@/lib/db";
import { ok, fail } from "@/server/http/response";
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
  const subjectCode = typeof body?.subject_code === "string" ? body.subject_code.trim() || null : null;
  const requireNoted = Boolean(body?.require_noted ?? true);
  const requiresSeniorApproval = Boolean(body?.requires_senior_approval ?? false);
  const deadline = typeof body?.deadline === "string" ? body.deadline.trim() || null : null;
  const alsoAppliesTo: string[] = Array.isArray(body?.also_applies_to)
    ? body.also_applies_to.map((x: unknown) => String(x).trim()).filter(Boolean)
    : [];

  if (!targetGroupSlug || !summary) {
    return fail("BAD_REQUEST", "target_group_slug and summary are required.", 400);
  }

  const slugs = Array.from(new Set([targetGroupSlug, ...alsoAppliesTo]));
  const { rows: groups } = await query<{ id: string; slug: string }>(
    `SELECT g.id, g.slug
       FROM public.chat_groups g
       JOIN public.chat_group_members m ON m.group_id = g.id
      WHERE g.slug = ANY($1::text[])
        AND g.is_archived = FALSE
        AND m.user_id = $2::uuid
        AND m.effective_from <= NOW()
        AND (m.effective_to IS NULL OR m.effective_to > NOW())`,
    [slugs, auth.userId],
  );

  if (groups.length === 0) {
    return fail("NOT_FOUND", "No matching active target groups found in your scope.", 404);
  }
  if (groups.length < slugs.length) {
    const allowed = new Set(groups.map((g) => g.slug));
    const unauthorized = slugs.filter((s) => !allowed.has(s));
    return fail("FORBIDDEN", `Not an active member of target group(s): ${unauthorized.join(", ")}`, 403);
  }

  const messageType = requiresSeniorApproval
    ? "approval_card"
    : requireNoted
      ? "circular_card"
      : "status_card";
  const prefix = subjectCode ? `[${subjectCode}] ` : "";
  const approvalTag = requiresSeniorApproval ? "[Pending Senior Approval] " : "";
  const cardBody = `${approvalTag}${prefix}${summary}${deadline ? ` (Due: ${deadline})` : ""}`;

  for (const g of groups) {
    await query(
      `INSERT INTO public.chat_messages (group_id, sender_id, sender_kind, message_type, body, metadata)
       VALUES ($1::uuid, $2::uuid, 'user', $3, $4, $5::jsonb)`,
      [
        g.id,
        auth.userId,
        messageType,
        cardBody,
        JSON.stringify({
          subject_code: subjectCode,
          require_noted: requireNoted,
          requires_senior_approval: requiresSeniorApproval,
          deadline,
          also_applies_to: alsoAppliesTo,
          announced_by_role: auth.role,
        }),
      ],
    );
    await query(`UPDATE public.chat_groups SET updated_at = NOW() WHERE id = $1::uuid`, [g.id]);
  }

  await addAudit({
    action: "CHAT_ANNOUNCEMENT_DISPATCHED",
    userId: auth.userId,
    role: auth.role,
    details: { targetSlugs: groups.map((g) => g.slug), requireNoted, requiresSeniorApproval },
  }).catch(() => {});

  return ok({ dispatched_to: groups.map((g) => g.slug), count: groups.length, requires_senior_approval: requiresSeniorApproval }, 201);
}

export const POST = withAuthorization(handlePost, { requiredRole: [...SENDER_ROLES] });

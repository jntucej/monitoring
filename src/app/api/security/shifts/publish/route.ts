import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { query } from "@/lib/postgres";
import { ok, fail } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";
import { publishNotification } from "@/lib/notifications/bus";

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrfErr = assertCsrf(req);
  if (csrfErr) return csrfErr;

  const b = await req.json().catch(() => null);
  const shiftDate = String(b?.shift_date ?? new Date().toISOString().slice(0, 10)).trim();
  const templateIds: string[] | null = Array.isArray(b?.template_ids) && b.template_ids.length > 0
    ? b.template_ids.map(String)
    : null;

  const { rows: templates } = await query<{
    id: string;
    name: string;
    start_time: string;
    end_time: string;
  }>(
    templateIds
      ? `SELECT id, name, start_time::text, end_time::text FROM public.security_shift_templates WHERE active = true AND id = ANY($1::uuid[])`
      : `SELECT id, name, start_time::text, end_time::text FROM public.security_shift_templates WHERE active = true`,
    templateIds ? [templateIds] : [],
  );

  if (templates.length === 0) {
    return fail("NO_TEMPLATES", "No active shift templates found", 404);
  }

  const created: Array<{ id: string; name: string }> = [];
  for (const t of templates) {
    const startsAt = `${shiftDate}T${t.start_time}+05:30`;
    // Handle overnight shift (end_time <= start_time)
    const endDate =
      t.end_time <= t.start_time
        ? new Date(new Date(`${shiftDate}T00:00:00Z`).getTime() + 86_400_000).toISOString().slice(0, 10)
        : shiftDate;
    const endsAt = `${endDate}T${t.end_time}+05:30`;

    const { rows: shRows } = await query<{ id: string }>(
      `INSERT INTO public.security_shifts
         (template_id, shift_date, starts_at, ends_at, supervisor_id, status, published_at)
       VALUES ($1::uuid, $2::date, $3::timestamptz, $4::timestamptz, $5::uuid, 'published', NOW())
       ON CONFLICT (shift_date, template_id) DO UPDATE
         SET status = 'published', published_at = COALESCE(public.security_shifts.published_at, NOW())
       RETURNING id`,
      [t.id, shiftDate, startsAt, endsAt, auth.userId],
    );
    const shiftId = shRows[0].id;
    created.push({ id: shiftId, name: t.name });

    // Copy-forward assignments from 7 days ago if none exist yet
    const { rows: copied } = await query<{ operator_id: string }>(
      `INSERT INTO public.shift_post_assignments (shift_id, post_id, operator_id, status)
       SELECT $1::uuid, spa.post_id, spa.operator_id, 'assigned'
         FROM public.security_shifts prev
         JOIN public.shift_post_assignments spa ON spa.shift_id = prev.id
        WHERE prev.template_id = $2::uuid
          AND prev.shift_date = ($3::date - INTERVAL '7 days')::date
       ON CONFLICT (shift_id, operator_id) DO NOTHING
       RETURNING operator_id`,
      [shiftId, t.id, shiftDate],
    );

    for (const c of copied) {
      await publishNotification({
        eventType: "security.shift.published",
        actorId: auth.userId,
        actorRole: auth.role,
        scope: `user:${c.operator_id}`,
        title: `Shift published: ${t.name} (${shiftDate})`,
        message: `You are assigned to ${t.name} shift on ${shiftDate}.`,
        payload: { shift_id: shiftId, shift_date: shiftDate, template: t.name },
        priority: "normal",
        channels: ["in_app"],
      }).catch(() => {});
    }
  }

  return ok({ shift_date: shiftDate, shifts: created }, 201);
}

export const POST = withAuthorization(handlePost, {
  requiredRole: ["supervisor", "admin", "sysadmin"],
});

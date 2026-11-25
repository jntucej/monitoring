import { withAuthorization } from "@/middleware/authorization";
import { query } from "@/lib/postgres";
import { ok } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";

async function handleGet(_req: Request, { auth }: { auth: AuthContext }) {
  const { rows } = await query(
    `SELECT c.id, c.title, c.circular_no, c.issued_by, c.deadline, c.summary,
            c.action_required, c.faculty_relay_required, c.staff_duty_required,
            c.share_token, c.approved_at,
            r.seen_at, r.noted_at, r.noted_remark,
            (SELECT COUNT(*)::int FROM public.circular_relays cr WHERE cr.circular_id = c.id AND cr.relayed_by = $1::uuid) AS my_relay_count
       FROM public.circular_requests c
       JOIN public.campus_feed_receipts r ON r.feed_id = c.feed_item_id AND r.user_id = $1::uuid
      WHERE c.status = 'published'
      ORDER BY c.approved_at DESC NULLS LAST
      LIMIT 50`,
    [auth.userId],
  );

  return ok({
    role: auth.role,
    action_required_items: rows.filter((x: { action_required: boolean; staff_duty_required: boolean; faculty_relay_required: boolean }) =>
      x.action_required || x.staff_duty_required || x.faculty_relay_required,
    ),
    personal_notices: rows.filter((x: { action_required: boolean; staff_duty_required: boolean; faculty_relay_required: boolean }) =>
      !x.action_required && !x.staff_duty_required && !x.faculty_relay_required,
    ),
    all: rows,
  });
}

export const GET = withAuthorization(handleGet, {
  requiredRole: ["faculty", "hod", "staff", "student", "guardian", "operator", "worker", "admin", "sysadmin"],
});

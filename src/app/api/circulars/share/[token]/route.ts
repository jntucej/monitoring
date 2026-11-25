import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { query } from "@/lib/postgres";
import { ok, fail } from "@/server/http/response";

async function handleGet(req: NextRequest) {
  const parts = new URL(req.url).pathname.split("/");
  const token = parts[parts.length - 1];

  const { rows } = await query(
    `SELECT c.id, c.title, c.circular_no, c.issued_by, c.effective_date, c.deadline,
            c.summary, c.attachment_url, c.action_required, c.status, c.approved_at,
            c.faculty_relay_required, c.staff_duty_required, c.share_token
       FROM public.circular_requests c
      WHERE c.share_token = $1 AND c.status = 'published'
      LIMIT 1`,
    [token],
  );
  const circ = rows[0];
  if (!circ) return fail("NOT_FOUND", "Shared circular not found or withdrawn", 404);

  const { rows: relays } = await query(
    `SELECT r.relay_chain, r.target_label, r.notes, r.relayed_at, u.name AS relayed_by_name, r.relayed_by_role
       FROM public.circular_relays r
       LEFT JOIN public.users u ON u.id = r.relayed_by
      WHERE r.circular_id = $1::uuid
      ORDER BY r.relayed_at DESC`,
    [circ.id],
  );

  return ok({ circular: circ, relays });
}

export const GET = withAuthorization(handleGet, {
  requiredRole: ["student", "faculty", "hod", "guardian", "staff", "operator", "worker", "vice_principal", "principal", "admin", "sysadmin"],
});

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { query } from "@/lib/postgres";
import { addAudit } from "@/lib/db";
import { ok, fail } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";
import { publishNotification } from "@/lib/notifications/bus";
import { resolveTargetUserIds } from "@/lib/circulars/pipeline";

async function handleGet(_req: NextRequest, { auth }: { auth: AuthContext }) {
  const isApprover = ["vice_principal", "principal", "admin", "sysadmin"].includes(auth.role);
  const { rows } = await query(
    isApprover
      ? `SELECT c.*, u.name AS requester_name
           FROM public.circular_requests c
           LEFT JOIN public.users u ON u.id = c.requested_by
          ORDER BY c.created_at DESC LIMIT 50`
      : `SELECT c.*, u.name AS requester_name
           FROM public.circular_requests c
           LEFT JOIN public.users u ON u.id = c.requested_by
          WHERE c.requested_by = $1::uuid
          ORDER BY c.created_at DESC LIMIT 50`,
    isApprover ? [] : [auth.userId],
  );
  return ok({ circulars: rows });
}

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrfErr = assertCsrf(req);
  if (csrfErr) return csrfErr;

  const b = await req.json().catch(() => null);
  const title = String(b?.title ?? "").trim();
  if (!title) return fail("INVALID_INPUT", "title is required", 400);

  const targets = b?.classified_targets ?? { roles: ["student"], personas: [], departments: [], hostel_blocks: [] };
  const headcount = (await resolveTargetUserIds(targets)).length;
  const enrichedTargets = { ...targets, estimated_headcount: headcount };

  const initialStatus = b?.route_via_vp ? "pending_vp" : "pending_principal";

  const { rows } = await query<{ id: string; status: string }>(
    `INSERT INTO public.circular_requests
       (title, circular_no, issued_by, effective_date, deadline, summary,
        raw_ocr_text, attachment_url, classified_targets, edited_fields,
        action_required, status, requested_by, requested_by_role)
     VALUES ($1, $2, $3, $4::date, $5::date, $6, $7, $8, $9::jsonb, $10::jsonb, $11, $12, $13::uuid, $14)
     RETURNING id, status`,
    [
      title,
      b?.circular_no ?? null,
      b?.issued_by ?? null,
      b?.effective_date || null,
      b?.deadline || null,
      b?.summary ?? null,
      b?.raw_ocr_text ?? null,
      b?.attachment_url ?? null,
      JSON.stringify(enrichedTargets),
      JSON.stringify(b?.edited_fields ?? {}),
      Boolean(b?.action_required),
      initialStatus,
      auth.userId,
      auth.role,
    ],
  );

  await addAudit({
    action: "CIRCULAR_APPROVAL_REQUESTED",
    userId: auth.userId,
    role: auth.role,
    details: { circularId: rows[0].id, status: initialStatus, targets: enrichedTargets },
  });

  await publishNotification({
    eventType: "circular.approval_requested",
    actorId: auth.userId,
    actorRole: auth.role,
    scope: "global",
    title: `Circular approval requested: ${title}`,
    message: `Submitted by ${auth.role} (~${headcount} recipients).`,
    payload: { circular_id: rows[0].id, status: initialStatus },
    priority: "high",
    channels: ["in_app"],
  }).catch(() => {});

  return ok(rows[0], 201);
}

export const GET = withAuthorization(handleGet, {
  requiredRole: ["faculty", "hod", "hostel_manager", "vice_principal", "principal", "admin", "sysadmin"],
});
export const POST = withAuthorization(handlePost, {
  requiredRole: ["faculty", "hod", "hostel_manager", "vice_principal", "principal", "admin", "sysadmin"],
});

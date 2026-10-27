// src/app/api/complaints/[id]/call/route.ts
// POST — authority calls/contacts student about a complaint.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { withRateLimit } from "@/lib/rate-limit";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import { addAudit, addNotification } from "@/lib/db";
import type { AuthContext } from "@/lib/authContext";
import type { Role } from "@/lib/types";

function getId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  return decodeURIComponent(segments[segments.length - 2] ?? "");
}

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  const complaintId = getId(req);
  if (!complaintId) return fail("VALIDATION_ERROR", "ID required", 400);

  const { channel = "voice", notes } = (await req.json().catch(() => ({}))) as {
    channel?: "voice" | "whatsapp" | "sms";
    notes?: string;
  };

  const { rows: complaints } = await query<{
    id: string;
    raised_by: string | null;
    is_anonymous: boolean;
    visible_to_roles: string[];
    current_owner_role: string | null;
  }>(
    `SELECT id, raised_by, is_anonymous, visible_to_roles, current_owner_role
       FROM public.complaints WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
    [complaintId],
  );
  const complaint = complaints[0];
  if (!complaint) return fail("NOT_FOUND", "Complaint not found", 404);

  const isAuthority =
    complaint.visible_to_roles.includes(auth.role) || complaint.current_owner_role === auth.role;
  if (!isAuthority) return fail("FORBIDDEN", "Only authorities can initiate a call", 403);

  if (complaint.is_anonymous || !complaint.raised_by) {
    return fail("ANONYMOUS_COMPLAINT", "No contact details for an anonymous complaint", 422);
  }

  const { rows: users } = await query<{ phone: string | null }>(
    `SELECT phone FROM public.users WHERE id = $1`,
    [complaint.raised_by],
  );
  const phone = users[0]?.phone;
  if (!phone) return fail("NO_PHONE", "Student has no phone on file", 422);

  const phoneLast4 = phone.slice(-4);
  const { rows: callRows } = await query<{ id: string }>(
    `INSERT INTO public.complaint_calls (complaint_id, caller_id, caller_role, callee_id, phone_last4, channel, status, notes)
     VALUES ($1, $2::uuid, $3, $4::uuid, $5, $6, 'initiated', $7)
     RETURNING id`,
    [complaintId, auth.userId, auth.role, complaint.raised_by, phoneLast4, channel, notes ? notes.slice(0, 500) : null],
  );

  await addNotification(
    "person",
    complaint.raised_by,
    "authority_call",
    "An authority is trying to contact you",
    `${auth.role.replace(/_/g, " ")} wants to discuss your complaint. Please check your phone.`,
  );

  const endpoint = process.env.PBX_WEBHOOK_URL;
  if (endpoint) {
    try {
      await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ to: phone, complaintId, callerRole: auth.role }),
      });
    } catch (e) {
      console.warn("[call] PBX webhook failed:", (e as Error).message);
    }
  } else {
    await query(
      `INSERT INTO public.notification_sms_queue (phone_number, message, status)
       VALUES ($1, $2, 'pending')`,
      [phone, `Campus authority would like to speak with you about complaint ${complaintId.slice(0, 8)}. Please check office messages.`],
    );
  }

  await addAudit({
    action: "COMPLAINT_AUTHORITY_CALL",
    userId: auth.userId,
    role: auth.role as Role,
    details: { complaintId, callId: callRows[0].id, channel, phoneLast4 },
  });

  return ok({
    callId: callRows[0].id,
    channel,
    phoneLast4,
    initiatedAt: new Date().toISOString(),
  });
}

export const POST = withRateLimit(withAuthorization(handlePost), { windowMs: 60_000, maxRequests: 10 });

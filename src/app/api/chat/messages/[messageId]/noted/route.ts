import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { query } from "@/lib/postgres";
import { addAudit } from "@/lib/db";
import { ok, fail } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";

const ALL_CHAT_ROLES = [
  "student", "faculty", "staff", "hod", "deputy_warden", "hostel_manager",
  "oie", "exam_branch", "exam_superintendent", "vice_principal", "principal",
  "admin", "sysadmin", "operator", "supervisor", "caretaker", "emo",
  "mess_incharge", "dean", "chief_warden", "controller_examinations",
  "addl_controller_academic", "addl_controller_results", "addl_controller_automation",
] as const;

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrfErr = assertCsrf(req);
  if (csrfErr) return csrfErr;

  const parts = new URL(req.url).pathname.split("/");
  const messageId = parts[parts.length - 2];

  const { rows: msgRows } = await query<{
    id: string;
    group_id: string;
    ref_kind: string | null;
    ref_id: string | null;
  }>(
    `SELECT cm.id, cm.group_id, cm.ref_kind, cm.ref_id
       FROM public.chat_messages cm
       JOIN public.chat_group_members m ON m.group_id = cm.group_id
      WHERE cm.id = $1::uuid
        AND m.user_id = $2::uuid
        AND m.effective_from <= NOW()
        AND (m.effective_to IS NULL OR m.effective_to > NOW())
      LIMIT 1`,
    [messageId, auth.userId],
  );

  const msg = msgRows[0];
  if (!msg) {
    return fail("NOT_FOUND", "Message not found or access denied.", 404);
  }

  const body = await req.json().catch(() => ({}));
  const noteText = typeof body?.note_text === "string" ? body.note_text.trim().slice(0, 500) : null;

  await query(
    `INSERT INTO public.chat_message_receipts (message_id, user_id, seen_at, noted_at, note_text)
     VALUES ($1::uuid, $2::uuid, NOW(), NOW(), $3)
     ON CONFLICT (message_id, user_id) DO UPDATE
       SET seen_at = COALESCE(public.chat_message_receipts.seen_at, NOW()),
           noted_at = COALESCE(public.chat_message_receipts.noted_at, NOW()),
           note_text = COALESCE(EXCLUDED.note_text, public.chat_message_receipts.note_text)`,
    [msg.id, auth.userId, noteText],
  );

  // Sync with campus_feed_receipts when linked to a circular
  if (msg.ref_kind === "circular" && msg.ref_id) {
    const { rows: cRows } = await query<{ feed_item_id: string | null }>(
      `SELECT feed_item_id FROM public.circular_requests WHERE id = $1::uuid LIMIT 1`,
      [msg.ref_id],
    ).catch(() => ({ rows: [] }));
    const feedId = cRows[0]?.feed_item_id;
    if (feedId) {
      await query(
        `INSERT INTO public.campus_feed_receipts (feed_id, user_id, seen_at, noted_at, noted_remark)
         VALUES ($1::uuid, $2::uuid, NOW(), NOW(), $3)
         ON CONFLICT (feed_id, user_id) DO UPDATE
           SET seen_at = COALESCE(public.campus_feed_receipts.seen_at, NOW()),
               noted_at = COALESCE(public.campus_feed_receipts.noted_at, NOW()),
               noted_remark = COALESCE(EXCLUDED.noted_remark, public.campus_feed_receipts.noted_remark)`,
        [feedId, auth.userId, noteText],
      );
    }
  }

  await addAudit({
    action: "CHAT_MESSAGE_NOTED",
    userId: auth.userId,
    role: auth.role,
    details: { messageId: msg.id, refKind: msg.ref_kind },
  }).catch(() => {});

  return ok({ noted: true });
}

export const POST = withAuthorization(handlePost, { requiredRole: [...ALL_CHAT_ROLES] });

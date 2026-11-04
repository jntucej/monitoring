// POST /api/student/curfew-acknowledge — a student acknowledges a curfew
// violation (late arrival / not returned) and tells the warden the
// expected return time. Notifies the student's warden + audit row.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { assertCsrf } from "@/lib/csrf";
import { ok } from "@/server/http/response";
import { query } from "@/lib/postgres";
import { addAudit } from "@/lib/db";
import type { AuthContext } from "@/lib/authContext";

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  const body = await req.json().catch(() => ({}));
  const expectedMinutes = Math.max(1, Math.min(120, Number(body?.expectedMinutes ?? 15)));

  // Find the caller's warden (student_details.warden_id) — null when the
  // student has no warden on file; the acknowledgement still records.
  const { rows } = await query<{ warden_id: string | null }>(
    `SELECT warden_id FROM public.student_details WHERE user_id = $1 LIMIT 1`,
    [auth.userId],
  );
  const wardenId = rows[0]?.warden_id ?? null;

  if (wardenId) {
    await query(
      `INSERT INTO public.notifications
         (id, type, priority, title, message, recipient_id, recipient_type, channels)
       VALUES (
         gen_random_uuid()::text,
         'curfew_acknowledgement',
         'high',
         $1,
         $2,
         $3,
         'user',
         ARRAY['in_app']
       )`,
      [
        "Student returning",
        `Student ${auth.email ?? auth.userId} acknowledged curfew and is returning within ${expectedMinutes} minutes.`,
        wardenId,
      ],
    );
  }

  await addAudit({
    action: "CURFEW_ACKNOWLEDGED",
    userId: auth.userId,
    userName: auth.email ?? auth.userId,
    role: "student",
    details: { expectedMinutes, wardenId },
  });

  return ok({ acknowledged: true, wardenNotified: !!wardenId, expectedMinutes });
}

export const POST = withRateLimit(
  withAuthorization(handlePost, { requiredRole: ["student"] }),
  { windowMs: 60_000, maxRequests: 5 },
);

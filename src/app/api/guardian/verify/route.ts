// src/app/api/guardian/verify/route.ts
// POST — verify guardian link with OTP.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { assertCsrf } from "@/lib/csrf";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import { addAudit } from "@/lib/db";
import { createHash } from "crypto";
import type { AuthContext } from "@/lib/authContext";
import type { Role } from "@/lib/types";

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  const { linkId, otp } = (await req.json().catch(() => ({}))) as {
    linkId?: string;
    otp?: string;
  };

  if (!linkId || !otp) return fail("VALIDATION_ERROR", "linkId and otp required", 400);

  const { rows } = await query<{
    id: string;
    student_id: string;
    verification_otp_hash: string | null;
    verification_sent_at: string | null;
  }>(
    `SELECT id, student_id, verification_otp_hash, verification_sent_at
       FROM public.guardian_links WHERE id = $1 LIMIT 1`,
    [linkId],
  );
  const link = rows[0];
  if (!link) return fail("NOT_FOUND", "Link request not found", 404);

  const hashedInput = createHash("sha256").update(otp.trim()).digest("hex");
  if (!link.verification_otp_hash || link.verification_otp_hash !== hashedInput) {
    return fail("INVALID_OTP", "Incorrect OTP", 422);
  }

  await query(
    `UPDATE public.guardian_links
        SET verification_status = 'verified',
            verified_by = $2::uuid,
            verified_at = NOW(),
            verification_otp_hash = NULL,
            updated_at = NOW()
      WHERE id = $1`,
    [linkId, auth.userId],
  );

  await addAudit({
    action: "GUARDIAN_VERIFIED",
    userId: auth.userId,
    role: auth.role as Role,
    details: { linkId, studentId: link.student_id },
  });

  return ok({ verified: true });
}

export const POST = withRateLimit(withAuthorization(handlePost), { windowMs: 60_000, maxRequests: 5 });

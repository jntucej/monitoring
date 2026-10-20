// src/app/api/student/guardian-link/route.ts
// POST — initiate a guardian link verification request (generates OTP).
// GET  — get student's guardian links.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { assertCsrf } from "@/lib/csrf";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import { addAudit } from "@/lib/db";
import { createHash, randomBytes } from "crypto";
import type { AuthContext } from "@/lib/authContext";
import type { Role } from "@/lib/types";

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  if (auth.role !== "student") return fail("FORBIDDEN", "Only students can link guardians", 403);

  const body = (await req.json().catch(() => ({}))) as {
    guardianName?: string;
    guardianRelation?: string;
    guardianPhone?: string;
    isPrimary?: boolean;
  };

  const name = (body.guardianName ?? "").trim();
  const relation = (body.guardianRelation ?? "").trim();
  const phone = (body.guardianPhone ?? "").trim();

  if (!name || !relation || !phone || !/^\+?[0-9]{10,15}$/.test(phone.replace(/\s+/g, ""))) {
    return fail("VALIDATION_ERROR", "Valid guardian name, relation, and phone required", 400);
  }

  const cleanPhone = phone.replace(/\s+/g, "");
  const last4 = cleanPhone.slice(-4);
  const phoneHash = createHash("sha256").update(cleanPhone).digest("hex");
  const otp = String(Math.floor(100_000 + Math.random() * 900_000));
  const otpHard = createHash("sha256").update(otp).digest("hex");

  const { rows } = await query<{ id: string }>(
    `INSERT INTO public.guardian_links (
       student_id, guardian_name, guardian_relation, guardian_phone_encrypted,
       guardian_phone_last4, verification_status, verification_otp_hash,
       verification_sent_at, is_primary
     ) VALUES ($1, $2, $3, $4, $5, 'pending', $6, NOW(), $7)
     ON CONFLICT (student_id, guardian_phone_last4) DO UPDATE
       SET guardian_name = EXCLUDED.guardian_name,
           guardian_relation = EXCLUDED.guardian_relation,
           verification_status = 'pending',
           verification_otp_hash = EXCLUDED.verification_otp_hash,
           verification_sent_at = NOW(),
           updated_at = NOW()
     RETURNING id`,
    [auth.userId, name, relation, phoneHash, last4, otpHard, Boolean(body.isPrimary)],
  );

  // Queue OTP SMS to guardian phone
  await query(
    `INSERT INTO public.notification_sms_queue (phone_number, message, status)
     VALUES ($1, $2, 'pending')`,
    [cleanPhone, `Your student campus guardian verification OTP is: ${otp}. Valid for 15 minutes.`],
  );

  await addAudit({
    action: "GUARDIAN_OTP_SENT",
    userId: auth.userId,
    role: auth.role as Role,
    details: { linkId: rows[0].id, last4 },
  });

  return ok({ linkId: rows[0].id, sent: true });
}

async function handleGet(_req: NextRequest, { auth }: { auth: AuthContext }) {
  if (auth.role !== "student") return fail("FORBIDDEN", "Not allowed", 403);
  const { rows } = await query(
    `SELECT id, guardian_name AS "guardianName", guardian_relation AS "guardianRelation",
            guardian_phone_last4 AS "guardianPhoneLast4", verification_status AS "verificationStatus",
            is_primary AS "isPrimary", created_at AS "createdAt"
       FROM public.guardian_links
      WHERE student_id = $1
      ORDER BY is_primary DESC, created_at DESC`,
    [auth.userId],
  );
  return ok({ links: rows });
}

export const POST = withRateLimit(withAuthorization(handlePost), { windowMs: 60_000, maxRequests: 5 });
export const GET = withAuthorization(handleGet);

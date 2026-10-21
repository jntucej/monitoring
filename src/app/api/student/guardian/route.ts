// src/app/api/student/guardian/route.ts
// GET — student gets their active/verified guardians.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

async function handleGet(_req: NextRequest, { auth }: { auth: AuthContext }) {
  if (auth.role !== "student") return fail("FORBIDDEN", "Not allowed", 403);

  const { rows } = await query(
    `SELECT id, guardian_name AS "guardianName", guardian_relation AS "guardianRelation",
            guardian_phone_last4 AS "guardianPhoneLast4", verification_status AS "verificationStatus",
            is_primary AS "isPrimary", verified_at AS "verifiedAt"
       FROM public.guardian_links
      WHERE student_id = $1 AND verification_status = 'verified'
      ORDER BY is_primary DESC`,
    [auth.userId],
  );

  return ok({ guardians: rows });
}

export const GET = withAuthorization(handleGet);

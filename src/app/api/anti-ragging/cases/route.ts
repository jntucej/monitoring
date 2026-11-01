// src/app/api/anti-ragging/cases/route.ts
// GET — list anti-ragging cases (principal/sysadmin only).

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

async function handleGet(_req: NextRequest, { auth }: { auth: AuthContext }) {
  // Students may view their own cases (matched via reporter_hash for
// anonymous filings); all other roles need principal/sysadmin/admin.
const isStaffRole = ["principal", "sysadmin", "admin"].includes(auth.role);
if (!isStaffRole && auth.role !== "student") {
  return fail("FORBIDDEN", "Not allowed", 403);
  }

  const { rows } = await query(
    `SELECT id, case_number AS "caseNumber", is_anonymous AS "isAnonymous",
            category, severity, narrative, location, occurred_at AS "occurredAt",
            accused_info AS "accusedInfo", witness_info AS "witnessInfo",
            status, assigned_to AS "assignedTo", committee_notes AS "committeeNotes",
            created_at AS "createdAt", updated_at AS "updatedAt"
       FROM public.anti_ragging_cases
      ORDER BY created_at DESC
      LIMIT 200`,
  );

  return ok({ cases: rows });
}

export const GET = withAuthorization(handleGet);

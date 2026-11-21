// src/app/api/anti-ragging/cases/route.ts
// GET — list anti-ragging cases (principal/sysadmin only).

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

async function handleGet(_req: NextRequest, { auth }: { auth: AuthContext }) {
  // Students may view their OWN cases (matched via reporter_hash for anonymous
  // filings); principal/sysadmin/admin see all. The previous version returned
  // every case to any student — a confidentiality leak on a confidential
  // anti-ragging channel, so students now get only their own.
  const isStaffRole = ["principal", "sysadmin", "admin"].includes(auth.role);
  if (!isStaffRole && auth.role !== "student") {
    return fail("FORBIDDEN", "Not allowed", 403);
  }

  const baseSelect = `SELECT c.id, c.case_number AS "caseNumber", c.is_anonymous AS "isAnonymous",
            c.category, c.severity, c.narrative, c.location, c.occurred_at AS "occurredAt",
            c.accused_info AS "accusedInfo", c.witness_info AS "witnessInfo",
            c.status, c.assigned_to AS "assignedTo", c.committee_notes AS "committeeNotes",
            c.created_at AS "createdAt", c.updated_at AS "updatedAt",
            u.name AS "assignedToName"
       FROM public.anti_ragging_cases c
       LEFT JOIN public.users u ON u.id = c.assigned_to`;

  if (isStaffRole) {
    const { rows } = await query(`${baseSelect} ORDER BY c.created_at DESC LIMIT 200`);
    return ok({ cases: rows });
  }

  // Student: only cases they themselves filed. Anonymous filings link back via
  // reporter_hash (the HMAC of their user id). Non-anonymous filings currently
  // have no owner link (a gap — see owner_user_id follow-up), so a student only
  // sees their anonymous cases until that column is added.
  const { reporterHash } = await import("@/lib/anti-ragging");
  const myHash = reporterHash(auth.userId);
  const { rows } = await query(
    `${baseSelect} WHERE c.reporter_hash = $1 ORDER BY c.created_at DESC LIMIT 100`,
    [myHash],
  );
  return ok({ cases: rows });
}

export const GET = withAuthorization(handleGet);

// src/app/api/hostel/blocks/route.ts
// GET /api/hostel/blocks — occupancy summary per hostel block.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok } from "@/server/http/response";
import { query } from "@/lib/db";
import type { AuthContext } from "@/lib/authContext";

const HOSTEL_ROLES = [
  "caretaker",
  "deputy_warden",
  "hostel_manager",
  "principal",
  "admin",
  "sysadmin",
  "supervisor",
];

async function handleGet(
  _req: NextRequest,
  { auth }: { auth: AuthContext },
): Promise<Response> {
  // Blocks are operational hostel data: approvers/supervisors/admin.
  if (!HOSTEL_ROLES.includes(auth.role)) {
    return ok({ blocks: [] });
  }

  const { rows } = await query(
    `SELECT sd.hostel_block AS block,
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE co.current_status = 'IN') AS occupied
       FROM public.student_details sd
       LEFT JOIN public.campus_occupancy co ON co.user_id = sd.user_id
      WHERE sd.hostel_block IS NOT NULL
      GROUP BY sd.hostel_block
      ORDER BY sd.hostel_block`,
  );

  return ok({ blocks: rows });
}

export const GET = withAuthorization(handleGet);

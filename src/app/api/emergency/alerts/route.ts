// src/app/api/emergency/alerts/route.ts
// GET — list open emergency alerts for authorities.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

const AUTHORITIES = new Set([
  "caretaker",
  "deputy_warden",
  "hostel_manager",
  "principal",
  "supervisor",
  "admin",
  "sysadmin",
]);

async function handleGet(_req: NextRequest, { auth }: { auth: AuthContext }) {
  if (!AUTHORITIES.has(auth.role)) return fail("FORBIDDEN", "Not allowed", 403);

  const { rows } = await query(
    `SELECT e.id, e.student_id AS "studentId", u.name, u.unique_id AS "uniqueId",
            e.alert_type AS "alertType", e.location, e.latitude, e.longitude,
            e.message, e.acknowledged_by AS "acknowledgedBy", e.acknowledged_at AS "acknowledgedAt",
            e.resolved_at AS "resolvedAt", e.created_at AS "createdAt"
       FROM public.emergency_alerts e
       JOIN public.users u ON u.id = e.student_id
      WHERE e.resolved_at IS NULL
      ORDER BY e.created_at DESC
      LIMIT 100`,
  );

  return ok({ alerts: rows });
}

export const GET = withAuthorization(handleGet);

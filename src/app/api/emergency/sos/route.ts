// src/app/api/emergency/sos/route.ts
// POST /api/emergency/sos — raise an emergency beacon (rate-limited).
// GET  /api/emergency/sos — list open (unresolved) alarms; approvers only.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok } from "@/server/http/response";
import { query, addAudit, addNotification } from "@/lib/db";
import type { AuthContext } from "@/lib/authContext";
import type { Role } from "@/lib/types";

const RESPONDER_ROLES = [
  "supervisor",
  "principal",
  "deputy_warden",
  "hostel_manager",
  "admin",
  "sysadmin",
];

async function handlePost(
  req: NextRequest,
  { auth }: { auth: AuthContext },
): Promise<Response> {
  const { latitude, longitude, message } = (await req.json().catch(() => ({}))) as {
    latitude?: number;
    longitude?: number;
    message?: string;
  };

  const { rows } = await query<{ id: string }>(
    `INSERT INTO public.emergency_sos (user_id, latitude, longitude, message)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [auth.userId, latitude ?? null, longitude ?? null, message?.slice(0, 500) ?? null],
  );
  const sosId = rows[0]?.id ?? null;

  const coords =
    latitude != null && longitude != null ? ` at (${latitude}, ${longitude})` : "";
  await addNotification(
    "role",
    "supervisor",
    "sos",
    "🚨 SOS ALERT",
    `Emergency beacon raised${coords} by user ${auth.email ?? auth.userId}`,
  );
  await addNotification(
    "role",
    "principal",
    "sos",
    "🚨 SOS ALERT",
    `Emergency beacon raised${coords} by ${auth.email ?? auth.userId}`,
  );
  await addAudit({
    action: "SOS_RAISED",
    userId: auth.userId,
    role: auth.role as Role,
    details: { sosId, latitude, longitude },
  });

  return ok({ sosId });
}

async function handleGet(
  _req: NextRequest,
  { auth }: { auth: AuthContext },
): Promise<Response> {
  if (!RESPONDER_ROLES.includes(auth.role)) return ok({ alarms: [] });

  const { rows } = await query(
    `SELECT s.id, s.user_id AS user_id, u.name, u.unique_id AS unique_id,
            s.latitude, s.longitude, s.message, s.created_at AS created_at,
            s.responded_by, s.responded_at, s.resolved_at
       FROM public.emergency_sos s
       JOIN public.users u ON u.id = s.user_id
      WHERE s.resolved_at IS NULL
      ORDER BY s.created_at DESC
      LIMIT 50`,
  );

  return ok({ alarms: rows });
}

export const GET = withAuthorization(handleGet);
export const POST = withRateLimit(withAuthorization(handlePost), {
  windowMs: 60_000,
  maxRequests: 3,
});

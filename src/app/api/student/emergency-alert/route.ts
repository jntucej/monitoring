// src/app/api/student/emergency-alert/route.ts
// POST — student raises an emergency alert (SOS).

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { assertCsrf } from "@/lib/csrf";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import { addAudit, addNotification } from "@/lib/db";
import type { AuthContext } from "@/lib/authContext";
import type { Role } from "@/lib/types";

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  if (auth.role !== "student") return fail("FORBIDDEN", "Only students can raise emergency alerts", 403);

  const body = (await req.json().catch(() => ({}))) as {
    alertType?: string;
    location?: string;
    latitude?: number;
    longitude?: number;
    message?: string;
  };

  const alertType = [
    "medical",
    "fire",
    "safety_threat",
    "electrical_hazard",
    "other",
  ].includes(body.alertType ?? "")
    ? body.alertType!
    : "medical";

  const { rows } = await query<{ id: string }>(
    `INSERT INTO public.emergency_alerts (
       student_id, alert_type, location, latitude, longitude, message
     ) VALUES ($1, $2::uuid, $3, $4, $5, $6)
     RETURNING id`,
    [
      auth.userId,
      alertType,
      body.location ? body.location.trim().slice(0, 250) : null,
      body.latitude ?? null,
      body.longitude ?? null,
      body.message ? body.message.trim().slice(0, 500) : null,
    ],
  );
  const alertId = rows[0].id;

  // Notify authorities
  for (const role of ["caretaker", "deputy_warden", "principal"]) {
    await addNotification(
      "role",
      role,
      "emergency_sos",
      `🚨 EMERGENCY SOS (${alertType.toUpperCase()})`,
      `Student raised an emergency alert at location: ${body.location ?? "unknown"}.`,
    );
  }

  await addAudit({
    action: "SOS_RAISED",
    userId: auth.userId,
    role: auth.role as Role,
    details: { alertId, alertType, location: body.location },
  });

  return ok({ alertId, raised: true });
}

export const POST = withRateLimit(withAuthorization(handlePost), { windowMs: 60_000, maxRequests: 3 });

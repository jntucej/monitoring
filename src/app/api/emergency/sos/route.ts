import { NextRequest, NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { assertCsrf } from "@/lib/csrf";
import { query, addAudit, addNotification } from "@/lib/db";
import type { AuthContext } from "@/lib/authContext";

async function handlePost(
  req: NextRequest,
  { auth }: { auth: AuthContext }
): Promise<Response> {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  const body = await req.json().catch(() => ({}));
  const latitude = typeof body.latitude === "number" ? body.latitude : null;
  const longitude = typeof body.longitude === "number" ? body.longitude : null;
  const message = String(body.message ?? "").slice(0, 500) || null;

  const { rows } = await query<{ id: string; created_at: string }>(
    `INSERT INTO emergency_sos (user_id, latitude, longitude, message)
     VALUES ($1, $2, $3, $4)
     RETURNING id, created_at`,
    [auth.userId, latitude, longitude, message]
  );
  const sos = rows[0];

  const { rows: recipients } = await query<{ id: string; role: string }>(
    `SELECT id, role FROM users
      WHERE role IN ('supervisor','principal','admin','deputy_warden')
        AND status = 'ACTIVE'`
  );

  await Promise.all(
    recipients.map((r) =>
      addNotification(
        "user",
        r.id,
        "emergency",
        "SOS Raised",
        `SOS from ${auth.email ?? auth.userId}${message ? `: ${message}` : ""}`
      )
    )
  );

  await addAudit({
    action: "SOS_RAISED",
    userId: auth.userId,
    userName: auth.email ?? auth.userId,
    role: auth.role,
    details: JSON.stringify({ sosId: sos.id, latitude, longitude, message }),
  });

  return NextResponse.json({
    success: true,
    data: {
      id: sos.id,
      createdAt: sos.created_at,
      notified: recipients.length,
    },
  });
}

async function handleGet(
  _req: NextRequest,
  { auth }: { auth: AuthContext }
): Promise<Response> {
  const { rows } = await query<{
    id: string;
    user_id: string;
    latitude: number | null;
    longitude: number | null;
    message: string | null;
    responded_at: string | null;
    resolved_at: string | null;
    created_at: string;
  }>(
    `SELECT id, user_id, latitude, longitude, message,
            responded_at, resolved_at, created_at
       FROM emergency_sos
      WHERE user_id = $1 OR $2 IN ('admin','sysadmin','principal','supervisor','deputy_warden')
      ORDER BY created_at DESC
      LIMIT 100`,
    [auth.userId, auth.role]
  );
  return NextResponse.json({ success: true, data: rows });
}

export const POST = withRateLimit(withAuthorization(handlePost), {
  windowMs: 60_000,
  maxRequests: 10,
});

export const GET = withAuthorization(handleGet);

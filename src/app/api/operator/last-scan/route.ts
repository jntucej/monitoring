import { NextRequest, NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { query } from "@/lib/postgres";

/**
 * GET /api/operator/last-scan?userId=<uuid>
 * The most recent movement log for a looked-up person, so the lookup
 * screen can show "last seen IN at Main Gate 2h ago" without a separate
 * round trip per person.
 */
async function handleGet(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) {
    return NextResponse.json(
      { success: false, error: { code: "BAD_REQUEST", message: "userId is required." } },
      { status: 400 }
    );
  }
  // movement_logs.user_id is a uuid; the lookup form may pass a roll number
  // or a uuid — resolve to the user row first.
  const isUuid = /^[0-9a-f-]{36}$/i.test(userId);
  const { rows } = await query(
    isUuid
      ? `SELECT u.id AS user_uuid FROM users u WHERE u.id = $1 LIMIT 1`
      : `SELECT u.id AS user_uuid FROM users u WHERE u.unique_id = $1 OR u.handle = $1 OR u.login_identifier = $1 LIMIT 1`,
    [userId]
  );
  const uid = rows[0]?.user_uuid;
  if (!uid) return NextResponse.json({ success: true, data: null });
  const { rows: scan } = await query(
    `SELECT ml.id, ml.direction, ml.gate_id, ml.is_manual, ml.timestamp,
            g.name AS gate_name
       FROM movement_logs ml
       LEFT JOIN gates g ON g.id = ml.gate_id
      WHERE ml.user_id = $1
      ORDER BY ml.timestamp DESC
      LIMIT 1`,
    [uid]
  );
  const r = scan[0];
  return NextResponse.json({
    success: true,
    data: r
      ? {
          direction: r.direction,
          gateName: r.gate_name ?? null,
          gateId: r.gate_id,
          isManual: r.is_manual,
          at: r.timestamp,
        }
      : null,
  });
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ["operator", "supervisor", "admin", "sysadmin"] }),
  { keyPrefix: "operator_last_scan", maxRequests: 60 }
);

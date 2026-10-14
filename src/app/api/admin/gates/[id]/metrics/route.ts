import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { RATE_LIMITS } from "@/config/app-constants";
import type { RateLimitConfig } from "@/lib/rate-limit";
import type { AuthContext } from "@/lib/authContext";

/**
 * GET /api/admin/gates/[id]/metrics — per-gate metrics (admin/sysadmin).
 *
 * Returns: status, active operator, scans today, entries/exits today,
 * peak hour (mode of entry hour, last 7 days), and recent scans (last 20).
 * Unavailable metrics are returned as null (never 500 for missing data).
 */

const readLimit: RateLimitConfig = { ...RATE_LIMITS.read, keyPrefix: "admin_gate_metrics" };

function getId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  return decodeURIComponent(segments[segments.length - 2] || "");
}

async function handleGet(req: NextRequest, _ctx: { auth: AuthContext }): Promise<Response> {
  const id = getId(req);
  if (!id) {
    return NextResponse.json(
      { success: false, error: { code: "BAD_REQUEST", message: "Gate id is required" } },
      { status: 400 }
    );
  }

  try {
    const gateRes = await query<{
      id: string;
      gate_code: string;
      name: string;
      location: string;
      type: string;
      is_active: boolean;
      audience: string | null;
    }>(`SELECT id, gate_code, name, location, type, is_active, audience
          FROM public.gates WHERE id = $1::uuid`, [id]);
    const gate = gateRes.rows[0];

    if (!gate) {
      return NextResponse.json(
        { success: false, error: { code: "GATE_NOT_FOUND", message: `Gate ${id} not found.` } },
        { status: 404 }
      );
    }

    const [statsRes, activeOperatorRes, recentRes] = await Promise.all([
      query<{ entries: number | null; exits: number | null; peak_hour: number | null; peak_count: number | null }>(
        `SELECT entries, exits, peak_hour, peak_count
           FROM public.daily_stats
          WHERE gate_id = $1::uuid AND date = CURRENT_DATE
          LIMIT 1`,
        [id]
      ),
      query<{ user_id: string; name: string; email: string | null; operator_since: string }>(
        `SELECT u.id, u.name, u.email, ml.timestamp AS operator_since
           FROM public.movement_logs ml
           JOIN public.users u ON u.id = ml.operator_id
          WHERE ml.gate_id = $1::uuid AND ml.direction = 'IN'
            AND ml.timestamp >= CURRENT_DATE
          ORDER BY ml.timestamp DESC
          LIMIT 1`,
        [id]
      ),
      query<{
        id: string;
        direction: string;
        user_id: string | null;
        person_name: string | null;
        person_role: string | null;
        reason: string | null;
        operator_name: string | null;
        timestamp: string;
      }>(
        `SELECT ml.id, ml.direction, ml.user_id,
                u.name AS person_name, u.role AS person_role,
                ml.reason, ml.operator_name, ml.timestamp
           FROM public.movement_logs ml
           LEFT JOIN public.users u ON u.id = ml.user_id
          WHERE ml.gate_id = $1::uuid
          ORDER BY ml.timestamp DESC
          LIMIT 20`,
        [id]
      ),
    ]);

    const stats = statsRes.rows[0];
    const activeOperator = activeOperatorRes.rows[0];

    // Scans today: prefer the daily_stats rollup, fall back to a COUNT on movement_logs.
    let scansToday: number | null = null;
    if (stats && (stats.entries !== null || stats.exits !== null)) {
      scansToday = (stats.entries ?? 0) + (stats.exits ?? 0);
    } else {
      const countRes = await query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM public.movement_logs
          WHERE gate_id = $1::uuid AND timestamp >= CURRENT_DATE`,
        [id]
      );
      scansToday = parseInt(countRes.rows[0]?.count ?? "0", 10) || 0;
    }

    // Peak hour: mode of entry hour over the last 7 days of movement_logs.
    let peakHour: string | null = null;
    try {
      const hourRes = await query<{ hour: number; cnt: number }>(
        `SELECT EXTRACT(HOUR FROM timestamp) AS hour, COUNT(*) AS cnt
           FROM public.movement_logs
          WHERE gate_id = $1::uuid
            AND direction = 'IN'
            AND timestamp >= NOW() - INTERVAL '7 days'
          GROUP BY 1
          ORDER BY cnt DESC, hour ASC
          LIMIT 1`,
        [id]
      );
      const top = hourRes.rows[0];
      if (top && top.cnt > 0) {
        const h = Math.floor(top.hour);
        peakHour = `${String(h).padStart(2, "0")}:00`;
      }
    } catch {
      peakHour = stats?.peak_hour != null ? `${String(stats.peak_hour).padStart(2, "0")}:00` : null;
    }

    return NextResponse.json({
      success: true,
      data: {
        gateId: gate.id,
        gateCode: gate.gate_code,
        gateName: gate.name,
        location: gate.location,
        type: gate.type,
        audience: gate.audience,
        status: gate.is_active ? "ACTIVE" : "INACTIVE",
        activeOperator: activeOperator
          ? {
              name: activeOperator.name,
              email: activeOperator.email,
              since: activeOperator.operator_since,
            }
          : null,
        scansToday,
        entriesToday: stats?.entries ?? null,
        exitsToday: stats?.exits ?? null,
        peakHour,
        recentScans: recentRes.rows.map((r) => ({
          id: r.id,
          personName: r.person_name ?? "Unknown",
          personRole: r.person_role ?? "unknown",
          direction: r.direction,
          reason: r.reason,
          operator: r.operator_name,
          timestamp: r.timestamp,
        })),
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: msg } },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ["admin", "sysadmin"] }),
  readLimit
);

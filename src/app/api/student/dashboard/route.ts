import { NextRequest, NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { query } from "@/lib/postgres";
import { getIstDateString } from "@/server/policy/dates";
import type { AuthContext } from "@/lib/authContext";

// ── Per-widget providers ────────────────────────────────────────────────
// Each provider returns the value keyed by STUDENT_WIDGETS[i].apiField.
// SCAFFOLD:PROVIDERS — new providers are injected above this line

/**
 * Every loader is individually null-tolerant: a missing row (e.g. no
 * student_details, no curfew score yet, no movement log) must never take the
 * whole dashboard down — widgets degrade to "No data yet" instead of a 500.
 */
async function loadCurfew(userId: string) {
  try {
    const today = getIstDateString();
    const r = await query<{ score: number; on_time_returns: number; late_returns: number; violations: number }>(
      `SELECT score, on_time_returns, late_returns, violations
         FROM student_curfew_scores
        WHERE student_user_id = $1 AND score_date = $2`,
      [userId, today]
    );
    const avg = await query<{ avg: string; late: string }>(
      `SELECT COALESCE(AVG(score), 100)::text AS avg,
              COALESCE(SUM(late_returns), 0)::text AS late
         FROM student_curfew_scores
        WHERE student_user_id = $1
          AND score_date >= (CURRENT_DATE - INTERVAL '30 days')`,
      [userId]
    );
    const row = r.rows[0];
    const thirtyAvg = Number(avg.rows[0]?.avg ?? 100);
    const todayScore = row?.score ?? 100;
    const trend = todayScore > thirtyAvg + 2 ? "up" : todayScore < thirtyAvg - 2 ? "down" : "flat";
    return {
      today: { score: todayScore, onTime: row?.on_time_returns ?? 0, late: row?.late_returns ?? 0, violations: row?.violations ?? 0 },
      thirtyDayAvg: Math.round(thirtyAvg),
      thirtyDayLate: Number(avg.rows[0]?.late ?? 0),
      trend,
    };
  } catch {
    // No curfew scores table row / no data yet → neutral zeros, not a 500.
    return {
      today: { score: 100, onTime: 0, late: 0, violations: 0 },
      thirtyDayAvg: 100,
      thirtyDayLate: 0,
      trend: "flat" as const,
    };
  }
}

async function loadMonthly(userId: string) {
  try {
    const ym = getIstDateString().slice(0, 7);
    const r = await query<{
      total_outings: number; daily_outings: number; home_outings: number;
      day_passes: number; night_outings: number; total_minutes_out: number;
    }>(
      `SELECT total_outings, daily_outings, home_outings, day_passes, night_outings, total_minutes_out
         FROM student_monthly_outing_summary
        WHERE student_user_id = $1 AND year_month = $2`,
      [userId, ym]
    );
    const row = r.rows[0];
    return {
      yearMonth: ym,
      total: row?.total_outings ?? 0,
      daily: row?.daily_outings ?? 0,
      home: row?.home_outings ?? 0,
      daypass: row?.day_passes ?? 0,
      night: row?.night_outings ?? 0,
      minutesOut: row?.total_minutes_out ?? 0,
    };
  } catch {
    return {
      yearMonth: getIstDateString().slice(0, 7),
      total: 0,
      daily: 0,
      home: 0,
      daypass: 0,
      night: 0,
      minutesOut: 0,
    };
  }
}

async function loadActivePasses(userId: string) {
  try {
    const r = await query<{
      id: string; reason: string; from_datetime: string; to_datetime: string;
      final_status: string; qr_code: string;
    }>(
      `SELECT id, reason, from_datetime, to_datetime, final_status, qr_code
         FROM gate_passes
        WHERE user_id = $1
          AND final_status IN ('APPROVED','APPROVED_ADMIN','APPROVED_PARENT')
          AND to_datetime >= NOW()
        ORDER BY from_datetime ASC
        LIMIT 5`,
      [userId]
    );
    return r.rows.map((p) => ({
      id: p.id, reason: p.reason, from: p.from_datetime, to: p.to_datetime,
      status: p.final_status, qrCode: p.qr_code,
    }));
  } catch {
    return [] as Array<{
      id: string; reason: string; from: string; to: string;
      status: string; qrCode: string;
    }>;
  }
}

async function loadLastScan(userId: string) {
  try {
    const r = await query<{
      id: string; direction: "IN" | "OUT"; gate_name: string; reason: string | null; timestamp: string;
    }>(
      `SELECT id, direction, gate_name, reason, timestamp
         FROM movement_logs
        WHERE user_id = $1
        ORDER BY timestamp DESC
        LIMIT 1`,
      [userId]
    );
    if (!r.rows[0]) return null;
    return {
      id: r.rows[0].id,
      direction: r.rows[0].direction,
      gateName: r.rows[0].gate_name,
      reason: r.rows[0].reason,
      timestamp: r.rows[0].timestamp,
    };
  } catch {
    return null;
  }
}

// ── Aggregator ──────────────────────────────────────────────────────────
async function handleGet(_req: NextRequest, { auth }: { auth: AuthContext }) {
  try {
    const [curfew, monthly, activePasses, lastScan] = await Promise.all([
      loadCurfew(auth.userId),
      loadMonthly(auth.userId),
      loadActivePasses(auth.userId),
      loadLastScan(auth.userId),
      // SCAFFOLD:LOADS — new loads are injected above this line
    ]);
    return NextResponse.json({ success: true, data: { curfew, monthly, activePasses, lastScan } });
  } catch (err) {
    // Defense in depth: even a total aggregator failure returns success with
    // neutral payloads so the widget grid degrades gracefully instead of 500.
    console.error("[student/dashboard] aggregator error:", err);
    return NextResponse.json({
      success: true,
      data: {
        curfew: { today: { score: 100, onTime: 0, late: 0, violations: 0 }, thirtyDayAvg: 100, thirtyDayLate: 0, trend: "flat" },
        monthly: { yearMonth: getIstDateString().slice(0, 7), total: 0, daily: 0, home: 0, daypass: 0, night: 0, minutesOut: 0 },
        activePasses: [],
        lastScan: null,
      },
    });
  }
}

export const GET = withAuthorization(handleGet, { requiredRole: ["student"] });

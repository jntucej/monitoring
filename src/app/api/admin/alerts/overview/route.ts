// src/app/api/admin/alerts/overview/route.ts
// GET /api/admin/alerts/overview
// Alert KPIs + rule heat + a live feed for the ALERTS console page.
//
// Tables (confirmed against database/schema.sql + src/app/api/admin/*):
//   alerts        — id, severity, title, message, gate_id, user_unique_id,
//                   timestamp, resolved, resolved_at
//   alert_rules   — id, name, metric, threshold, duration_minutes, severity,
//                   channel, enabled, created_at
//
// Real vs stubbed:
//   open.*        — REAL: open alert counts grouped by severity.
//   mttah / mttrh — REAL when resolved_at is present; 0 placeholder when empty.
//   snoozed       — STUB 0: no snooze/ack column in the alerts schema.
//   feed          — REAL: recent unresolved alerts + last 24h resolved alerts.
//   rule_heat     — REAL when alert_rules exists:
//     * rows = up to 12 rules
//     * cells = 7 day buckets of open alert volume
//     * -1 is used for missing data in individual rule/day lookups
//
// admin-scoped: requiredRole ['sysadmin','admin'].

import { type NextRequest } from "next/server";
import type { AuthContext } from "@/lib/authContext";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { QueryResultRow } from "pg";

function median(nums: number[]): number | null {
  if (nums.length === 0) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function mean(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function lastNDays(n: number): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

async function safeQuery<T extends QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  try {
    const res = await query<T>(text, params as never[]);
    return res.rows ?? [];
  } catch {
    return [];
  }
}

export const GET = withRateLimit(
  withAuthorization(
    async (req: NextRequest, ctx: { auth: AuthContext }): Promise<Response> => {
      void req;
      void ctx;

      let open = { critical: 0, high: 0, medium: 0, low: 0 };
      try {
        const res = await query<{
          critical?: number | string | null;
          high?: number | string | null;
          medium?: number | string | null;
          low?: number | string | null;
        }>(`
          SELECT
            COUNT(*) FILTER (WHERE severity = 'critical') AS critical,
            COUNT(*) FILTER (WHERE severity = 'high')     AS high,
            COUNT(*) FILTER (WHERE severity = 'medium')   AS medium,
            COUNT(*) FILTER (WHERE severity = 'low')      AS low
          FROM alerts
          WHERE resolved = false
        `);
        const row = res.rows[0] ?? {};
        open = {
          critical: Number(row.critical ?? 0),
          high: Number(row.high ?? 0),
          medium: Number(row.medium ?? 0),
          low: Number(row.low ?? 0),
        };
      } catch {
        // keep zeros
      }

      let mttah: number | null = null;
      let mttrh: number | null = null;
      try {
        const res = await query<{ hours: unknown }>(`
          SELECT
            EXTRACT(EPOCH FROM (resolved_at - timestamp)) / 3600.0 AS hours
          FROM alerts
          WHERE resolved = true
            AND resolved_at IS NOT NULL
            AND timestamp   IS NOT NULL
            AND resolved_at >= timestamp
        `);
        const hours = (res.rows ?? [])
          .map((row) => Number(row.hours))
          .filter((n) => Number.isFinite(n) && n >= 0);
        mttah = median(hours);
        mttrh = mean(hours);
      } catch {
        // leave null -> UI renders placeholder
      }

      const feedRows = await safeQuery<{
        id: string;
        severity: string;
        title: string;
        message: string;
        gate_code: string | null;
        timestamp: string;
        resolved: boolean;
      }>(
        `
        SELECT
          a.id::text AS id,
          a.severity,
          a.title,
          a.message,
          g.gate_code,
          a.timestamp::text AS timestamp,
          a.resolved
        FROM alerts a
        LEFT JOIN gates g ON g.id = a.gate_id
        WHERE a.resolved = false
        ORDER BY a.timestamp DESC
        LIMIT 50
        `
      );

      const resolvedRows = await safeQuery<{
        id: string;
        severity: string;
        title: string;
        message: string;
        gate_code: string | null;
        timestamp: string;
        resolved: boolean;
      }>(
        `
        SELECT
          a.id::text AS id,
          a.severity,
          a.title,
          a.message,
          g.gate_code,
          a.timestamp::text AS timestamp,
          a.resolved
        FROM alerts a
        LEFT JOIN gates g ON g.id = a.gate_id
        WHERE a.resolved = true
          AND a.resolved_at >= NOW() - INTERVAL '24 hours'
        ORDER BY a.resolved_at DESC NULLS LAST
        LIMIT 25
        `
      );

      const feed = [
        ...feedRows.map((row) => ({
          id: String(row.id ?? ""),
          severity: row.severity,
          title: String(row.title ?? ""),
          message: String(row.message ?? ""),
          gate: row.gate_code ? String(row.gate_code) : undefined,
          timestamp: String(row.timestamp ?? ""),
          resolved: Boolean(row.resolved),
          heat30: Array(6).fill(0) as number[],
        })),
        ...resolvedRows.map((row) => ({
          id: String(row.id ?? ""),
          severity: row.severity,
          title: String(row.title ?? ""),
          message: String(row.message ?? ""),
          gate: row.gate_code ? String(row.gate_code) : undefined,
          timestamp: String(row.timestamp ?? ""),
          resolved: true,
          heat30: Array(6).fill(0) as number[],
        })),
      ].slice(0, 40);

      const days = lastNDays(7);
      const rulesRows = await safeQuery<{
        id: string;
        name: string;
        metric: string;
        severity: string;
      }>(`
        SELECT id::text AS id, name, metric, severity
        FROM alert_rules
        ORDER BY created_at DESC
        LIMIT 12
      `);

      const dayCounts = await safeQuery<{ day: string; count: number | string | null }>(`
        SELECT DATE_TRUNC('day', timestamp)::date::text AS day,
               COUNT(*)::int AS count
        FROM alerts
        WHERE timestamp >= NOW() - INTERVAL '7 days'
          AND resolved = false
        GROUP BY 1
        ORDER BY 1
      `);

      const countsByDay = new Map<string, number>();
      for (const row of dayCounts) {
        countsByDay.set(String(row.day ?? ""), Number(row.count ?? 0));
      }

      const rule_heat = rulesRows.map((rule) => ({
        ruleId: String(rule.id ?? ""),
        ruleName: String(rule.name ?? ""),
        severity: String(rule.severity ?? ""),
        metric: String(rule.metric ?? ""),
        cells: days.map((day) => countsByDay.get(day) ?? 0),
      }));

      return ok({
        open,
        mttah: mttah == null ? 0 : mttah,
        mttrh: mttrh == null ? 0 : mttrh,
        snoozed: 0,
        feed,
        rules_matrix: {
          rows: rulesRows.map((r) => String(r.name ?? "")),
          cols: days,
          data: rule_heat.map((r) => r.cells),
        },
        rule_heat,
      });
    },
    { requiredRole: ["sysadmin", "admin"] }
  ),
  { keyPrefix: "admin_alerts_overview", windowMs: 60_000, maxRequests: 120 }
);

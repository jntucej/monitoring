// src/app/api/admin/safety/overview/route.ts
// GET /api/admin/safety/overview
// Safety page: per-gate state + open security incidents.
//
// Tables (confirmed against database/schema.sql + admin/gates + admin/lockdown):
//   gates            — id, gate_code, name, location, type, is_active
//   security_alerts  — id, gate_id, severity, message, status ('open'/...),
//                      created_at
//
// Real vs stubbed:
//   gate_states     — REAL-ish. `gates` has no native secure/elevated/critical
//     column. Each gate's state is DERIVED:
//       critical = open security_alerts with severity in (high, critical)
//       elevated = open security_alerts with severity in (medium, low)
//       secure   = no open alerts for that gate (or any gate with no
//                  security_alerts rows at all — the table may be empty on
//                  a fresh install).
//     Active + alert-based; the derivation is cheap and always safe.
//   incidents       — REAL (security_alerts, status='open', severity in the
//     alerts enum, most-recent-first, capped at 20).
//   open_incidents  — REAL (count of open security_alerts).
//
// admin-scoped: requiredRole ['sysadmin','admin'].

import { type NextRequest } from "next/server";
import type { AuthContext } from "@/lib/authContext";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok } from "@/server/http/response";
import { query } from "@/lib/postgres";

type GateState = "secure" | "elevated" | "critical";

interface Incident {
  id: string;
  title: string;
  severity: string;
  created_at: string | null;
  resolved: boolean;
}

export const GET = withRateLimit(
  withAuthorization(
    async (req: NextRequest, ctx: { auth: AuthContext }): Promise<Response> => {
      void req;
      void ctx;

      // ── gate list (REAL: gates) ─────────────────────────────────
      let gates: Array<{ id: string; gate_code: string; is_active: boolean }> = [];
      try {
        const res = await query(
          `
          SELECT id::text, gate_code, is_active
          FROM gates
          ORDER BY gate_code
          `
        );
        gates = res.rows as Array<{ id: string; gate_code: string; is_active: boolean }>;
      } catch { /* empty on fresh install */ }

      // ── open security alerts grouped by gate_id (REAL) ────────
      // critical: high/critical severity open
      // elevated: medium/low open (but no critical/high open)
      const openByGate = new Map<string, { critical: number; elevated: number }>();
      let openIncidents = 0;
      try {
        const res = await query(
          `
          SELECT
            COALESCE(gate_id::text, '') AS gate_key,
            COUNT(*) FILTER (WHERE severity IN ('high','critical')) AS critical,
            COUNT(*) FILTER (WHERE severity IN ('medium','low'))   AS elevated
          FROM security_alerts
          WHERE status = 'open'
          GROUP BY COALESCE(gate_id::text, '')
          `
        );
        for (const r of res.rows as Array<{
          gate_key: string;
          critical: number;
          elevated: number;
        }>) {
          openByGate.set(r.gate_key ?? "", {
            critical: Number(r.critical ?? 0),
            elevated: Number(r.elevated ?? 0),
          });
        }
        // Total open count across all gates (including gate_id NULL).
        const totalRes = await query(
          `SELECT COUNT(*)::int AS count FROM security_alerts WHERE status = 'open'`
        );
        openIncidents = Number((totalRes.rows[0] as { count?: number })?.count ?? 0);
      } catch {
        // security_alerts missing — no gate gets an alert-derived state
      }

      // ── gate_states: derive per-gate state ─────────────────────
      const gate_states: Array<{ gate_code: string; state: GateState }> = gates.map(
        (g) => {
          const open = openByGate.get(g.id) ?? { critical: 0, elevated: 0 };
          let state: GateState = "secure";
          if (open.critical > 0) state = "critical";
          else if (open.elevated > 0) state = "elevated";
          return { gate_code: g.gate_code, state };
        }
      );

      // ── incidents: last 20 open security alerts (REAL) ────────
      let incidents: Incident[] = [];
      try {
        const res = await query(
          `
          SELECT id::text, message, severity, created_at::text, status
          FROM security_alerts
          WHERE status = 'open'
          ORDER BY created_at DESC
          LIMIT 20
          `
        );
        incidents = (res.rows as Array<Record<string, unknown>>).map((r) => ({
          id: String(r.id ?? ""),
          title: String(r.message ?? "Security alert"),
          severity: String(r.severity ?? "low"),
          created_at:
            typeof r.created_at === "string" ? (r.created_at as string) : null,
          resolved: r.status === "resolved", // always false when status='open'
        }));
      } catch { /* leave [] */ }

      return ok({
        gate_states,
        incidents,
        open_incidents: openIncidents,
      });
    },
    { requiredRole: ["sysadmin", "admin"] }
  ),
  { keyPrefix: "admin_safety_overview", windowMs: 60_000, maxRequests: 120 }
);

// src/app/api/admin/alerts/safety/overview/route.ts
// GET /api/admin/alerts/safety/overview
// Gate posture + high/critical unresolved incident overview.

import { type NextRequest } from "next/server";
import type { AuthContext } from "@/lib/authContext";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { QueryResultRow } from "pg";
import type {
  SafetyGateState,
  SafetyGateStateEntry,
  SafetyIncident,
} from "@/components/sysadmin/domains/alerts/types";

interface GateRow extends QueryResultRow {
  id: string;
  gate_code: string;
}

interface AlertRow extends QueryResultRow {
  id: string;
  title: string;
  severity: string;
  gate_id: string | null;
  created_at: string;
  resolved: boolean;
}

async function safeQuery<T extends QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  try {
    const res = await query<T>(text, params as never[]);
    return res.rows ?? [];
  } catch (err: unknown) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code?: string }).code === "42P01"
    ) {
      return [];
    }
    throw err;
  }
}

export const GET = withRateLimit(
  withAuthorization(
    async (req: NextRequest, ctx: { auth: AuthContext }): Promise<Response> => {
      void req;
      void ctx;

      const gates = await safeQuery<GateRow>(`
        SELECT id::text AS id, gate_code
        FROM gates
        WHERE is_active = true
        ORDER BY gate_code ASC
      `);

      const alerts = await safeQuery<AlertRow>(`
        SELECT
          a.id::text AS id,
          a.title,
          a.severity,
          a.gate_id::text AS gate_id,
          a.timestamp::text AS created_at,
          a.resolved
        FROM alerts a
        WHERE a.resolved = false
          AND a.severity IN ('high', 'critical')
        ORDER BY a.timestamp DESC
        LIMIT 50
      `);

      const incidents: SafetyIncident[] = alerts.map((a) => ({
        id: a.id,
        title: a.title,
        severity: a.severity,
        created_at: a.created_at,
        resolved: a.resolved,
      }));

      const gateAlertSeverity = new Map<string, "critical" | "high">();
      for (const a of alerts) {
        if (!a.gate_id) continue;
        const current = gateAlertSeverity.get(a.gate_id);
        if (a.severity === "critical") {
          gateAlertSeverity.set(a.gate_id, "critical");
        } else if (a.severity === "high" && current !== "critical") {
          gateAlertSeverity.set(a.gate_id, "high");
        }
      }

      const gate_states: SafetyGateStateEntry[] = gates.map((g) => {
        const sev = gateAlertSeverity.get(g.id);
        const state: SafetyGateState =
          sev === "critical" ? "critical" : sev === "high" ? "elevated" : "secure";
        return {
          gate_code: g.gate_code,
          state,
        };
      });

      return ok({
        gate_states,
        incidents,
        open_incidents: incidents.length,
      });
    },
    { requiredRole: ["sysadmin", "admin"] }
  ),
  { keyPrefix: "admin_alerts_safety_overview", windowMs: 60_000, maxRequests: 120 }
);

// /api/cron/gate-reconcile/route.ts
// Phase 1 agent #1 — Gate reconciliation (bounded to operator scope).
// Runs every 5 min (cron). Watches unmatched scans and either auto-
// resolves from the users table (known roll, no flag) or writes a
// prepared resolution for one-click operator confirmation.
//
// The agent NEVER mutates gate state directly: it writes
//   - a resolution record (audit_events, actor_type = 'agent')
//   - an alert row the operator/supervisor surfaces
// The operator's one-click confirm is the human gate (see
// /api/operator/... confirm endpoints in Phase 2).
//
// Cron: POST x-cron-secret (requireCronAuth).

import { errMsg } from "@/lib/err-msg";
import { NextRequest } from "next/server";
import { requireCronAuth } from "@/server/http/cron-auth";
import { query } from "@/lib/postgres";
import { recordMutationAudit } from "@/middleware/entityAuthorization";

export async function POST(req: NextRequest) {
  const unauthorized = requireCronAuth(req);
  if (unauthorized) return unauthorized;

  try {
    // Unmatched scans: gate_logs rows where verify_mode_details shows a
    // mismatch / no-match in the last 15 minutes and no resolution yet.
    // The live gate log table is movement_logs. Unmatched/unsure scans are
    // the manual entries (is_manual = TRUE) in the last 15 minutes — the
    // operator already fell back to a manual record, which is exactly the
    // case the reconciliation agent resolves.
    const { rows } = await query<{
      gate_log_id: string;
      gate_id: string;
      unique_id_attempted: string | null;
      timestamp_local: string;
    }>(
      `SELECT ml.id::text AS gate_log_id,
              ml.gate_id::text AS gate_id,
              u.unique_id AS unique_id_attempted,
              to_char(ml.timestamp, 'YYYY-MM-DD HH24:MI') AS timestamp_local
         FROM public.movement_logs ml
         LEFT JOIN public.users u ON u.id = ml.user_id
        WHERE ml.is_manual = TRUE
          AND ml.timestamp > now() - INTERVAL '15 minutes'
        ORDER BY ml.timestamp DESC
        LIMIT 50`,
    );

    const resolutions: Array<{ scanId: string; verdict: string; roll: string | null }> = [];

    for (const scan of rows) {
      // Is the attempted roll a known, unflagged student? If yes,
      // auto-resolve as AUTO_MATCHED; otherwise prepare an operator prompt.
      const { rows: users } = scan.unique_id_attempted
        ? await query<{ unique_id: string; name: string; flag_status: string | null }>(
            `SELECT unique_id, name, flag_status
               FROM public.users
              WHERE unique_id = $1 AND status = 'ACTIVE'
              LIMIT 1`,
            [scan.unique_id_attempted],
          )
        : { rows: [] }; // no roll captured → operator prompt

      if (users.length > 0 && !users[0].flag_status) {
        // Auto-match: record the resolution (agent actor).
        await recordMutationAudit({
          actorId: "00000000-0000-0000-0000-000000000000", // system agent id
          actorType: "agent",
          roleContext: "operator",
          entityScope: "GATE_MAIN",
          action: "gate_scan_auto_resolved",
          resource: "gate_logs",
          resourceId: scan.gate_log_id,
          afterState: { roll: users[0].unique_id, verdict: "AUTO_MATCHED" },
        });
        resolutions.push({ scanId: scan.gate_log_id, verdict: "AUTO_MATCHED", roll: users[0].unique_id });
      } else {
        // Prepare a prompt for the operator (alert row).
        await query(
          `INSERT INTO public.alerts (severity, resource_type, resource_id, title, detail, created_by)
           VALUES ('medium', 'gate_scan', $1, $2, $3, NULL)`,
          [scan.gate_log_id,
           `Unmatched gate scan needs operator review${scan.unique_id_attempted ? ` (roll ${scan.unique_id_attempted})` : ""}`,
           scan.unique_id_attempted ? `Attempted roll not found or flagged; scan ${scan.gate_log_id}` : "No roll captured; manual verify required"],
        );
        resolutions.push({ scanId: scan.gate_log_id, verdict: "OPERATOR_PROMPT", roll: null });
      }
    }

    return Response.json({
      success: true,
      window: "15m",
      scanned: rows.length,
      autoResolved: resolutions.filter((r) => r.verdict === "AUTO_MATCHED").length,
      operatorPrompts: resolutions.filter((r) => r.verdict === "OPERATOR_PROMPT").length,
    });
  } catch (err) {
    return Response.json({ success: false, error: errMsg(err) }, { status: 500 });
  }
}

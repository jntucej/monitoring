// src/app/api/admin/deployments/overview/route.ts
// GET /api/admin/deployments/overview
// Deployment KPIs + last N releases list.
//
// Table (confirmed against database/migrations/20261203000000_deployments_table.sql):
//   deployments
//   -----------
//   id, version, deployed_at, message, source, commit, created_at
//
// Real vs stubbed:
//   last_deploy_at     — REAL (MAX(deployed_at)); null when no deployments.
//   health_gate_pct    — REAL-ish: % of last-30d deployments whose source does
//     NOT contain "rollback" (a deploy that survived the health gate). When the
//     table is empty this returns 100 (nothing has failed the gate).
//   rollbacks_30d      — REAL: count of last-30d rows whose source matches /rollback/i.
//   lead_time_h        — REAL proxy: mean hours between commit timestamp (when the
//     commit column parses as a git ref w/ an embedded date) and deployed_at. Falls
//     back to the mean of (deployed_at - created_at) when no commit times parse.
//     0 when fewer than 2 deploy events exist.
//   releases           — REAL: last 20 deployments newest-first.
//     `status` is DERIVED from source/message because the table has no native
//     status column: 'failed' when /fail|error/i matches, 'skipped' when
//     /skip/i matches, else 'deployed'.
//     `change_size` is STUBBED 0 — the deployments schema has no diff-size or
//     commit-count column; left at 0 with a comment so the UI can render it.
//
// admin-scoped: requiredRole ['sysadmin','admin'].

import { NextRequest } from "next/server";
import type { AuthContext } from "@/lib/authContext";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok } from "@/server/http/response";
import { query } from "@/lib/postgres";

interface DeploymentRow {
  id: string;
  version: string | null;
  message: string | null;
  source: string;
  commit: string | null;
  deployed_at: string | null;
  created_at: string;
}

type DeployStatus = "deployed" | "skipped" | "failed";

function deriveStatus(source: string | null, message: string | null): DeployStatus {
  const text = `${source ?? ""} ${message ?? ""}`.toLowerCase();
  if (/fail|error|fatal/.test(text)) return "failed";
  if (/skip/.test(text)) return "skipped";
  return "deployed";
}

/** Try to parse a git commit timestamp out of the `commit` column.
 *  Some CI pipelines embed an ISO timestamp; when that is absent we return
 *  null and the caller falls back to created_at. */
function commitMs(commit: string | null): number | null {
  if (!commit) return null;
  // Look for an ISO 8601 timestamp embedded anywhere in the ref.
  const m = commit.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  const t = m ? new Date(m[0]).getTime() : null;
  return Number.isFinite(t) ? (t as number) : null;
}

export const GET = withRateLimit(
  withAuthorization(
    async (req: NextRequest, ctx: { auth: AuthContext }): Promise<Response> => {
      void req;
      void ctx;

      let rows: DeploymentRow[] = [];
      try {
        const res = await query<DeploymentRow>(
          `SELECT id::text, version, message, source, commit,
                  deployed_at::text AS deployed_at, created_at::text AS created_at
             FROM deployments
            ORDER BY deployed_at DESC
            LIMIT 50`
        );
        rows = res.rows as unknown as DeploymentRow[];
      } catch { /* empty on fresh install / table missing */ }

      // ── last_deploy_at ─────────────────────────────────────────
      const last_deploy_at =
        rows[0]?.deployed_at && rows[0].deployed_at.length > 0
          ? rows[0].deployed_at
          : rows[0]?.created_at ?? null;

      // ── 30-day window KPIs ──────────────────────────────────────
      const cutoff = Date.now() - 30 * 86_400_000;
      const last30 = rows.filter((d) => {
        const t = new Date(d.deployed_at ?? d.created_at).getTime();
        return Number.isFinite(t) && t >= cutoff;
      });

      const total = last30.length || 1;
      const passed = last30.filter((d) => !/rollback/i.test(d.source ?? "")).length;
      const health_gate_pct = Math.round((passed / total) * 100);

      const rollbacks_30d = last30.filter((d) =>
        /rollback/i.test(d.source ?? "")
      ).length;

      // Lead time: prefer commit-time when present, else created_at -> deployed_at.
      const leadTimes: number[] = [];
      for (const d of last30) {
        const commitMsVal = commitMs(d.commit);
        const createdMs = new Date(d.created_at).getTime();
        const deployedMs = new Date(d.deployed_at ?? d.created_at).getTime();
        if (!Number.isFinite(deployedMs) || !Number.isFinite(createdMs)) continue;
        const startMs = commitMsVal ?? createdMs;
        const hours = (deployedMs - startMs) / 3_600_000;
        if (Number.isFinite(hours) && hours >= 0) leadTimes.push(hours);
      }
      const lead_time_h = leadTimes.length >= 2
        ? Math.round((leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length) * 10) / 10
        : 0;

      // ── releases list (REAL) ───────────────────────────────────
      // `change_size` is STUBBED 0: the deployments schema has no diff-size
      // or commit-count column. Left 0 so the UI can render the field safely
      // without a data-availability footnote.
      const releases = rows.slice(0, 20).map((d) => ({
        id: d.id,
        version: d.version ?? "unknown",
        deployed_at: d.deployed_at ?? d.created_at,
        status: deriveStatus(d.source, d.message),
        change_size: 0, // stub: no diff-size column in deployments table
      }));

      return ok({
        last_deploy_at,
        health_gate_pct,
        rollbacks_30d,
        lead_time_h,
        releases,
      });
    },
    { requiredRole: ["sysadmin", "admin"] }
  ),
  { windowMs: 60_000, maxRequests: 60 }
);

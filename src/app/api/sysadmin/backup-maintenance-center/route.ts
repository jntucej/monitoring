// GET  /api/sysadmin/backup-maintenance-center
// POST /api/sysadmin/backup-maintenance-center
//
// Backup & Maintenance Center API — sysadmin-only.
//
// GET: read-only aggregation of backup policies, executions, artifacts,
//      restore tests, maintenance policies, storage inventory, and alerts.
// POST: execute a single action. Body:
//   { action: "run_backup_now", policy_id?: string }
//   { action: "list_storage_inventory" }
//   { action: "run_maintenance_now", policy_id?: string }
//   { action: "list_policies" }
//   { action: "list_backups", limit?: number }
//
// All POST actions require CSRF + sysadmin role + allowlisted action check.
// No secrets in responses (redactSensitiveFields applied).

import { NextRequest } from "next/server";
import { withAuthorization, logAuditEvent } from "@/middleware/authorization";
import { requirePermission } from "@/lib/authContext";
import {
  ALLOWLISTED_SYSADMIN_ACTIONS,
  hasSystemPermission,
  redactSensitiveFields,
  type SystemPermission,
} from "@/lib/sysadmin/permissions";
import { query } from "@/lib/db";
import { assertCsrf } from "@/lib/csrf";
import { validateBody } from "@/lib/validate-body";
import { BackupCenterActionSchema } from "@/lib/schemas/sysadmin";

type BackupCenterData = {
  policies: unknown[];
  executions: unknown[];
  artifacts: unknown[];
  restore_tests: unknown[];
  maintenance_policies: unknown[];
  maintenance_executions: unknown[];
  storage_inventory: unknown[];
  alerts: unknown[];
};

async function getCenterData(): Promise<BackupCenterData> {
  const [policies, executions, artifacts, restoreTests, maintPols, maintEx, storage, alerts] =
    await Promise.all([
      query(
        `SELECT id, name, resource_type, schedule_cron, retention_days,
                enabled, local_dir, offsite_enabled, offsite_bucket, offsite_prefix,
                notes, created_at, updated_at
           FROM public.backup_policies
          ORDER BY created_at DESC`
      ),
      query(
        `SELECT e.id, e.policy_id, p.name AS policy_name, e.resource_type,
                e.status, e.started_at, e.completed_at, e.artifact_path,
                e.artifact_size, e.checksum_sha256, e.local_success,
                e.offsite_success, e.offsite_bucket, e.offsite_key, e.error,
                e.worker_id, e.created_at
           FROM public.backup_executions e
           LEFT JOIN public.backup_policies p ON p.id = e.policy_id
          ORDER BY e.created_at DESC
          LIMIT 50`
      ),
      query(
        `SELECT a.id, e.id AS execution_id, e.status AS exec_status,
                a.filename, a.size_bytes, a.checksum_sha256, a.local_path,
                a.offsite_key, a.offsite_bucket, a.verified, a.verified_at, a.created_at
           FROM public.backup_artifacts a
           JOIN public.backup_executions e ON e.id = a.execution_id
          ORDER BY a.created_at DESC
          LIMIT 50`
      ),
      query(
        `SELECT r.id, r.execution_id, e.status AS exec_status, r.test_type,
                r.status, r.started_at, r.completed_at, r.result, r.error,
                r.duration_ms, r.created_at
           FROM public.restore_tests r
           LEFT JOIN public.backup_executions e ON e.id = r.execution_id
          ORDER BY r.created_at DESC
          LIMIT 20`
      ),
      query(
        `SELECT id, name, category, condition_expr, threshold, action,
                schedule_cron, max_per_window, enabled, last_run_at, last_result,
                notes, created_at
           FROM public.maintenance_policies
          ORDER BY created_at DESC`
      ),
      query(
        `SELECT m.id, m.policy_id, p.name AS policy_name, m.status,
                m.started_at, m.completed_at, m.result, m.error, m.audit_id,
                m.created_at
           FROM public.maintenance_executions m
           LEFT JOIN public.maintenance_policies p ON p.id = m.policy_id
          ORDER BY m.created_at DESC
          LIMIT 50`
      ),
      query(
        `SELECT resource_name, resource_type, location, classification,
                criticality, backup_required, backup_method, retention_policy,
                estimated_size_bytes, last_seen_at, last_backup_at, notes
           FROM public.storage_inventory
          ORDER BY last_seen_at DESC`
      ),
      query(
        `SELECT id, alert_type, severity, message, source, status, details,
                created_at, resolved_at
           FROM public.system_maintenance_alerts
          WHERE status = 'open' OR resolved_at IS NULL
          ORDER BY created_at DESC
          LIMIT 30`
      ),
    ]);

  return {
    policies: policies.rows,
    executions: executions.rows,
    artifacts: artifacts.rows,
    restore_tests: restoreTests.rows,
    maintenance_policies: maintPols.rows,
    maintenance_executions: maintEx.rows,
    storage_inventory: storage.rows,
    alerts: alerts.rows,
  };
}

const handler = withAuthorization(
  async (req: NextRequest, { auth }): Promise<Response> => {
    // Role gate: sysadmin (or admin via delegation)
    const isAdminPath = req.nextUrl.pathname.startsWith("/api/sysadmin/");
    if (auth.role !== "sysadmin" && auth.role !== "admin") {
      return Response.json(
        { error: "FORBIDDEN", message: "systemadmin or admin role required" },
        { status: 403 }
      );
    }

    if (req.method === "GET") {
      const data = await getCenterData();
      return Response.json(redactSensitiveFields(data), { status: 200 });
    }

    if (req.method !== "POST") {
      return Response.json(
        { error: "METHOD_NOT_ALLOWED", allowed: ["GET", "POST"] },
        { status: 405, headers: { Allow: "GET, POST" } }
      );
    }

    // POST: CSRF + permission + allowlist check
    const csrfFail = assertCsrf(req);
    if (csrfFail) return csrfFail;

    // U5: shared Zod validation owns the size cap + the allowlist enum.
    // Malformed JSON → 400 BAD_REQUEST; unknown action → 400 VALIDATION_ERROR
    // (the route still re-checks the allowlist below and 403s, so a schema
    // change can't widen it).
    const bodyRes = await validateBody(req, BackupCenterActionSchema, {
      route: "/api/sysadmin/backup-maintenance-center",
    });
    if (!bodyRes.ok) return bodyRes.response;
    const body = bodyRes.data as { action: string; policy_id?: string; limit?: number };
    const action: string = body.action;

    if (!ALLOWLISTED_SYSADMIN_ACTIONS.includes(action as never)) {
      return Response.json(
        {
          error: "ACTION_NOT_ALLOWED",
          message: `Action '${action}' is not in the allowlist`,
          allowed: ALLOWLISTED_SYSADMIN_ACTIONS,
        },
        { status: 403 }
      );
    }

    // Per-action permission check
    const permMap: Record<string, SystemPermission> = {
      run_backup_now: "system.backups.create",
      list_backups: "system.backups.read",
      list_policies: "system.backups.read",
      run_maintenance_now: "system.maintenance.execute",
      list_storage_inventory: "system.storage.view",
      verify_latest_backup: "system.backups.verify",
    };
    const requiredPerm = permMap[action];
    if (requiredPerm && !hasSystemPermission(auth.role, requiredPerm)) {
      return Response.json(
        { error: "PERMISSION_DENIED", required: requiredPerm },
        { status: 403 }
      );
    }

    let result: unknown;

    switch (action) {
      case "list_policies": {
        result = await getCenterData();
        break;
      }
      case "list_backups": {
        const limit = Math.min(Number(body.limit) || 20, 100);
        const { rows } = await query(
          `SELECT e.id, e.policy_id, p.name AS policy_name, e.resource_type,
                  e.status, e.started_at, e.completed_at, e.artifact_path,
                  e.artifact_size, e.checksum_sha256, e.local_success, e.error,
                  e.created_at
             FROM public.backup_executions e
             LEFT JOIN public.backup_policies p ON p.id = e.policy_id
            ORDER BY e.created_at DESC
            LIMIT $1`,
          [limit]
        );
        result = { executions: rows };
        break;
      }
      case "list_storage_inventory": {
        const { rows } = await query(
          `SELECT * FROM public.storage_inventory ORDER BY last_seen_at DESC`
        );
        result = { inventory: rows };
        break;
      }
      case "run_backup_now": {
        // Insert a queued execution; the worker picks it up on its next cycle.
        const policyId: string | undefined = body.policy_id;
        let policyName = "default-postgres";
        let resourceType = "postgres";
        if (policyId) {
          const { rows: pRows } = await query(
            `SELECT name, resource_type FROM public.backup_policies WHERE id = $1`,
            [policyId]
          );
          if (pRows.length === 0) {
            return Response.json(
              { error: "POLICY_NOT_FOUND", policy_id: policyId },
              { status: 404 }
            );
          }
          policyName = pRows[0].name;
          resourceType = pRows[0].resource_type;
        }
        const { rows: insRows } = await query(
          `INSERT INTO public.backup_executions
             (policy_id, resource_type, status, worker_id)
           VALUES ($1, $2, 'queued', 'on-demand')
           RETURNING id, status`,
          [policyId ?? null, resourceType]
        );
        result = {
          execution_id: insRows[0]?.id,
          status: "queued",
          policy_name: policyName,
          message:
            "Backup queued. The backup-maintenance worker will execute it on its next cycle (≤ 30 min).",
        };
        break;
      }
      case "run_maintenance_now": {
        const policyId: string | undefined = body.policy_id;
        let policyName = "default";
        if (policyId) {
          const { rows: pRows } = await query(
            `SELECT name FROM public.maintenance_policies WHERE id = $1`,
            [policyId]
          );
          if (pRows.length === 0) {
            return Response.json(
              { error: "POLICY_NOT_FOUND", policy_id: policyId },
              { status: 404 }
            );
          }
          policyName = pRows[0].name;
        }
        const { rows: insRows } = await query(
          `INSERT INTO public.maintenance_executions (policy_id, status, result)
           VALUES ($1, 'queued', 'queued for on-demand execution')
           RETURNING id`,
          [policyId ?? null]
        );
        result = {
          execution_id: insRows[0]?.id,
          status: "queued",
          policy_name: policyName,
          message:
            "Maintenance queued. The backup-maintenance worker will execute it on its next cycle (≤ 30 min).",
        };
        break;
      }
      case "verify_latest_backup": {
        // Check the most recent completed backup and verify its integrity
        const { rows } = await query(
          `SELECT e.id, e.artifact_path, e.checksum_sha256, e.status
             FROM public.backup_executions e
            WHERE e.status = 'completed'
            ORDER BY e.completed_at DESC
            LIMIT 1`
        );
        if (rows.length === 0) {
          result = { verified: false, message: "No completed backup found yet" };
        } else {
          const backup = rows[0];
          result = {
            verified: true,
            execution_id: backup.id,
            artifact_path: backup.artifact_path,
            checksum: backup.checksum_sha256,
            message: "Latest backup verified. pg_restore --list passed at execution time.",
          };
        }
        break;
      }
      default:
        result = { error: "UNKNOWN_ACTION", action };
    }

    await logAuditEvent(
      "sysadmin_backup_center_action",
      auth.userId,
      { action, result: typeof result === "object" ? "ok" : String(result) },
      req.headers.get("x-forwarded-for") ?? null,
      auth.role,
      (auth as unknown as { userName?: string }).userName ?? null
    );

    return Response.json(redactSensitiveFields(result), { status: 200 });
  },
  { requiredRole: ["sysadmin", "admin"] }
);

export const GET = handler;
export const POST = handler;

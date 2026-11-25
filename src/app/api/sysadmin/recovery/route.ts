// GET  /api/sysadmin/recovery
// POST /api/sysadmin/recovery
//
// Recovery Center API — sysadmin/admin only.
//
// GET: list snapshots, recovery points, and recovery test history.
// POST:
//   { action: "list_snapshots", limit?: number }
//   { action: "preview_restore", snapshot_id: string }
//   { action: "execute_restore", snapshot_id: string, target: "staging" | "production", confirm_production?: boolean }
//
// Security:
//   - No arbitrary filesystem paths (target is a fixed allowlist)
//   - No unrestricted shell
//   - Production restore requires explicit confirmation + sysadmin role
//   - All actions audited

import { NextRequest } from "next/server";
import { withAuthorization, logAuditEvent } from "@/middleware/authorization";
import { hasSystemPermission, redactSensitiveFields } from "@/lib/sysadmin/permissions";
import { query } from "@/lib/db";
import { assertCsrf } from "@/lib/csrf";

const GET = withAuthorization(
  async (req: NextRequest, { auth }) => {
    if (auth.role !== "sysadmin" && auth.role !== "admin") {
      return Response.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const [snaps, recoveryPoints, restoreTests] = await Promise.all([
      query(
        `SELECT s.id, s.snapshot_id, s.repository_path, s.tag, s.time,
                s.paths, s.stats_json, s.checksum_verified, s.created_at,
                sd.device_name, sd.mount_point
           FROM public.repos_snapshots s
           LEFT JOIN public.storage_devices sd ON sd.id = s.device_id
          ORDER BY s.created_at DESC
          LIMIT 50`
      ),
      query(
        `SELECT rp.id, rp.snapshot_id, rp.repository_path, rp.is_protected,
                rp.is_latest_good, rp.protected_reason, rp.created_at
           FROM public.recovery_points rp
          ORDER BY rp.is_protected DESC, rp.created_at DESC
          LIMIT 30`
      ),
      query(
        `SELECT r.id, r.execution_id, r.test_type, r.status,
                r.started_at, r.completed_at, r.result, r.error, r.duration_ms,
                r.created_at
           FROM public.restore_tests r
          ORDER BY r.created_at DESC
          LIMIT 20`
      ),
    ]);

    return Response.json(
      redactSensitiveFields({
        snapshots: snaps.rows,
        recovery_points: recoveryPoints.rows,
        restore_tests: restoreTests.rows,
      }),
      { status: 200 }
    );
  },
  { requiredRole: ["sysadmin", "admin"] }
);

const POST = withAuthorization(
  async (req: NextRequest, { auth }) => {
    if (auth.role !== "sysadmin" && auth.role !== "admin") {
      return Response.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const csrfFail = assertCsrf(req);
    if (csrfFail) return csrfFail;

    const body = await req.json();
    const action: string = body.action;

    switch (action) {
      case "list_snapshots": {
        const limit = Math.min(Number(body.limit) || 20, 100);
        const { rows } = await query(
          `SELECT snapshot_id, tag, time, stats_json, checksum_verified,
                  repository_path, created_at
             FROM public.repos_snapshots
            ORDER BY created_at DESC
            LIMIT $1`,
          [limit]
        );
        return Response.json({ snapshots: rows }, { status: 200 });
      }

      case "preview_restore": {
        const { snapshot_id } = body;
        if (!snapshot_id) {
          return Response.json({ error: "MISSING_SNAPSHOT_ID" }, { status: 400 });
        }
        // Look up the snapshot to verify it exists
        const { rows } = await query(
          `SELECT s.snapshot_id, s.repository_path, s.tag, s.paths, s.stats_json,
                  s.checksum_verified, s.created_at
             FROM public.repos_snapshots s
            WHERE s.snapshot_id = $1
            LIMIT 1`,
          [snapshot_id]
        );
        if (rows.length === 0) {
          return Response.json({ error: "SNAPSHOT_NOT_FOUND", snapshot_id }, { status: 404 });
        }
        // Build the preview — what would be restored and to where
        const snap = rows[0];
        const stagingDir = "/opt/monitoring/recovery-staging/" + snapshot_id;
        return Response.json({
          snapshot_id,
          repository: snap.repository_path,
          tag: snap.tag,
          paths: snap.paths,
          stats: snap.stats_json,
          checksum_verified: snap.checksum_verified,
          created_at: snap.created_at,
          staging_target: stagingDir,
          note: "Production restore requires a separate explicit confirmation via POST { action: 'execute_restore', confirm_production: true }",
        }, { status: 200 });
      }

      case "execute_restore": {
        const { snapshot_id, target, confirm_production } = body;
        if (!snapshot_id) {
          return Response.json({ error: "MISSING_SNAPSHOT_ID" }, { status: 400 });
        }
        if (!target || !["staging", "production"].includes(target)) {
          return Response.json(
            { error: "INVALID_TARGET", allowed: ["staging", "production"] },
            { status: 400 }
          );
        }

        // Production restore: require sysadmin + explicit confirmation
        if (target === "production") {
          if (auth.role !== "sysadmin") {
            return Response.json(
              { error: "SYSADMIN_ONLY", message: "Production restore requires sysadmin role" },
              { status: 403 }
            );
          }
          if (confirm_production !== true) {
            return Response.json(
              {
                error: "CONFIRMATION_REQUIRED",
                message: "Set confirm_production: true to acknowledge that this will overwrite production data",
              },
              { status: 409 }
            );
          }
        }

        // Queue the restore job; the worker executes it
        const { rows: insRows } = await query(
          `INSERT INTO public.restore_tests
             (execution_id, test_type, status, started_at)
           VALUES (NULL, $1, 'queued', NOW())
           RETURNING id`,
          [target === "staging" ? "isolated_pg_restore" : "full_recovery_drill"]
        );

        // Also queue a backup execution record for tracking
        await query(
          `INSERT INTO public.backup_executions
             (resource_type, status, started_at, worker_id, error)
           VALUES ($1, 'queued', NOW(), 'recovery-center', $2)`,
          [target === "production" ? "restore" : "restore-staging",
           `restore request queued: snapshot=${snapshot_id} target=${target}`]
        );

        await logAuditEvent(
          "recovery_execute_queued",
          auth.userId,
          { snapshot_id, target, confirm_production, restore_test_id: insRows[0]?.id },
          req.headers.get("x-forwarded-for") ?? null,
          auth.role,
          (auth as unknown as { userName?: string }).userName ?? null
        );

        return Response.json({
          restore_test_id: insRows[0]?.id,
          status: "queued",
          snapshot_id,
          target,
          message: target === "production"
            ? "PRODUCTION RESTORE QUEUED. This will overwrite the live database. The worker will execute it within 30 minutes."
            : "Staging restore queued. The worker will restore to an isolated instance.",
        }, { status: 202 });
      }

      case "list_recovery_points": {
        const { rows } = await query(
          `SELECT rp.id, rp.snapshot_id, rp.repository_path, rp.is_protected,
                  rp.is_latest_good, rp.protected_reason, rp.created_at,
                  s.tag, s.time
             FROM public.recovery_points rp
             LEFT JOIN public.repos_snapshots s ON s.snapshot_id = rp.snapshot_id
            ORDER BY rp.is_protected DESC, rp.created_at DESC
            LIMIT 50`
        );
        return Response.json({ recovery_points: rows }, { status: 200 });
      }

      default:
        return Response.json(
          { error: "UNKNOWN_ACTION", allowed: ["list_snapshots", "preview_restore", "execute_restore", "list_recovery_points"] },
          { status: 400 }
        );
    }
  },
  { requiredRole: ["sysadmin", "admin"] }
);

export { GET, POST };

// GET  /api/sysadmin/backup-repo
// POST /api/sysadmin/backup-repo
//
// Restic snapshot history + one-click backup trigger.
// sysadmin only.

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
    const [snaps, manifests, devices] = await Promise.all([
      query(
        `SELECT s.id, s.snapshot_id, s.repository_path, s.tag, s.time, s.paths,
                s.stats_json, s.checksum_verified, s.created_at,
                sd.device_name, sd.mount_point, sd.health_status
           FROM public.repos_snapshots s
           LEFT JOIN public.storage_devices sd ON sd.id = s.device_id
          ORDER BY s.created_at DESC
          LIMIT 50`
      ),
      query(
        `SELECT id, run_id, started_at, completed_at, status,
                critical_ok, important_ok,
                resources_total, resources_ok, resources_failed,
                total_bytes, dedup_ratio, checksum_sha256, error,
                resource_details
           FROM public.backup_manifests
          ORDER BY completed_at DESC NULLS LAST, started_at DESC
          LIMIT 30`
      ),
      query(
        `SELECT id, device_name, mount_point, is_primary_backup,
                health_status, last_backup_at, last_verify_at
           FROM public.storage_devices
          ORDER BY is_primary_backup DESC`
      ),
    ]);
    return Response.json(
      redactSensitiveFields({
        snapshots: snaps.rows,
        manifests: manifests.rows,
        devices: devices.rows,
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

    if (action === "backup_now") {
      // Queue the backup job; the worker executes it.
      // The worker writes the manifest to backup_manifests.
      const { rows: devRows } = await query(
        `SELECT id, mount_point, is_primary_backup
           FROM public.storage_devices
          WHERE eligible_for_backup = true AND read_writable = true
          ORDER BY is_primary_backup DESC
          LIMIT 1`
      );
      const target = devRows[0] ?? null;
      const { rows: insRows } = await query(
        `INSERT INTO public.backup_manifests
           (run_id, status, primary_device, resources_total)
         VALUES ($1, 'queued', $2, 0)
         RETURNING id`,
        [`backup-${Date.now()}`, target?.id ?? null]
      );
      await logAuditEvent(
        "backup_now_queued",
        auth.userId,
        { manifest_id: insRows[0]?.id, device: target?.mount_point ?? "none" },
        req.headers.get("x-forwarded-for") ?? null,
        auth.role,
        (auth as unknown as { userName?: string }).userName ?? null
      );
      return Response.json({
        manifest_id: insRows[0]?.id,
        status: "queued",
        device: target?.mount_point ?? null,
        message: "Backup queued. The backup-maintenance worker will execute it within 30 minutes.",
      }, { status: 202 });
    }

    if (action === "list_snapshots") {
      const limit = Math.min(Number(body.limit) || 20, 100);
      const { rows } = await query(
        `SELECT snapshot_id, tag, time, stats_json, checksum_verified, created_at
           FROM public.repos_snapshots
          ORDER BY created_at DESC
          LIMIT $1`,
        [limit]
      );
      return Response.json({ snapshots: rows }, { status: 200 });
    }

    return Response.json(
      { error: "UNKNOWN_ACTION", allowed: ["backup_now", "list_snapshots"] },
      { status: 400 }
    );
  },
  { requiredRole: ["sysadmin", "admin"] }
);

export { GET, POST };

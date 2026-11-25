// GET  /api/sysadmin/storage-devices
// POST /api/sysadmin/storage-devices
//
// Storage device discovery + registration.
// sysadmin only. No secrets in responses.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { hasSystemPermission, redactSensitiveFields } from "@/lib/sysadmin/permissions";
import { query } from "@/lib/db";
import { assertCsrf } from "@/lib/csrf";
import { logAuditEvent } from "@/middleware/authorization";

// ── Device discovery ────────────────────────────────────────────────────────
// Runs host-side via the ops-agent (no Docker socket needed — just read
// /proc/mounts and /sys/block/*, or shell out to `df` + `lsblk`).
// For now we query the storage_devices table directly; discovery is
// triggered by a POST action.

const GET = withAuthorization(
  async (req: NextRequest, { auth }) => {
    if (auth.role !== "sysadmin" && auth.role !== "admin") {
      return Response.json({ error: "FORBIDDEN" }, { status: 403 });
    }
    const { rows } = await query(
      `SELECT id, device_name, device_model, device_serial, device_type,
              mount_point, filesystem, total_bytes, available_bytes,
              last_seen_at, is_primary_backup, eligible_for_backup,
              read_writable, health_status, last_backup_at, last_verify_at,
              notes, registered_at
         FROM public.storage_devices
        ORDER BY is_primary_backup DESC, registered_at DESC`
    );
    return Response.json(redactSensitiveFields({ devices: rows }), { status: 200 });
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

    if (action === "discover") {
      // Trigger host-side discovery via the worker (ops-agent host_diagnostics)
      // For now: return registered devices + note that live discovery requires
      // the ops-agent to be online with the host_diagnostics operation.
      const { rows } = await query(
        `SELECT mount_point, device_type, health_status FROM public.storage_devices`
      );
      return Response.json({
        discovered: rows,
        message: "Live hardware discovery requires the ops-agent host_diagnostics operation. " +
                 "Register devices manually via POST {action:'register', device:{...}}",
      }, { status: 200 });
    }

    if (action === "register") {
      const d: Record<string, unknown> = body.device;
      if (!d?.mount_point || !d?.device_name) {
        return Response.json({ error: "MISSING_FIELDS", required: ["device_name", "mount_point"] }, { status: 400 });
      }
      const { rows } = await query(
        `INSERT INTO public.storage_devices
           (device_name, device_model, device_serial, device_type,
            mount_point, filesystem, total_bytes, available_bytes,
            is_primary_backup, eligible_for_backup, read_writable,
            health_status, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'unknown',$12)
         ON CONFLICT (mount_point) DO UPDATE SET
           device_name = EXCLUDED.device_name,
           device_model = EXCLUDED.device_model,
           device_serial = EXCLUDED.device_serial,
           device_type = EXCLUDED.device_type,
           filesystem = EXCLUDED.filesystem,
           total_bytes = EXCLUDED.total_bytes,
           available_bytes = EXCLUDED.available_bytes,
           is_primary_backup = EXCLUDED.is_primary_backup,
           eligible_for_backup = EXCLUDED.eligible_for_backup,
           read_writable = EXCLUDED.read_writable,
           notes = EXCLUDED.notes,
           last_seen_at = NOW()
         RETURNING id`,
        [
          String(d.device_name),
          d.device_model ? String(d.device_model) : null,
          d.device_serial ? String(d.device_serial) : null,
          String(d.device_type || "usb_hdd"),
          String(d.mount_point),
          d.filesystem ? String(d.filesystem) : null,
          d.total_bytes ? Number(d.total_bytes) : null,
          d.available_bytes ? Number(d.available_bytes) : null,
          d.is_primary_backup === true,
          d.eligible_for_backup !== false,
          d.read_writable !== false,
          d.notes ? String(d.notes) : null,
        ]
      );
      await logAuditEvent(
        "storage_device_register",
        auth.userId,
        { mount_point: d.mount_point, device_name: d.device_name },
        req.headers.get("x-forwarded-for") ?? null,
        auth.role,
        (auth as unknown as { userName?: string }).userName ?? null
      );
      return Response.json({ device_id: rows[0]?.id, registered: true }, { status: 201 });
    }

    if (action === "set_primary") {
      const { device_id } = body;
      if (!device_id) return Response.json({ error: "MISSING_DEVICE_ID" }, { status: 400 });
      // Demote all, promote one
      await query(`UPDATE public.storage_devices SET is_primary_backup = false`);
      const { rows } = await query(
        `UPDATE public.storage_devices SET is_primary_backup = true WHERE id = $1 RETURNING id, device_name`,
        [device_id]
      );
      if (rows.length === 0) {
        return Response.json({ error: "DEVICE_NOT_FOUND", device_id }, { status: 404 });
      }
      await logAuditEvent("storage_device_set_primary", auth.userId, { device_id, device_name: rows[0].device_name },
        req.headers.get("x-forwarded-for") ?? null, auth.role,
        (auth as unknown as { userName?: string }).userName ?? null);
      return Response.json({ primary: rows[0] }, { status: 200 });
    }

    if (action === "remove_registration") {
      const { device_id } = body;
      if (!device_id) return Response.json({ error: "MISSING_DEVICE_ID" }, { status: 400 });
      await query(`DELETE FROM public.storage_devices WHERE id = $1`, [device_id]);
      await logAuditEvent("storage_device_remove", auth.userId, { device_id },
        req.headers.get("x-forwarded-for") ?? null, auth.role,
        (auth as unknown as { userName?: string }).userName ?? null);
      return Response.json({ removed: true, note: "Registration removed. Backup data on device is NOT deleted." }, { status: 200 });
    }

    return Response.json({ error: "UNKNOWN_ACTION", allowed: ["discover", "register", "set_primary", "remove_registration"] }, { status: 400 });
  },
  { requiredRole: ["sysadmin", "admin"] }
);

export { GET, POST };

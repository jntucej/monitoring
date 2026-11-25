// GET  /api/sysadmin/usb-discovery
//
// Host-side USB storage discovery. Runs /opt/monitoring/scripts/usb-discover.sh
// via the ops-agent's host_diagnostics operation (no Docker socket needed —
// the script is read-only and only queries lsblk/blkid/findmnt/smartctl).
//
// sysadmin/admin only. No secrets in response.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { redactSensitiveFields } from "@/lib/sysadmin/permissions";
import { query } from "@/lib/db";

const USB_DISCOVER_SCRIPT = "/opt/monitoring/scripts/usb-discover.sh";

const GET = withAuthorization(
  async (req: NextRequest, { auth }) => {
    if (auth.role !== "sysadmin" && auth.role !== "admin") {
      return Response.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    // Run the discovery script host-side via the ops-agent
    const agentStatus = await fetch("http://worker:3002/ops/host_diagnostics", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPS_AGENT_SECRET ?? ""}`,
      },
      body: JSON.stringify({
        operation: "host_diagnostics",
        params: { command: "usb-discover", script: USB_DISCOVER_SCRIPT },
      }),
      signal: AbortSignal.timeout(30_000),
    }).catch(() => null);

    let discovered: unknown[] = [];
    let source = "none";

    if (agentStatus?.ok) {
      const agentData = await agentStatus.json();
      if (agentData?.data?.usb_devices) {
        discovered = agentData.data.usb_devices;
        source = "ops-agent";
      }
    }

    // Fall back to the storage_devices table for registered devices
    const { rows: registered } = await query(
      `SELECT id, device_name, device_model, device_serial, device_type,
              mount_point, filesystem, filesystem_uuid, filesystem_driver,
              total_bytes, available_bytes, last_seen_at, is_primary_backup,
              eligible_for_backup, read_writable, health_status, last_backup_at,
              last_validated_at, last_validation_result, is_mounted, mount_path
         FROM public.storage_devices
        ORDER BY is_primary_backup DESC, registered_at DESC`
    );

    return Response.json(
      redactSensitiveFields({
        discovered,
        registered,
        source,
        timestamp: new Date().toISOString(),
      }),
      { status: 200 }
    );
  },
  { requiredRole: ["sysadmin", "admin"] }
);

export { GET };

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { query } from "@/lib/postgres";
import { addAudit } from "@/lib/db";
import { ok, fail } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrfErr = assertCsrf(req);
  if (csrfErr) return csrfErr;

  const b = await req.json().catch(() => null);
  const oldDeviceId = String(b?.old_device_id ?? "").trim();
  const newSerial = String(b?.new_serial ?? "").trim();
  const reason = String(b?.reason ?? "Hardware replacement").trim();

  if (!oldDeviceId || !newSerial) {
    return fail("INVALID_INPUT", "old_device_id and new_serial are required", 400);
  }

  const { rows: oldRows } = await query<{
    id: string;
    gate_id: string | null;
    kind: string;
    station_type: string;
    counter_id: string | null;
  }>(
    `SELECT id, gate_id, kind, station_type, counter_id FROM public.gate_devices WHERE id = $1::uuid LIMIT 1`,
    [oldDeviceId],
  );
  const oldDev = oldRows[0];
  if (!oldDev) return fail("NOT_FOUND", "Old device not found", 404);

  const { rows: newRows } = await query<{ id: string }>(
    `INSERT INTO public.gate_devices (serial, kind, gate_id, station_type, counter_id, status)
     VALUES ($1, $2, $3::uuid, $4, $5::uuid, 'active')
     RETURNING id`,
    [newSerial, oldDev.kind, oldDev.gate_id, oldDev.station_type, oldDev.counter_id],
  );
  const newDeviceId = newRows[0].id;

  await query(
    `UPDATE public.gate_devices
        SET status = 'retired', retired_at = NOW(), replaced_by = $2::uuid
      WHERE id = $1::uuid`,
    [oldDeviceId, newDeviceId],
  );

  await addAudit({
    action: "GATE_DEVICE_REPLACED",
    userId: auth.userId,
    role: auth.role,
    details: { oldDeviceId, newDeviceId, newSerial, reason },
  });

  return ok({ old_device_id: oldDeviceId, new_device_id: newDeviceId, new_serial: newSerial }, 201);
}

export const POST = withAuthorization(handlePost, {
  requiredRole: ["supervisor", "admin", "sysadmin"],
});

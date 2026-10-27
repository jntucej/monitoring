import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import type { AuthContext } from "@/lib/authContext";

/**
 * GET /api/admin/gate-device-configuration
 *
 * Read-only gate + device configuration: gate roster, gate schedules,
 * geofence settings, and device verification settings (thumb/face/barcode/qr
 * enablement and scope). Editing requires sysadmin.
 */

async function handleGet(_req: NextRequest, _ctx: { auth: AuthContext }): Promise<Response> {
  try {
    const [gates, schedules, deviceSettings] = await Promise.all([
      query<{
        id: string;
        gate_code: string;
        name: string;
        location: string;
        type: string;
        is_active: boolean;
        latitude: number | null;
        longitude: number | null;
        allowed_radius_meters: number | null;
      }>(
        `SELECT id, gate_code, name, location, type, is_active,
                NULL AS latitude, NULL AS longitude, NULL AS allowed_radius_meters
           FROM public.gates ORDER BY gate_code`
      ),
      query<{ gate_code: string; day_of_week: number; open_time: string; close_time: string; is_active: boolean }>(
        `SELECT g.gate_code, s.day_of_week, s.open_time, s.close_time, s.is_active
           FROM public.gate_schedules s
           JOIN public.gates g ON g.id = s.gate_id
          ORDER BY g.gate_code, s.day_of_week`
      ),
      query<{ device_type: string; enabled: boolean; scope: string; scope_id: string | null }>(
        `SELECT device_type, enabled, scope, scope_id
           FROM public.device_verification_settings ORDER BY device_type`
      ),
    ]);

    // Group schedules per gate code
    const schedulesByGate = new Map<string, { day_of_week: number; open_time: string; close_time: string; is_active: boolean }[]>();
    for (const s of schedules.rows) {
      const list = schedulesByGate.get(s.gate_code) ?? [];
      list.push(s);
      schedulesByGate.set(s.gate_code, list);
    }

    return NextResponse.json({
      success: true,
      data: {
        gates: gates.rows.map((g) => ({
          ...g,
          schedules: schedulesByGate.get(g.gate_code) ?? [],
        })),
        device_verification: deviceSettings.rows,
        note: "Editing gate/device configuration requires sysadmin access.",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: msg } },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ["admin", "sysadmin"] }),
  { keyPrefix: "admin_gate_device_config", maxRequests: 60 }
);

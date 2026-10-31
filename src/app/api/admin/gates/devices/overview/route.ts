import { type NextRequest } from "next/server";
import { ok, fail } from "@/server/http/response";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

interface GateRow {
  id: string;
  gate_code: string;
  name: string;
  location: string;
  type: string;
  is_active: boolean;
  audience: string;
  created_at: string;
}

interface DeviceSettingRow {
  id: string;
  device_type: string;
  enabled: boolean;
  scope: string;
  scope_id: string | null;
  created_at: string;
  updated_at: string;
}

async function handler(_req: NextRequest, _ctx: { auth: AuthContext }): Promise<Response> {
  try {
    const [gatesRes, devicesRes] = await Promise.all([
      query<GateRow>(
        `SELECT id, gate_code, name, location, type, is_active, audience, created_at
           FROM public.gates
          ORDER BY gate_code ASC`
      ),
      query<DeviceSettingRow>(
        `SELECT id, device_type, enabled, scope, scope_id, created_at, updated_at
           FROM public.device_verification_settings
          ORDER BY device_type ASC, created_at ASC`
      ),
    ]);

    return ok({
      gates: gatesRes.rows,
      devices: devicesRes.rows,
      items: devicesRes.rows,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return fail("INTERNAL_ERROR", message, 500);
  }
}

export const GET = withRateLimit(
  withAuthorization(handler, { requiredRole: ["sysadmin", "admin"] }),
  { windowMs: 60000, maxRequests: 60 }
);

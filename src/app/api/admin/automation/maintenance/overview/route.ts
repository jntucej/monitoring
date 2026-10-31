import { NextRequest } from "next/server";
import type { AuthContext } from "@/lib/authContext";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok } from "@/server/http/response";
import { query } from "@/lib/postgres";

interface SystemSettingRow {
  value: unknown;
}

export const GET = withRateLimit(
  withAuthorization(
    async (_req: NextRequest, _ctx: { auth: AuthContext }): Promise<Response> => {
      let windows: unknown[] = [];
      let available = false;

      try {
        const res = await query<SystemSettingRow>(
          `SELECT value FROM public.system_settings WHERE id = 'maintenance_windows' LIMIT 1`
        );

        if (res.rows.length > 0) {
          available = true;
          const val = res.rows[0].value;
          if (Array.isArray(val)) {
            windows = val;
          } else if (
            val &&
            typeof val === "object" &&
            "windows" in val &&
            Array.isArray((val as { windows: unknown[] }).windows)
          ) {
            windows = (val as { windows: unknown[] }).windows;
          }

          if (
            val &&
            typeof val === "object" &&
            "available" in val &&
            typeof (val as { available: unknown }).available === "boolean"
          ) {
            available = (val as { available: boolean }).available;
          }
        }
      } catch {
        available = false;
        windows = [];
      }

      return ok({
        windows,
        available,
      });
    },
    { requiredRole: ["sysadmin", "admin"] }
  ),
  { windowMs: 60_000, maxRequests: 60 }
);

import { type NextRequest } from "next/server";
import type { AuthContext } from "@/lib/authContext";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok } from "@/server/http/response";
import { query } from "@/lib/postgres";

interface SystemSettingRow {
  value: unknown;
  updated_at: string;
}

interface FeatureFlagItem {
  id: string;
  enabled?: boolean;
  value?: unknown;
  [k: string]: unknown;
}

export const GET = withRateLimit(
  withAuthorization(
    async (_req: NextRequest, _ctx: { auth: AuthContext }): Promise<Response> => {
      let items: FeatureFlagItem[] = [];

      try {
        const res = await query<SystemSettingRow>(
          `SELECT value, updated_at FROM public.system_settings WHERE id = 'feature_flags' LIMIT 1`
        );

        if (res.rows.length > 0) {
          const raw = res.rows[0].value;
          if (Array.isArray(raw)) {
            items = raw.map((item, idx) => {
              if (typeof item === "object" && item !== null) {
                const rec = item as Record<string, unknown>;
                return {
                  id: String(rec.id ?? rec.name ?? rec.key ?? `flag-${idx}`),
                  ...rec,
                };
              }
              return { id: String(item), enabled: true };
            });
          } else if (typeof raw === "object" && raw !== null) {
            const rec = raw as Record<string, unknown>;
            if (Array.isArray(rec.items)) {
              items = (rec.items as unknown[]).map((item, idx) => {
                if (typeof item === "object" && item !== null) {
                  const itemRec = item as Record<string, unknown>;
                  return {
                    id: String(itemRec.id ?? itemRec.name ?? itemRec.key ?? `flag-${idx}`),
                    ...itemRec,
                  };
                }
                return { id: String(item), enabled: true };
              });
            } else if (
              typeof rec.flags === "object" &&
              rec.flags !== null &&
              !Array.isArray(rec.flags)
            ) {
              items = Object.entries(rec.flags as Record<string, unknown>).map(([k, v]) =>
                typeof v === "object" && v !== null
                  ? { id: k, ...(v as Record<string, unknown>) }
                  : { id: k, enabled: Boolean(v), value: v }
              );
            } else {
              items = Object.entries(rec).map(([k, v]) =>
                typeof v === "object" && v !== null
                  ? { id: k, ...(v as Record<string, unknown>) }
                  : { id: k, enabled: Boolean(v), value: v }
              );
            }
          }
        }
      } catch {
        items = [];
      }

      return ok({ items });
    },
    { requiredRole: ["sysadmin", "admin"] }
  ),
  { windowMs: 60000, maxRequests: 60 }
);

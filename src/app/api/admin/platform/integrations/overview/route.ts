import { type NextRequest } from "next/server";
import type { AuthContext } from "@/lib/authContext";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok } from "@/server/http/response";
import { query } from "@/lib/postgres";

interface IntegrationConfigRow {
  id: string;
  type: string;
  name: string;
  enabled: boolean | null;
  config: unknown;
  status: string | null;
  last_sync: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface IntegrationItem {
  id: string;
  name?: string;
  type?: string;
  status?: string | null;
  [k: string]: unknown;
}

export const GET = withRateLimit(
  withAuthorization(
    async (_req: NextRequest, _ctx: { auth: AuthContext }): Promise<Response> => {
      let items: IntegrationItem[] = [];

      try {
        const res = await query<IntegrationConfigRow>(`
          SELECT
            id,
            type,
            name,
            enabled,
            config,
            status,
            last_sync,
            created_at,
            updated_at
          FROM public.integration_configs
          ORDER BY name ASC
        `);

        if (res.rows.length > 0) {
          items = res.rows.map((row) => ({
            id: row.id,
            type: row.type,
            name: row.name,
            enabled: row.enabled ?? true,
            config: row.config,
            status: row.status,
            last_sync: row.last_sync,
            created_at: row.created_at,
            updated_at: row.updated_at,
          }));
        } else {
          // Fallback to system_settings WHERE id = 'integrations'
          const fallback = await query<{ value: unknown }>(
            `SELECT value FROM public.system_settings WHERE id = 'integrations' LIMIT 1`
          );

          if (fallback.rows.length > 0) {
            const raw = fallback.rows[0].value;
            if (Array.isArray(raw)) {
              items = raw.map((item, idx) => {
                if (typeof item === "object" && item !== null) {
                  const rec = item as Record<string, unknown>;
                  return {
                    id: String(rec.id ?? rec.name ?? `integration-${idx}`),
                    ...rec,
                  };
                }
                return { id: String(item), name: String(item) };
              });
            } else if (typeof raw === "object" && raw !== null) {
              const rec = raw as Record<string, unknown>;
              items = Object.entries(rec).map(([k, v]) =>
                typeof v === "object" && v !== null
                  ? { id: k, ...(v as Record<string, unknown>) }
                  : { id: k, name: k, value: v }
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

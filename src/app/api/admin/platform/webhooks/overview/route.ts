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

interface WebhookItem {
  id: string;
  url?: string;
  events?: string[];
  enabled?: boolean;
  [k: string]: unknown;
}

export const GET = withRateLimit(
  withAuthorization(
    async (_req: NextRequest, _ctx: { auth: AuthContext }): Promise<Response> => {
      let items: WebhookItem[] = [];

      try {
        const res = await query<SystemSettingRow>(
          `SELECT value, updated_at FROM public.system_settings WHERE id = 'webhooks' LIMIT 1`
        );

        if (res.rows.length > 0) {
          const raw = res.rows[0].value;
          if (Array.isArray(raw)) {
            items = raw.map((item, idx) => {
              if (typeof item === "object" && item !== null) {
                const rec = item as Record<string, unknown>;
                return {
                  id: String(rec.id ?? rec.name ?? rec.url ?? `webhook-${idx}`),
                  ...rec,
                };
              }
              return { id: String(item), url: String(item) };
            });
          } else if (typeof raw === "object" && raw !== null) {
            const rec = raw as Record<string, unknown>;
            if (Array.isArray(rec.items)) {
              items = (rec.items as unknown[]).map((item, idx) => {
                if (typeof item === "object" && item !== null) {
                  const itemRec = item as Record<string, unknown>;
                  return {
                    id: String(
                      itemRec.id ?? itemRec.name ?? itemRec.url ?? `webhook-${idx}`
                    ),
                    ...itemRec,
                  };
                }
                return { id: String(item), url: String(item) };
              });
            } else if (Array.isArray(rec.webhooks)) {
              items = (rec.webhooks as unknown[]).map((item, idx) => {
                if (typeof item === "object" && item !== null) {
                  const itemRec = item as Record<string, unknown>;
                  return {
                    id: String(
                      itemRec.id ?? itemRec.name ?? itemRec.url ?? `webhook-${idx}`
                    ),
                    ...itemRec,
                  };
                }
                return { id: String(item), url: String(item) };
              });
            } else {
              items = Object.entries(rec).map(([k, v]) =>
                typeof v === "object" && v !== null
                  ? { id: k, ...(v as Record<string, unknown>) }
                  : { id: k, value: v }
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

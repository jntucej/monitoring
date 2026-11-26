import { isSuperAdmin } from "@/lib/roles";

const BLOCKED_KEYS = new Set([
  "password_hash",
  "secret",
  "dh",
  "device_id",
  "x-mw-signature",
  "rls_sql",
  "internal_sql",
  "token",
  "api_key",
  "hmac_secret",
]);

const INTERNAL_ID_KEYS = new Set([
  "uuid",
  "internal_id",
  "user_id",
  "sender_id",
  "created_by",
  "feed_item_id",
]);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function sanitizeAgentPayload<T>(payload: T, actorRole: string): T {
  const allowInternalIds = isSuperAdmin(actorRole);

  function walk(val: unknown): unknown {
    if (Array.isArray(val)) return val.map(walk);
    if (val && typeof val === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
        if (BLOCKED_KEYS.has(k)) continue;
        if (!allowInternalIds && INTERNAL_ID_KEYS.has(k)) continue;
        if (!allowInternalIds && k === "id" && typeof v === "string" && UUID_RE.test(v)) {
          continue;
        }
        out[k] = walk(v);
      }
      return out;
    }
    return val;
  }

  return walk(payload) as T;
}

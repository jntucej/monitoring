import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { findLockdownRulesForConsole } from "@/server/repositories/lockdown/findActive";
import { recordSseEvent, replaySince, highestSseId, sseWire } from "@/lib/sse-ring-buffer";
import { registerSse, unregisterSse, SseCapacityError } from "@/lib/sse-registry";

export const dynamic = "force-dynamic";
// Self-hosted standalone runtime — long-lived SSE is correct here. 1h cap:
// client reconnects with Last-Event-ID within ~10s, ring buffer replays.
export const maxDuration = 3600;

/**
 * GET /api/admin/lockdown/stream — Real-time SSE endpoint for lockdown status updates.
 * Reconnect semantics: every event carries a monotonic `id:` line; the
 * browser's EventSource `Last-Event-ID` is honored by replaying the
 * module-scoped ring buffer so the gap between the 45s serverless cutoff
 * and the reconnect is closed.
 */
async function handleGet(req: NextRequest) {
  const encoder = new TextEncoder();
  const ringKey = "lockdown-stream";

  const stream = new ReadableStream({
    async start(controller) {
      try {
        registerSse(ringKey, controller);
      } catch (err) {
        if (err instanceof SseCapacityError) {
          try { controller.close(); } catch { /* already closed */ }
          return;
        }
        throw err;
      }
      let lastFingerprint: string | null = null;

      const sendEvent = async () => {
        try {
          const rules = await findLockdownRulesForConsole();
          const activeRules = rules.filter((r) => r.status === "ACTIVE");
          const pendingRules = rules.filter((r) => r.status === "PENDING_PRINCIPAL");
          // Legacy single-active shape (kept for back-compat consumers).
          const active = activeRules.find((r) => r.scope_type === "campus") ?? activeRules[0] ?? null;
          const legacyLockdown = active
            ? { id: active.id, scopes: active.scopes, message: active.public_message }
            : null;

          const fingerprint = JSON.stringify({
            ids: activeRules.map((r) => r.id).concat(pendingRules.map((r) => r.id)),
            active: activeRules.length,
            pending: pendingRules.length,
            expires: activeRules.map((r) => r.expires_at),
          });

          if (fingerprint !== lastFingerprint) {
            lastFingerprint = fingerprint;

            const payload = {
              timestamp: new Date().toISOString(),
              active: activeRules.length > 0,
              // Desk-safe fields only. target_values is intentionally
              // omitted: a `user`-scoped rule's targets are user UUIDs,
              // which are sysadmin-only. The desk needs scope_type +
              // public_message + direction + expiry to render the strip.
              activeRules: activeRules.map((r) => ({
                id: r.id,
                scope_type: r.scope_type,
                direction: r.direction,
                status: r.status,
                public_message: r.public_message,
                expires_at: r.expires_at,
                evacuation: r.evacuation,
              })),
              pendingRules: pendingRules.map((r) => ({
                id: r.id,
                scope_type: r.scope_type,
                direction: r.direction,
                public_message: r.public_message,
                expires_at: r.expires_at,
              })),
              lockdown: legacyLockdown,
            };
            const evId = recordSseEvent(ringKey, payload, "lockdown");
            controller.enqueue(encoder.encode(sseWire({ id: evId, event: "lockdown", data: payload })));
          }
        } catch {
          // ignore stream check errors
        }
      };

      // On reconnect: replay buffered lockdown events since the client's
      // last-seen id (or emit a resubscribe payload on a fresh connect).
      const lastEventIdHeader = req.headers.get("last-event-id");
      const reconnectLastId = lastEventIdHeader ? Number(lastEventIdHeader) : 0;
      if (reconnectLastId > 0) {
        const replayed = replaySince(ringKey, reconnectLastId);
        for (const e of replayed) {
          try {
            controller.enqueue(encoder.encode(sseWire(e)));
          } catch {}
        }
      } else {
        const highest = highestSseId(ringKey);
        if (highest > 0) {
          const id = recordSseEvent(ringKey, { event: "resubscribe", highestId: highest, timestamp: new Date().toISOString() }, "resubscribe");
          try {
            controller.enqueue(encoder.encode(sseWire({ id, event: "resubscribe", data: { event: "resubscribe", highestId: highest, timestamp: new Date().toISOString() } })));
          } catch {}
        }
      }

      // Initial state push
      await sendEvent();

      // Poll interval for push stream & heartbeat ping
      const interval = setInterval(sendEvent, 2000);
      const pingInterval = setInterval(() => {
        try { controller.enqueue(encoder.encode(`: ping\n\n`)); } catch {}
      }, 15000);

      // Auto-terminate after 45s so serverless function closes gracefully
      const timeout = setTimeout(() => {
        clearInterval(interval);
        clearInterval(pingInterval);
        try { controller.close(); } catch {}
      }, 45000);

      req.signal.addEventListener("abort", () => {
        unregisterSse(ringKey, controller);
        clearInterval(interval);
        clearInterval(pingInterval);
        clearTimeout(timeout);
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}


// Gate desks (operator / supervisor / OIE) subscribe to this stream for the
// scoped restriction strip, so they must be in the read set. The stream emits
// only the rule *summary* (scope_type + human public_message + direction +
// expiry) — no PII, no target_values UUIDs — so widening the read set is
// safe. sysadmin/admin keep full access; principal reads the console instead.
export const GET = withAuthorization(handleGet, { requiredRole: ["sysadmin", "admin", "operator", "supervisor", "oie"] });

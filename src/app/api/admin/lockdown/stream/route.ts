import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { getActiveLockdown } from "@/lib/db";
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
      let lastId: string | null = null;
      let lastActiveStatus = false;

      const sendEvent = async () => {
        try {
          const active = await getActiveLockdown();
          const currentId = active?.id || null;
          const isActive = !!active;

          if (currentId !== lastId || isActive !== lastActiveStatus) {
            lastId = currentId;
            lastActiveStatus = isActive;

            const payload = {
              timestamp: new Date().toISOString(),
              active: isActive,
              lockdown: active,
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


export const GET = withAuthorization(handleGet, { requiredRole: ["sysadmin", "admin"] });

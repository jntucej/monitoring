import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { getNotifications } from "@/lib/db";
import { err } from "@/lib/api-response";
import { recordSseEvent, replaySince, highestSseId, sseWire } from "@/lib/sse-ring-buffer";
import { registerSse, unregisterSse, SseCapacityError } from "@/lib/sse-registry";

// SSE stream: securely streams user notifications with ping keepalive and session IDOR guards
// Reconnect semantics: per-user ring buffer (keyed by userId) so a reconnect
// replays only events the caller is authorized to see — no cross-user leak.

export const dynamic = "force-dynamic";
// Self-hosted standalone runtime — long-lived SSE is correct here. 1h cap:
// client reconnects with Last-Event-ID within ~10s, ring buffer replays.
export const maxDuration = 3600;
async function handleGet(req: NextRequest) {
  const callerId = req.headers.get("x-user-id");
  const callerRole = req.headers.get("x-user-role") || "user";
  const requestedUserId = req.nextUrl.searchParams.get("userId");

  // Prevent SSE IDOR: non-admins can only subscribe to their own notification stream
  let userId = callerId || requestedUserId;
  if (requestedUserId && requestedUserId !== callerId) {
    if (callerRole === "admin" || callerRole === "sysadmin") {
      userId = requestedUserId;
    } else {
      userId = callerId || requestedUserId;
    }
  }

  const role = req.nextUrl.searchParams.get("role") || callerRole;
  const encoder = new TextEncoder();

  if (!userId) {
    return new Response(JSON.stringify(err("BAD_REQUEST", "userId parameter required").body), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Per-user ring key: only the caller's own events are replayed on reconnect.
  const ringKey = `notifications-stream:${userId}`;

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
      const sendEvent = (data: any, event?: string) => {
        try {
          const id = recordSseEvent(ringKey, data, event);
          controller.enqueue(encoder.encode(sseWire({ id, event, data })));
        } catch {}
      };

      const sendPing = () => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {}
      };

      // Reconnect: replay buffered events since the client's last-seen id.
      const lastEventIdHeader = req.headers.get("last-event-id");
      const lastId = lastEventIdHeader ? Number(lastEventIdHeader) : 0;
      if (lastId > 0) {
        const replayed = replaySince(ringKey, lastId);
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

      sendEvent({ type: "connected", timestamp: new Date().toISOString() }, "connected");

      let lastJson = "";
      const checkAndSend = async () => {
        try {
          const items = await getNotifications(role, userId);
          const currentJson = JSON.stringify(items);
          if (currentJson !== lastJson) {
            lastJson = currentJson;
            sendEvent({ type: "notifications", data: items, unreadCount: items.filter((n: any) => !n.readAt).length }, "notifications");
          }
        } catch {}
      };

      await checkAndSend();
      const interval = setInterval(checkAndSend, 4000);
      const pingInterval = setInterval(sendPing, 15000);

      // Auto-terminate after 45 seconds to stay within serverless function limits
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
        try { controller.close(); } catch {}
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

export const GET = withAuthorization(handleGet);


import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { getCurrentOccupancy } from "@/server/services/occupancy/occupancy";
import { recordSseEvent, replaySince, highestSseId, sseWire } from "@/lib/sse-ring-buffer";

export const dynamic = "force-dynamic";
export const maxDuration = 45; // ponytail: limit lifetime to 45s for serverless execution

const RING_KEY = "occupancy-stream";

async function handleGet(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let lastPayload: string | null = null;

      const sendUpdate = async (force = false) => {
        try {
          const data = await getCurrentOccupancy();
          const payload = JSON.stringify(data);
          if (force || payload !== lastPayload) {
            lastPayload = payload;
            const id = recordSseEvent(RING_KEY, data);
            controller.enqueue(encoder.encode(sseWire({ id, event: "occupancy", data })));
          }
        } catch {
          // ignore stream fetch errors
        }
      };

      const sendPing = () => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {}
      };

      // Reconnect: replay buffered occupancy events since the client's
      // last-seen id (or emit a resubscribe payload on a fresh connect).
      const lastEventIdHeader = req.headers.get("last-event-id");
      const lastId = lastEventIdHeader ? Number(lastEventIdHeader) : 0;
      if (lastId > 0) {
        const replayed = replaySince(RING_KEY, lastId);
        for (const e of replayed) {
          try {
            controller.enqueue(encoder.encode(sseWire(e)));
          } catch {}
        }
      } else {
        const highest = highestSseId(RING_KEY);
        if (highest > 0) {
          try {
            const id = recordSseEvent(RING_KEY, { event: "resubscribe", highestId: highest, timestamp: new Date().toISOString() }, "resubscribe");
            controller.enqueue(encoder.encode(sseWire({ id, event: "resubscribe", data: { event: "resubscribe", highestId: highest, timestamp: new Date().toISOString() } })));
          } catch {}
        }
      }

      await sendUpdate(true);
      const interval = setInterval(() => sendUpdate(false), 3000);
      const pingInterval = setInterval(sendPing, 15000);

      // Auto-terminate after 45s so serverless function closes gracefully before timeout
      const timeout = setTimeout(() => {
        clearInterval(interval);
        clearInterval(pingInterval);
        try { controller.close(); } catch {}
      }, 45000);

      req.signal.addEventListener("abort", () => {
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

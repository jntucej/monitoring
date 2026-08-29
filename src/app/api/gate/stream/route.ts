import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 45; // ponytail: limit lifetime to 45s for serverless execution

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const sendEvent = (data: any) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {}
      };

      // Initial connection ping
      sendEvent({ event: "connected", timestamp: new Date().toISOString(), message: "IoT Turnstile EventStream active" });

      // Keepalive heartbeat
      const interval = setInterval(() => {
        sendEvent({ event: "heartbeat", timestamp: new Date().toISOString(), status: "online" });
      }, 15000);

      // Auto-terminate after 45s so serverless function closes gracefully
      const timeout = setTimeout(() => {
        clearInterval(interval);
        try { controller.close(); } catch {}
      }, 45000);

      req.signal.addEventListener("abort", () => {
        clearInterval(interval);
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


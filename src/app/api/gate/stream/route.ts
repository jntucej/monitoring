import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const sendEvent = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // Initial connection ping
      sendEvent({ event: "connected", timestamp: new Date().toISOString(), message: "IoT Turnstile EventStream active" });

      // Keepalive heartbeat
      const interval = setInterval(() => {
        sendEvent({ event: "heartbeat", timestamp: new Date().toISOString(), status: "online" });
      }, 15000);

      req.signal.addEventListener("abort", () => {
        clearInterval(interval);
        controller.close();
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

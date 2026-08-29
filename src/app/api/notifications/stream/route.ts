import { NextRequest } from "next/server";
import { getNotifications } from "@/lib/db";

// ponytail: SSE streams limit lifetime to 45s so serverless containers close gracefully before hard function timeouts. EventSource client automatically reconnects.
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId") || req.headers.get("x-user-id");
  const role = req.nextUrl.searchParams.get("role") || req.headers.get("x-user-role") || "user";
  const encoder = new TextEncoder();

  if (!userId) {
    return new Response(JSON.stringify({ success: false, error: "userId parameter required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: any) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {}
      };

      sendEvent({ type: "connected", timestamp: new Date().toISOString() });

      let lastJson = "";
      const checkAndSend = async () => {
        try {
          const items = await getNotifications(role, userId);
          const currentJson = JSON.stringify(items);
          if (currentJson !== lastJson) {
            lastJson = currentJson;
            sendEvent({ type: "notifications", data: items, unreadCount: items.filter((n: any) => !n.read).length });
          }
        } catch {}
      };

      await checkAndSend();
      const interval = setInterval(checkAndSend, 4000);

      // Auto-terminate after 45 seconds to stay within serverless function limits
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

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { getNotifications } from "@/lib/db";

// SSE stream: securely streams user notifications with ping keepalive and session IDOR guards
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

      const sendPing = () => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
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
      const pingInterval = setInterval(sendPing, 15000);

      // Auto-terminate after 45 seconds to stay within serverless function limits
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


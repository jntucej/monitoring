import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { getActiveLockdown } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 45; // ponytail: limit lifetime to 45s for serverless execution

/**
 * GET /api/admin/lockdown/stream — Real-time SSE endpoint for lockdown status updates.
 */
async function handleGet(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
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

            const payload = JSON.stringify({
              timestamp: new Date().toISOString(),
              active: isActive,
              lockdown: active,
            });

            controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
          }
        } catch {
          // ignore stream check errors
        }
      };

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

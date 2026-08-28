import { NextRequest } from "next/server";
import { getActiveLockdown } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/lockdown/stream — Real-time SSE endpoint for lockdown status updates.
 */
export async function GET(req: NextRequest) {
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

      // Poll interval for push stream
      const interval = setInterval(sendEvent, 2000);

      req.signal.addEventListener("abort", () => {
        clearInterval(interval);
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

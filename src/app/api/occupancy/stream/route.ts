import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { getCurrentOccupancy } from "@/lib/occupancy";

export const dynamic = "force-dynamic";
export const maxDuration = 45; // ponytail: limit lifetime to 45s for serverless execution

async function handleGet(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendUpdate = async () => {
        try {
          const data = await getCurrentOccupancy();
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          controller.enqueue(encoder.encode(`data: {"error": "stream_fetch_error"}\n\n`));
        }
      };

      await sendUpdate();
      const interval = setInterval(sendUpdate, 5000);

      // Auto-terminate after 45s so serverless function closes gracefully before timeout
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

export const GET = withAuthorization(handleGet);

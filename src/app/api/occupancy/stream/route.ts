import { NextRequest } from "next/server";
import { getCurrentOccupancy } from "@/lib/occupancy";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
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
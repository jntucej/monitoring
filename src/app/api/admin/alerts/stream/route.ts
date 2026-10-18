import { type NextRequest } from "next/server";
import type { AuthContext } from "@/lib/authContext";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 45;

interface AlertStreamRow {
  id: string;
  severity: string;
  title: string;
  message: string;
  gate_id: string | null;
  user_unique_id: string | null;
  timestamp: string;
  resolved: boolean;
}

async function handleGet(req: NextRequest, _ctx: { auth: AuthContext }): Promise<Response> {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let lastSignature = "";
      let heartbeatAt = Date.now();

      const sendSnapshot = async () => {
        try {
          const { query } = await import("@/lib/postgres");
          const result = await query<AlertStreamRow>(
            `SELECT id, severity, title, message, gate_id, user_unique_id, timestamp, resolved
               FROM alerts
              WHERE resolved = FALSE
              ORDER BY timestamp DESC
              LIMIT 100`
          );
          const rows = result.rows ?? [];
          const signature = JSON.stringify(rows.map((row) => `${row.id}:${row.timestamp}:${row.resolved}`));

          if (signature !== lastSignature) {
            lastSignature = signature;
            heartbeatAt = Date.now();
            const payload = JSON.stringify({
              type: "alerts",
              timestamp: new Date().toISOString(),
              data: rows,
            });
            controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
            return;
          }

          if (Date.now() - heartbeatAt >= 15_000) {
            heartbeatAt = Date.now();
            controller.enqueue(encoder.encode(`: ping\n\n`));
          }
        } catch {
          // If a poll tick fails, keep the stream alive and retry on the next tick.
        }
      };

      await sendSnapshot();
      const interval = setInterval(sendSnapshot, 2_000);

      req.signal.addEventListener("abort", () => {
        clearInterval(interval);
        try {
          controller.close();
        } catch {
          // already closed
        }
      });

      const timeout = setTimeout(() => {
        clearInterval(interval);
        try {
          controller.close();
        } catch {
          // already closed
        }
      }, 45_000);

      req.signal.addEventListener("abort", () => clearTimeout(timeout));
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

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ["sysadmin", "admin"] }),
  { keyPrefix: "admin_alerts_stream", maxRequests: 120 }
);

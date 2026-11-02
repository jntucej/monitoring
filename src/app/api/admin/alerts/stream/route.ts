import { type NextRequest } from "next/server";
import type { AuthContext } from "@/lib/authContext";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Alert } from "@/lib/types";
import { recordSseEvent, replaySince, highestSseId, sseWire } from "@/lib/sse-ring-buffer";

export const dynamic = "force-dynamic";
// Self-hosted standalone runtime — long-lived SSE is correct here. 1h cap:
// client reconnects with Last-Event-ID within ~10s, ring buffer replays.
export const maxDuration = 3600;

// §5 alert-tier visibility. The stream previously pushed every unresolved
// alert row to every connected client. Now each alert is filtered by the
// caller's role tier + visibleToRoles before it is ever enqueued — a student
// or low-tier role can no longer receive critical-incident alert payloads
// that the non-stream /api/admin/alerts route would have hidden from them.

// The `alerts` table has no min_tier / visible_to_roles columns — those
// gates live in the in-memory alert catalogue (lib/types Alert) consumed by
// the non-stream /api/admin/alerts route. Reuse the same helpers so both
// routes agree on what is visible.
function callerTier(auth: { role: string; roles?: string[] }): number {
  const roles = auth.roles?.length ? auth.roles : [auth.role];
  return roles.reduce((max, r) => Math.max(max, getRoleTier(r)), 0);
}

function alertVisibleTo(auth: { role: string; roles?: string[] }, alert: Alert): boolean {
  const tier = callerTier(auth);
  if (typeof alert.minTier === "number" && tier < alert.minTier) return false;
  const visibleToRoles = alert.visibleToRoles;
  if (Array.isArray(visibleToRoles) && visibleToRoles.length > 0) {
    const roleSet = new Set(auth.roles?.length ? auth.roles : [auth.role]);
    if (!visibleToRoles.some((r: unknown) => typeof r === "string" && roleSet.has(r))) return false;
  }
  return true;
}

async function handleGet(req: NextRequest, ctx: { auth: AuthContext }): Promise<Response> {
  const encoder = new TextEncoder();
  const { auth } = ctx;

  const stream = new ReadableStream({
    async start(controller) {
      let lastSignature = "";
      let heartbeatAt = Date.now();

      const sendSnapshot = async () => {
        try {
          const { getAlerts } = await import("@/lib/db");
          // Use the same catalogue source as /api/admin/alerts (non-stream),
          // which already carries minTier / visibleToRoles — not a raw SQL
          // SELECT, since the alerts table has no tier columns.
          const all = await getAlerts(false);
          const rows = all.filter((row) => alertVisibleTo(auth, row));
          const signature = JSON.stringify(rows.map((row) => `${row.id}:${row.timestamp}`));

          if (signature !== lastSignature) {
            lastSignature = signature;
            heartbeatAt = Date.now();
            const payload = {
              type: "alerts",
              timestamp: new Date().toISOString(),
              data: rows,
            };
            // Record in the per-role ring buffer so a reconnecting admin
            // client can replay alerts it missed during the 45s cutoff.
            const ringKey = `alerts-stream:${auth.role}`;
            const id = recordSseEvent(ringKey, payload, "alerts");
            controller.enqueue(encoder.encode(sseWire({ id, event: "alerts", data: payload })));
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

      // On reconnect the browser's EventSource sends `Last-Event-ID`.
      // Replay anything the ring buffer holds since that id.
      const ringKey = `alerts-stream:${auth.role}`;
      const lastEventIdHeader = req.headers.get("last-event-id");
      const lastId = lastEventIdHeader ? Number(lastEventIdHeader) : 0;
      if (lastId > 0) {
        const replayed = replaySince(ringKey, lastId);
        for (const e of replayed) {
          try {
            controller.enqueue(encoder.encode(sseWire(e)));
          } catch {}
        }
      } else {
        const highest = highestSseId(ringKey);
        if (highest > 0) {
          const id = recordSseEvent(ringKey, { event: "resubscribe", highestId: highest, timestamp: new Date().toISOString() }, "resubscribe");
          try {
            controller.enqueue(encoder.encode(sseWire({ id, event: "resubscribe", data: { event: "resubscribe", highestId: highest, timestamp: new Date().toISOString() } })));
          } catch {}
        }
      }

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

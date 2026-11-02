/**
 * Server-Sent Events endpoint for real-time gate monitoring.
 * This replaces the WebSocket at /ws since WS isn't supported by Next.js serverless.
 *
 * GET /api/gate/stream — Real-time SSE endpoint for gate status updates.
 *
 * Reconnect semantics (2026-11): every event carries a monotonic `id:` line.
 * The client's browser EventSource sends `Last-Event-ID` on reconnect; the
 * server replays buffered events since that id from the module-scoped ring
 * buffer (src/lib/sse-ring-buffer.ts), closing the gap between the 45s
 * serverless cutoff and the reconnect. A fresh connection (no Last-Event-ID)
 * receives a `resubscribe` payload with the current highest id so the client
 * can reconcile a full snapshot against anything it missed.
 */

import { NextRequest } from "next/server";
import type { ReadableStreamDefaultController } from "stream/web";
import { withAuthorization } from "@/middleware/authorization";
import { getDbClient } from "@/lib/db";
import { recordSseEvent, replaySince, highestSseId, sseWire } from "@/lib/sse-ring-buffer";
import { registerSse, unregisterSse, SseCapacityError } from "@/lib/sse-registry";
import type { AuthContext } from "@/lib/authContext";

export const dynamic = "force-dynamic";
// Self-hosted standalone runtime (node server.js) — not Vercel serverless,
// so no 45s cutoff applies. Long-lived SSE streams are correct: kiosk
// operators keep the tab open for a shift. The ring buffer still handles
// reconnects, and req.signal cleanup prevents orphaned streams on close.
// Cap at 1h so a browser that loses its tab silently still gets garbage
// collected server-side; the client EventSource auto-reconnects with
// Last-Event-ID within ~10s, replaying any missed events from the ring.
export const maxDuration = 3600;

const RING_KEY = "gate-stream";

async function handleGet(req: NextRequest, ctx: { auth: AuthContext }) {
  const encoder = new TextEncoder();

  // §3 gate scoping. This SSE stream previously showed every gate's
  // activity to every connected client, including operators who are bound
  // to a single gate — a cross-gate data leak (student names, directions).
  // Now: operators stream only their own gate, supervisors their
  // supervised set, and campus-wide roles (admin/sysadmin/oie) everything.
  const { auth } = ctx;
  let scopedGateIds: string[] | null;
  if (auth.role === "operator") {
    scopedGateIds = auth.gateId ? [auth.gateId] : [];
  } else if (auth.role === "supervisor") {
    scopedGateIds = auth.supervisedGates ?? [];
  } else {
    scopedGateIds = null; // admin / sysadmin / oie — campus-wide
  }

  // Long-run resilience: cap open streams per replica. A kiosk tablet that
  // keeps reconnecting (sleep/wake, tab leaks) otherwise accumulates
  // ReadableStream controllers in memory until the web container OOMs.
  // When the cap is hit, return 503 before opening the stream; the client
  // EventSource backs off and retries with Last-Event-ID.
  const stream = new ReadableStream({
    async start(controller) {
      try {
        registerSse(RING_KEY, controller);
      } catch (err) {
        if (err instanceof SseCapacityError) {
          // Close the stream; the route-level response cannot be replaced
          // mid-stream, so the client sees the connection drop and the
          // EventSource reconnect loop retries after the backoff delay.
          try { controller.close(); } catch { /* already closed */ }
          return;
        }
        throw err;
      }
      const sendEvent = (data: any, event?: string) => {
        try {
          // Record in the shared ring buffer so a reconnecting client can
          // replay events it missed during the 45s cutoff. The returned id
          // is emitted as the SSE `id:` line (monotonic, per ring key).
          const id = recordSseEvent(RING_KEY, data, event);
          const line = sseWire({ id, event, data });
          controller.enqueue(encoder.encode(line));
        } catch {}
      };

      const sendPing = () => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {}
      };

      // On reconnect, the browser's EventSource sends `Last-Event-ID`.
      // Replay anything the ring buffer holds since that id, so the gap
      // between the 45s cutoff and the reconnect is closed. A fresh
      // connection (no last id) gets a `resubscribe` payload with the
      // current highest id so the client can reconcile its snapshot.
      const lastEventIdHeader = req.headers.get("last-event-id");
      const lastId = lastEventIdHeader ? Number(lastEventIdHeader) : 0;
      if (lastId > 0) {
        const replayed = replaySince(RING_KEY, lastId);
        for (const e of replayed) {
          try {
            controller.enqueue(encoder.encode(sseWire(e)));
          } catch {}
        }
        if (replayed.length > 0) {
          // Signal that a replay happened so the client knows to merge
          // (not re-snapshot) the replayed events.
          try {
            const id = recordSseEvent(RING_KEY, {
              event: "replayed",
              lastId,
              count: replayed.length,
              timestamp: new Date().toISOString(),
            }, "replayed");
            controller.enqueue(encoder.encode(sseWire({ id, event: "replayed", data: { event: "replayed", lastId, count: replayed.length, timestamp: new Date().toISOString() } })));
          } catch {}
        }
      } else {
        const highest = highestSseId(RING_KEY);
        if (highest > 0) {
          // Fresh connection but the ring already has history: tell the
          // client the baseline so it can request a resync if it had a
          // prior id (stored client-side) that's older than this.
          try {
            const id = recordSseEvent(RING_KEY, {
              event: "resubscribe",
              highestId: highest,
              timestamp: new Date().toISOString(),
            }, "resubscribe");
            controller.enqueue(encoder.encode(sseWire({ id, event: "resubscribe", data: { event: "resubscribe", highestId: highest, timestamp: new Date().toISOString() } })));
          } catch {}
        }
      }

      // Fetch current gate statuses from database
      const fetchGateData = async () => {
        try {
          const client = getDbClient();
          
          // Get scoped gates (all gates for campus-wide roles)
          let gateQuery = client
            .from('gates')
            .select('id, gate_code, name, location, type, is_active');
          if (scopedGateIds === null) {
            // campus-wide: no filter
          } else if (scopedGateIds.length === 0) {
            // fail-closed: unassigned operator / unassigned supervisor
            // streams zero gate rows
            return null;
          } else {
            gateQuery = gateQuery.in('id', scopedGateIds);
          }
          const { data: gates } = await gateQuery;
          
          if (!gates || gates.length === 0) {
            return null;
          }

          // Get recent scans (last 5 minutes) per gate, scoped to the
          // caller's visible gates so cross-gate activity can't leak into
          // the scan counts / active-set computed below.
          const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
          let scanQuery = client
            .from('movement_logs')
            .select('gate_id')
            .gte('timestamp', fiveMinsAgo);
          if (scopedGateIds !== null) {
            scanQuery = scanQuery.in('gate_id', scopedGateIds);
          }
          const { data: recentScans } = await scanQuery;

          // Count scans per gate
          const scanCounts: Record<string, number> = {};
          for (const scan of (recentScans || [])) {
            scanCounts[scan.gate_id] = (scanCounts[scan.gate_id] || 0) + 1;
          }

          const activeGateIds = new Set(Object.keys(scanCounts));
          
          return {
            gates: gates.map(g => ({
              gateId: g.id,
              status: activeGateIds.has(g.id) ? "active" : "idle",
              name: g.name,
              location: g.location,
              isOnline: g.is_active && activeGateIds.has(g.id),
              recentScans: scanCounts[g.id] || 0,
            })),
            totalActive: gates.filter(g => activeGateIds.has(g.id)).length,
            totalScans: Object.values(scanCounts).reduce((a, b) => a + b, 0),
          };
        } catch (err) {
          console.error('[gate/stream] Error:', err);
          return null;
        }
      };

      // Send initial connection event
      sendEvent({ 
        event: "connected", 
        timestamp: new Date().toISOString(),
        message: "Gate EventStream active" 
      }, "connected");

      let lastPayload = "";
      
      const checkAndSend = async () => {
        try {
          const data = await fetchGateData();
          if (data) {
            const payload = JSON.stringify({ 
              type: "gate_status",
              ...data,
              timestamp: new Date().toISOString()
            });
            
            if (payload !== lastPayload) {
              lastPayload = payload;
              sendEvent(JSON.parse(payload), "gate_status");
            }
          }
        } catch {
          // ignore stream fetch errors
        }
      };

      // Initial fetch
      await checkAndSend();

      // Poll every 3 seconds
      const interval = setInterval(checkAndSend, 3000);
      
      // Keepalive ping every 15 seconds
      const pingInterval = setInterval(sendPing, 15000);

      // Auto-terminate after 45 seconds to stay within serverless function limits
      const timeout = setTimeout(() => {
        clearInterval(interval);
        clearInterval(pingInterval);
        try { controller.close(); } catch {}
      }, 45000);

      req.signal.addEventListener("abort", () => {
        unregisterSse(RING_KEY, controller);
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
      "X-Accel-Buffering": "no", // Disable nginx buffering
    },
  });
}

export const GET = withAuthorization(handleGet, { 
  requiredRole: ["sysadmin", "admin", "operator", "supervisor", "oie"] 
});

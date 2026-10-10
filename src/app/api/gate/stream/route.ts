/**
 * Server-Sent Events endpoint for real-time gate monitoring.
 * This replaces the WebSocket at /ws since WS isn't supported by Next.js serverless.
 * 
 * GET /api/gate/stream — Real-time SSE endpoint for gate status updates.
 */

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { getDbClient } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 45; // ponytail: limit lifetime to 45s for serverless execution

async function handleGet(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: any, event?: string) => {
        try {
          const line = event 
            ? `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
            : `data: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(line));
        } catch {}
      };

      const sendPing = () => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {}
      };

      // Fetch current gate statuses from database
      const fetchGateData = async () => {
        try {
          const client = getDbClient();
          
          // Get all gates
          const { data: gates } = await client
            .from('gates')
            .select('id, gate_code, name, location, type, is_active');
          
          if (!gates || gates.length === 0) {
            return null;
          }

          // Get recent scans (last 5 minutes) per gate
          const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
          const { data: recentScans } = await client
            .from('movement_logs')
            .select('gate_id')
            .gte('timestamp', fiveMinsAgo);

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
  requiredRole: ["sysadmin", "admin", "operator", "supervisor"] 
});

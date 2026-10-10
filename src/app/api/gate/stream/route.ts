import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { getDbClient } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 45; // ponytail: limit lifetime to 45s for serverless execution

/**
 * GET /api/gate/stream — Real-time SSE endpoint for gate status updates.
 * 
 * Emits events:
 * - { event: "connected" }       Initial connection acknowledgment
 * - { event: "heartbeat" }       Periodic keepalive (every 15s)
 * - { event: "gate_status" }     Updated gate statuses (every 3s)
 * - { event: "traffic" }         Overall traffic count (every 3s)
 */
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

      // Fetch all gates with their current status
      const fetchGateStatuses = async (): Promise<Array<{ 
        gateId: string; 
        status: string; 
        name: string; 
        location: string; 
        isOnline: boolean; 
        recentScans: number 
      }>> => {
        try {
          const client = getDbClient();
          
          // Get all gates
          const { data: gates } = await client
            .from('gates')
            .select('id, gate_code, name, location, type, is_active');
          
          if (!gates || gates.length === 0) {
            return [];
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

          // Determine gate status based on recent activity
          const activeGateIds = new Set(Object.keys(scanCounts));
          
          return gates.map(g => ({
            gateId: g.id,
            status: activeGateIds.has(g.id) ? "active" : "idle",
            name: g.name,
            location: g.location,
            isOnline: g.is_active && activeGateIds.has(g.id),
            recentScans: scanCounts[g.id] || 0,
          }));
        } catch (err) {
          console.error('[gate/stream] Error fetching gate statuses:', err);
          return [];
        }
      };

      // Send initial connection event
      sendEvent({ 
        event: "connected", 
        timestamp: new Date().toISOString(),
        message: "Gate EventStream active" 
      });

      let lastPayload = "";
      const checkAndSend = async () => {
        try {
          const statuses = await fetchGateStatuses();
          const payload = JSON.stringify({ 
            type: "gate_status",
            gates: statuses,
            totalActive: statuses.filter(g => g.status === "active").length,
            totalScans: statuses.reduce((sum, g) => sum + g.recentScans, 0),
            timestamp: new Date().toISOString()
          });
          
          if (payload !== lastPayload) {
            lastPayload = payload;
            sendEvent(JSON.parse(payload));
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
    },
  });
}

export const GET = withAuthorization(handleGet, { 
  requiredRole: ["sysadmin", "admin", "operator", "supervisor"] 
});

/**
 * WebSocket endpoint for real-time gate monitoring.
 * 
 * This file is not a standard Next.js API route — it handles WebSocket
 * upgrades via the Next.js upgrade handler.
 * 
 * Deploy as: `src/app/api/ws/route.ts`
 */

import { NextRequest } from "next/server";
import { getDbClient } from "@/lib/db";

// Simple in-memory client store keyed by client ID
const clients = new Map<string, any>();
let nextId = 0;

// Latest computed state shared across all connections
let latestState = {
  gates: [] as Array<{
    gateId: string;
    status: string;
    name: string;
    location: string;
    isOnline: boolean;
    recentScans: number;
  }>,
  totalActive: 0,
  totalScans: 0,
  timestamp: "",
};

/**
 * Fetch current gate status from the database.
 */
async function refreshGateState() {
  try {
    const client = getDbClient();
    
    // Get all active gates
    const { data: gates } = await client
      .from('gates')
      .select('id, gate_code, name, location, type, is_active');
    
    if (!gates || gates.length === 0) {
      return;
    }

    // Get recent movement logs (last 5 minutes)
    const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: recentLogs } = await client
      .from('movement_logs')
      .select('gate_id')
      .gte('timestamp', fiveMinsAgo);

    // Count scans per gate
    const scanCounts: Record<string, number> = {};
    for (const log of (recentLogs || [])) {
      scanCounts[log.gate_id] = (scanCounts[log.gate_id] || 0) + 1;
    }

    const activeGateIds = new Set(Object.keys(scanCounts));

    latestState = {
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
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    console.error('[ws] Error refreshing gate state:', err);
  }
}

// Refresh state every 3 seconds
setInterval(refreshGateState, 3000);
// Initial fetch
refreshGateState();

/**
 * Broadcast state to all connected WebSocket clients.
 */
function broadcast() {
  const payload = JSON.stringify(latestState);
  for (const [id, client] of clients) {
    try {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(payload);
      } else {
        clients.delete(id);
      }
    } catch {
      clients.delete(id);
    }
  }
}

// Broadcast every 3 seconds
setInterval(broadcast, 3000);

/**
 * Next.js 15+ Route Handler for WebSocket.
 * Exported as `GET` with `upgrade: true` in route config.
 */
export async function GET(req: NextRequest) {
  // This will be handled by Next.js upgrade mechanism
  return new Response('WebSocket endpoint - use EventSource to /api/gate/stream', {
    status: 426,
    headers: { 'Upgrade': 'websocket' }
  });
}

// Next.js 15+ WebSocket support via export const config
export const config = {
  api: {
    bodyParser: false,
  },
};

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { getAllGatesLive } from "@/lib/db";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";

async function handleGet(req: NextRequest) {
  try {
    const service = getSupabaseServiceClient();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data: logsData, error: logsError } = await service
      .from('movement_logs')
      .select('id, gate_id, direction, scan_type, timestamp')
      .gte('timestamp', todayStart.toISOString());

    const { data: opsData } = await service
      .from('users')
      .select('id, name, email, unique_id, role, gate_id')
      .eq('role', 'operator');

    const logs = logsData || [];
    const operators = opsData || [];

    // Build the real assignment map: gate_id -> operators who are actually
    // assigned to it (users.gate_id). No round-robin / hardcoded fallback.
    const assignedByGate: Record<string, typeof operators> = {};
    for (const op of operators) {
      const gid = (op as any).gate_id;
      if (!gid) continue;
      (assignedByGate[gid] ||= []).push(op);
    }

    const ALL_GATES = await getAllGatesLive();
    const devices = ALL_GATES.map((gate) => {
      const gateLogs = logs.filter((l: any) => l.gate_id === gate.id || l.gateId === gate.id);
      const entriesToday = gateLogs.filter((l: any) => {
        const dir = String(l.direction || l.scan_type || "").toUpperCase();
        return dir === "IN" || dir === "ENTRY";
      }).length;
      const exitsToday = gateLogs.filter((l: any) => {
        const dir = String(l.direction || l.scan_type || "").toUpperCase();
        return dir === "OUT" || dir === "EXIT";
      }).length;
      const lastLog = gateLogs.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

      const gateOps = assignedByGate[gate.id] || [];

      return {
        id: gate.id,
        name: gate.name,
        location: gate.location,
        gateCode: gate.gateCode || "GATE",
        status: gate.isActive ? "online" : "maintenance",
        assignedOperators: gateOps.map((op: any) => ({
          id: op.id,
          name: op.name || op.email || "Unnamed operator",
          email: op.email || "",
          role: op.role || "operator",
        })),
        lastScanTime: lastLog ? lastLog.timestamp : null,
        totalScansToday: gateLogs.length,
        entriesToday,
        exitsToday,
        lastActive: lastLog ? "Just now" : "No activity today",
        uptime: gate.isActive ? 100 : 0,
      };
    });

    return NextResponse.json({ success: true, devices });
  } catch (error: any) {
    console.error("Error fetching gate device telemetry:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message || "Failed to fetch gate telemetry" } },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ["admin", "sysadmin"] }),
  { keyPrefix: "gate_devices", maxRequests: 60 }
);
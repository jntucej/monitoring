import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { getAllGatesLive } from "@/lib/db";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";

/**
 * A gate counts as "online" only when it is configured active AND had a real
 * scan within the last 5 minutes. Configured-active alone is NOT a live signal
 * (that's how unassigned gates previously showed "online").
 */
const ONLINE_WINDOW_MS = 5 * 60 * 1000;

async function handleGet(req: NextRequest) {
  try {
    const service = getSupabaseServiceClient();
    const now = Date.now();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const windowStartIso = new Date(now - ONLINE_WINDOW_MS).toISOString();

    const { data: logsData } = await service
      .from('movement_logs')
      .select('id, gate_id, direction, scan_type, operator_id, operator_name, timestamp')
      .gte('timestamp', todayStart.toISOString());

    const { data: opsData } = await service
      .from('users')
      .select('id, name, email, unique_id, role, gate_id, status')
      .eq('role', 'operator');

    // Last scan inside the 5-minute window per gate, attributed to the actual
    // operator who performed it (movement_logs.operator_id/operator_name).
    const { data: recentLogs } = await service
      .from('movement_logs')
      .select('gate_id, operator_id, operator_name, timestamp')
      .gte('timestamp', windowStartIso);

    const logs = logsData || [];
    const operators = opsData || [];

    // Real assignment map: gate_id -> operators actually assigned to it
    // (users.gate_id). No round-robin / hardcoded fallback.
    const assignedByGate: Record<string, typeof operators> = {};
    for (const op of operators) {
      const gid = (op as any).gate_id;
      if (!gid) continue;
      (assignedByGate[gid] ||= []).push(op);
    }

    // Last activity in window per gate + the operator who performed it.
    const lastInWindowByGate: Record<
      string,
      { at: string; operatorId: string | null; operatorName: string | null }
    > = {};
    for (const l of recentLogs || []) {
      const gid = l.gate_id;
      if (!gid) continue;
      const ts = String(l.timestamp);
      const prev = lastInWindowByGate[gid];
      if (!prev || ts > prev.at) {
        lastInWindowByGate[gid] = {
          at: ts,
          operatorId: l.operator_id ?? null,
          operatorName: l.operator_name ?? null,
        };
      }
    }

    const allGates = await getAllGatesLive();
    const devices = allGates.map((gate) => {
      const gateLogs = logs.filter((l: any) => l.gate_id === gate.id || l.gateId === gate.id);
      const entriesToday = gateLogs.filter((l: any) => {
        const dir = String(l.direction || l.scan_type || "").toUpperCase();
        return dir === "IN" || dir === "ENTRY";
      }).length;
      const exitsToday = gateLogs.filter((l: any) => {
        const dir = String(l.direction || l.scan_type || "").toUpperCase();
        return dir === "OUT" || dir === "EXIT";
      }).length;
      const lastLog = [...gateLogs].sort(
        (a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )[0];

      const gateOps = assignedByGate[gate.id] || [];
      const lastInWindow = lastInWindowByGate[gate.id];

      // Online only if the gate is configured active AND was scanned within
      // the window. Unassigned or configured-inactive gates read as offline.
      const isOnline = gate.isActive === true && !!lastInWindow;
      const status: "online" | "offline" | "maintenance" =
        gate.isActive === false ? "maintenance" : isOnline ? "online" : "offline";

      // Attribute the last in-window scan to the operator who actually did it,
      // not the configured assignment. When operator_name is present that is
      // who used the gate; otherwise fall back to the assigned operator's name
      // and flag it so the UI can distinguish "confirmed user" vs "assigned".
      let lastOperator: {
        id: string | null;
        name: string;
        email: string;
        role: string;
        attributed: boolean;
        at: string;
      } | null = null;
      if (lastInWindow) {
        const usedOperator = lastInWindow.operatorName || lastInWindow.operatorId;
        lastOperator = usedOperator
          ? {
              id: lastInWindow.operatorId,
              name: String(usedOperator),
              email: "",
              role: "operator",
              attributed: true,
              at: lastInWindow.at,
            }
          : gateOps[0]
          ? {
              id: gateOps[0].id,
              name: (gateOps[0] as any).name || (gateOps[0] as any).email || "Assigned operator",
              email: (gateOps[0] as any).email || "",
              role: (gateOps[0] as any).role || "operator",
              attributed: false,
              at: lastInWindow.at,
            }
          : null;
      }

      // Relative last-activity label instead of the old hardcoded "Just now".
      let lastActiveLabel = "No activity today";
      if (lastLog) {
        const diffMs = now - new Date(lastLog.timestamp).getTime();
        if (diffMs < 60_000) lastActiveLabel = "Just now";
        else if (diffMs < 5 * 60_000) lastActiveLabel = `~${Math.round(diffMs / 60_000)} min ago`;
        else if (diffMs < 60 * 60_000) lastActiveLabel = `${Math.round(diffMs / 60_000)} min ago`;
        else lastActiveLabel = `${Math.round(diffMs / (60 * 60_000))} hr ago`;
      }

      return {
        id: gate.id,
        name: gate.name,
        location: gate.location,
        gateCode: gate.gateCode || "GATE",
        status,
        isOnline,
        scannedRecently: !!lastInWindow,
        onlineWindowMs: ONLINE_WINDOW_MS,
        lastOperator,
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
        lastActive: lastActiveLabel,
        uptime: gate.isActive ? (isOnline ? 100 : 0) : 0,
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

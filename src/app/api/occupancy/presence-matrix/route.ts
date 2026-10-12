import { NextRequest, NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { getSupabaseServiceClient } from "@/lib/dbClient";

/**
 * /api/occupancy/presence-matrix
 * Who is inside each gate RIGHT NOW, grouped by role.
 *
 * Built from movement_logs: for each user take their most recent movement;
 * if the latest is direction=IN they are currently inside that gate.
 * Returns a gate × role count matrix for the admin heatmap.
 */
const ROLES = ["student", "faculty", "staff", "worker", "visitor", "warden", "admin", "sysadmin", "operator", "supervisor"] as const;

async function handleGet(_req: NextRequest) {
  try {
    const svc = getSupabaseServiceClient();

    // 1. Active gates
    const { data: gates } = await svc
      .from("gates")
      .select("id, gate_code, name, audience, type")
      .eq("is_active", true);

    // 2. Most recent movement per user (limit keeps the query cheap; the
    //    "IN" users from the latest scan batch are what drives the heatmap)
    const { data: recentLogs } = await svc
      .from("movement_logs")
      .select("user_id, gate_id, direction, timestamp")
      .order("timestamp", { ascending: false })
      .limit(2000);

    // 3. Per user, keep only the newest log
    const lastByUser = new Map<string, { gateId: string | null; direction: string }>();
    for (const log of recentLogs || []) {
      if (!log.user_id) continue;
      if (!lastByUser.has(log.user_id)) {
        lastByUser.set(log.user_id, { gateId: log.gate_id, direction: String(log.direction || "").toUpperCase() });
      }
    }

    // 4. Resolve roles for users whose last move was IN
    const inUserIds = [...lastByUser.entries()]
      .filter(([, v]) => v.direction === "IN" && v.gateId)
      .map(([k]) => k);

    const roleById = new Map<string, string>();
    for (let i = 0; i < inUserIds.length; i += 200) {
      const chunk = inUserIds.slice(i, i + 200);
      const { data: users } = await svc.from("users").select("id, role").in("id", chunk);
      for (const u of users || []) roleById.set(u.id, u.role || "unknown");
    }

    // 5. Build matrix: gateId -> role -> count
    const matrix: Record<string, Record<string, number>> = {};
    for (const g of gates || []) {
      const row: Record<string, number> = {};
      ROLES.forEach((r) => { row[r] = 0; });
      matrix[g.id] = row;
    }
    for (const [uid, v] of lastByUser.entries()) {
      if (v.direction !== "IN" || !v.gateId) continue;
      const role = roleById.get(uid) || "unknown";
      if (matrix[v.gateId] && matrix[v.gateId][role] !== undefined) matrix[v.gateId][role] += 1;
    }

    return NextResponse.json({
      success: true,
      data: {
        gates: (gates || []).map((g: any) => ({
          id: g.id,
          name: g.name,
          code: g.gate_code,
          audience: g.audience,
          type: g.type,
        })),
        roles: ROLES as unknown as string[],
        matrix,
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to load presence matrix";
    console.error("Error fetching presence matrix:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: msg } },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ["admin", "sysadmin", "operator", "warden", "supervisor", "principal"] }),
  { keyPrefix: "presence_matrix", maxRequests: 60 }
);

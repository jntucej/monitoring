import { findTodayByGate } from "@/server/repositories/scans/findTodayByGate";
import { findActive } from "@/server/repositories/occupancy/findActive";
import { findByIds } from "@/server/repositories/users/findByIds";
import { assertOperatorHasGate } from "@/server/policy/gate-access";
import type { Role, Scan, CategoryBreakdown, OutingEntry } from "@/lib/types";

export interface OperatorStatsInput {
  role: Role;
  gateId: string | null;
}

export async function getOperatorStats(input: OperatorStatsInput) {
  assertOperatorHasGate(input.role, input.gateId);
  const scope = input.gateId ?? undefined;

  const [logs, occupancy] = await Promise.all([
    findTodayByGate(scope),
    findActive(),
  ]);

  const userIds = Array.from(new Set(logs.map((l) => l.user_id)));
  const users = await findByIds(userIds);
  //const userById = new Map(users.map((u) => [u.id, u]));

  // Placeholder logic for the sake of structure validation, as original logic was not provided in full detail
  return {
    entries: logs.filter((l) => l.direction === "IN").length,
    exits:   logs.filter((l) => l.direction === "OUT").length,
    onCampus: occupancy.filter((o) => o.current_status === "IN").length,
    breakdown: {} as CategoryBreakdown,
    outing: [] as OutingEntry[],
    recentScans: [] as Scan[],
  };
}

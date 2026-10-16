import { findTodayByGate } from "@/server/repositories/scans/findTodayByGate";
import { findActive } from "@/server/repositories/occupancy/findActive";
import { findByIds, type UserLookupRow } from "@/server/repositories/users/findByIds";
import { assertOperatorHasGate } from "@/server/policy/gate-access";
import type { Role, Scan, CategoryBreakdown, OutingEntry, PersonType, ScanDirection, ExitReason } from "@/lib/types";

export interface OperatorStatsInput {
  role: Role;
  gateId: string | null;
}

function mapRoleToPersonType(role: string | null | undefined): PersonType {
  if (!role) return "student";
  const r = role.toLowerCase();
  if (r === "student") return "student";
  if (r === "staff" || r === "faculty") return "staff";
  if (r === "parent" || r === "guardian") return "guardian";
  if (r === "operator" || r === "supervisor" || r === "admin" || r === "sysadmin" || r === "warden" || r === "principal" || r === "exam" || r === "hod" || r === "worker" || r === "visitor") {
    return r === "visitor" ? "visitor" : "staff";
  }
  return "student";
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
  const userById = new Map<string, UserLookupRow>(users.map((u) => [u.id, u]));

  // Build the recent-scan list: most-recent first, capped at 25 rows so the
  // UI stays snappy even on a busy gate day.
  const recentScans: Scan[] = [...logs]
    .sort((a, b) => (a.timestamp < b.timestamp ? 1 : a.timestamp > b.timestamp ? -1 : 0))
    .slice(0, 25)
    .map((l) => {
      const u = userById.get(l.user_id);
      return {
        id: l.id,
        roll: u?.unique_id ?? l.user_id,
        uniqueId: u?.unique_id ?? l.user_id,
        name: u?.name ?? l.user_id,
        personType: mapRoleToPersonType(u?.role),
        direction: l.direction as ScanDirection,
        reason: (l.reason ?? undefined) as ExitReason | undefined,
        gateId: l.gate_id ?? scope ?? "",
        gateName: l.gate_name,
        operatorId: "",
        operatorName: "",
        timestamp: l.timestamp,
      } as Scan;
    });

  return {
    entries: logs.filter((l) => l.direction === "IN").length,
    exits:   logs.filter((l) => l.direction === "OUT").length,
    onCampus: occupancy.filter((o) => o.current_status === "IN").length,
    breakdown: {} as CategoryBreakdown,
    outing: [] as OutingEntry[],
    recentScans,
  };
}

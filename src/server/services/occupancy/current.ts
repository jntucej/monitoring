import { findZones, countInsideByRole } from "@/server/repositories/occupancy/findZones";
import type { OccupancyStats } from "@/lib/analytics-types";

export async function getCurrentOccupancy(): Promise<OccupancyStats> {
  const [zones, byRole] = await Promise.all([findZones(), countInsideByRole()]);

  const roleToType = (r: string): keyof OccupancyStats["byType"] | null => {
    if (r === "student") return "student";
    if (r === "faculty") return "faculty";
    if (r === "staff" || r === "worker") return r as "staff" | "worker";
    if (r === "visitor") return "visitor";
    if (r === "parent" || r === "guardian") return "parent";
    return null;
  };

  const byType: OccupancyStats["byType"] = {
    student: 0, faculty: 0, staff: 0, worker: 0, visitor: 0, parent: 0,
  };
  let total = 0;
  for (const row of byRole) {
    total += row.count;
    const key = roleToType(row.role);
    if (key) byType[key] += row.count;
  }

  return {
    total,
    byType,
    byDepartment: {}, 
    lastUpdated: new Date().toISOString(),
  };
}

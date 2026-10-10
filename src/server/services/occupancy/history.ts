import { findHistory } from "@/server/repositories/occupancy/findHistory";

export async function getOccupancyHistory(hours?: number) {
  const history = await findHistory(hours);
  return history;
}

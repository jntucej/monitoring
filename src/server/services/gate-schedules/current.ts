import { findCurrent } from "@/server/repositories/gate-schedules/findCurrent";

export async function getCurrentGateSchedules() {
  const schedules = await findCurrent();
  return { schedules };
}

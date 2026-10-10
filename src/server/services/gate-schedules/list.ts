import { findAll } from "@/server/repositories/gate-schedules/findAll";

export async function listGateSchedules() {
  const schedules = await findAll();
  return { schedules };
}

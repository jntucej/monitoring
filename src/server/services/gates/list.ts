import { findAll } from "@/server/repositories/gates/findAll";

export async function listGates() {
  const gates = await findAll();
  return { gates };
}

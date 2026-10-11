import { checkSystemHealth } from "@/lib/health";

export async function getHealth() {
  return await checkSystemHealth();
}

import { insert } from "@/server/repositories/audit/insert";

export async function auditWrite(entry: Parameters<typeof insert>[0]): Promise<void> {
  try {
    await insert(entry);
  } catch (e) {
    console.error("[audit] write failed", e);
  }
}

import { query } from "@/lib/postgres";

export interface CreateScanInput {
  scanId: string;
  userId: string;
  direction: "IN" | "OUT";
  reason: string | null;
  gateId: string;
  gateName: string;
  operatorId: string;
  operatorName: string;
  timestamp: string;
  isManual: boolean;
  dupWindowMinutes?: number;
}

export interface CreateScanResult {
  log: Record<string, unknown> | null;
  isDuplicate: boolean;
}

export async function createScan(input: CreateScanInput): Promise<CreateScanResult> {
  const { rows } = await query<{ inserted_log: Record<string, unknown>; is_duplicate: boolean }>(
    `SELECT inserted_log, is_duplicate
       FROM process_gate_scan($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      input.scanId,
      input.userId,
      input.direction,
      input.reason,
      input.gateId,
      input.gateName,
      input.operatorId,
      input.operatorName,
      input.timestamp,
      input.isManual,
      input.dupWindowMinutes ?? 5,
    ],
  );
  const row = rows[0];
  return {
    log: row?.inserted_log ?? null,
    isDuplicate: row?.is_duplicate ?? false,
  };
}

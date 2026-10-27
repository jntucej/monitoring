import { query } from "@/lib/db";

export type GateMode = "OPEN" | "CURFEW" | "MAINTENANCE";

interface GateOpsState {
  mode: GateMode;
  set_at?: string;
  set_by?: string;
  reason?: string;
}

let cachedMode: GateMode = "OPEN";
let cacheTime = 0;
const CACHE_TTL_MS = 5000;

export async function getGateMode(): Promise<GateMode> {
  const now = Date.now();
  if (now - cacheTime < CACHE_TTL_MS) {
    return cachedMode;
  }
  try {
    const res = await query<{ value: GateOpsState }>(
      "SELECT value FROM public.system_settings WHERE id = 'gate_operations' LIMIT 1"
    );
    if (res.rows.length > 0 && res.rows[0].value?.mode) {
      cachedMode = res.rows[0].value.mode;
      cacheTime = now;
    }
  } catch {
    // default to OPEN if table unavailable
  }
  return cachedMode;
}

export async function setGateMode(newMode: GateMode, setBy: string, reason: string): Promise<void> {
  const oldMode = await getGateMode();
  if (oldMode === newMode) return;

  const state: GateOpsState = {
    mode: newMode,
    set_at: new Date().toISOString(),
    set_by: setBy,
    reason,
  };

  await query(
    `INSERT INTO public.system_settings (id, value, updated_at)
     VALUES ('gate_operations', $1::jsonb, NOW())
     ON CONFLICT (id) DO UPDATE SET value = $1::jsonb, updated_at = NOW()`,
    [JSON.stringify(state)]
  );

  cachedMode = newMode;
  cacheTime = Date.now();

  await query(
    `INSERT INTO public.audit_logs (user_id, action, role, details, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      "system",
      "GATE_OPERATIONS_MODE_CHANGED",
      "sysadmin",
      `Gate mode changed from ${oldMode} to ${newMode}. Reason: ${reason}`,
      "127.0.0.1",
      "gate-timer"
    ]
  ).catch(() => {});
}

export function assertScansAllowed(mode: GateMode, overrideReason?: string): { allowed: boolean; status: number; code: string; message: string } {
  if (mode === "OPEN") {
    return { allowed: true, status: 200, code: "OK", message: "Scan allowed" };
  }

  if (mode === "MAINTENANCE") {
    if (overrideReason === "emergency") {
      return { allowed: true, status: 200, code: "OK", message: "Emergency override allowed during maintenance" };
    }
    return {
      allowed: false,
      status: 503,
      code: "MAINTENANCE_ACTIVE",
      message: "Scheduled maintenance in progress (21:30–22:00). Routine scans blocked. For emergency, call supervisor.",
    };
  }

  if (mode === "CURFEW") {
    if (overrideReason && overrideReason.trim().length > 0) {
      return { allowed: true, status: 200, code: "OK", message: "Curfew override allowed with reason" };
    }
    return {
      allowed: false,
      status: 403,
      code: "CURFEW_ACTIVE",
      message: "Night curfew active (21:00–06:00). Override reason required for scanning.",
    };
  }

  return { allowed: true, status: 200, code: "OK", message: "OK" };
}

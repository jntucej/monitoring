import { query } from "@/lib/postgres";
import type { Role } from "@/lib/types";

export interface KioskOperatorRow {
  id: string;
  unique_id: string;
  name: string;
  email: string | null;
  role: string;
  status: string;
  gate_id: string | null;
  session_version: number;
  is_kiosk_default: boolean;
}

/**
 * Locate the designated kiosk default operator.
 *
 * Only an explicitly designated operator (is_kiosk_default = TRUE, set by a
 * sysadmin under Gates → Default Gate Operator) may receive a kiosk session.
 * No implicit fallback — an operator with no assigned gate must be assigned
 * before they can sign in at a gate kiosk. Returns null otherwise (404).
 */
export async function findKioskDefaultOperator(): Promise<KioskOperatorRow | null> {
  const res = await query<KioskOperatorRow>(
    `SELECT id, unique_id, name, email, role, status, gate_id,
            COALESCE(session_version, 0) AS session_version,
            COALESCE(is_kiosk_default, FALSE) AS is_kiosk_default
       FROM public.users
      WHERE is_kiosk_default = TRUE
        AND status = 'ACTIVE'
        AND role = 'operator'
      ORDER BY created_at ASC
      LIMIT 1`
  );
  return res.rows[0] ?? null;
}

/**
 * Resolve which gate a kiosk session should be bound to.
 * Prefers the ?gateId= param; falls back to the operator's assigned gate.
 * Returns null if no active gate can be determined.
 */
export async function resolveKioskGateId(
  requestedGateId: string | null,
  operatorGateId: string | null
): Promise<{ gateId: string; gateName: string } | null> {
  const candidates: string[] = [];
  if (requestedGateId) candidates.push(requestedGateId);
  if (operatorGateId && operatorGateId !== requestedGateId) candidates.push(operatorGateId);

  for (const gid of candidates) {
    const res = await query<{ id: string; name: string; is_active: boolean }>(
      `SELECT id, name, is_active FROM public.gates WHERE id = $1`,
      [gid]
    );
    const gate = res.rows[0];
    if (gate && gate.is_active) {
      return { gateId: gate.id, gateName: gate.name };
    }
  }
  return null;
}

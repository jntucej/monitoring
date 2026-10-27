import { query } from "@/lib/postgres";
import bcrypt from "bcryptjs";

export interface KioskOperatorRow {
  id: string;
  unique_id: string;
  name: string;
  email: string | null;
  role: string;
  status: string;
  gate_id: string | null;
  supervised_gates: string[] | null;
  session_version: number;
  is_kiosk_default: boolean;
  /** bcrypt hash of the operator's login credential (used to verify the kiosk PIN). */
  password_hash: string | null;
}

/**
 * Verify a kiosk PIN (which doubles as the operator's password, since we are
 * password-only) against the operator's stored bcrypt hash.
 *
 * Fail-closed: if the operator has no password_hash on file, reject the
 * session (a kiosk operator without credentials cannot mint a session in
 * PIN_REQUIRED mode).
 */
export async function verifyKioskPin(
  operator: KioskOperatorRow,
  pin: string
): Promise<boolean> {
  if (!operator.password_hash || pin.length === 0) return false;
  try {
    return await bcrypt.compare(pin, operator.password_hash);
  } catch {
    return false;
  }
}

/**
 * Locate ALL designated kiosk default operators.
 *
 * Only an explicitly designated operator (is_kiosk_default = TRUE, set by a
 * sysadmin under Gates → Default Gate Operator) may receive a kiosk session.
 * Returns the full matching set — the caller decides what ZERO (misconfigured:
 * no designated operator) or MORE THAN ONE (ambiguous) mean (503 per spec).
 */
export async function findKioskDefaultOperators(): Promise<KioskOperatorRow[]> {
  const res = await query<KioskOperatorRow>(
    `SELECT id, unique_id, name, email, role, status, gate_id,
            supervised_gates,
            COALESCE(session_version, 0) AS session_version,
            COALESCE(is_kiosk_default, FALSE) AS is_kiosk_default,
            password_hash
       FROM public.users
      WHERE is_kiosk_default = TRUE
        AND status = 'ACTIVE'
        AND role = 'operator'
      ORDER BY created_at ASC`
  );
  return res.rows;
}

/** Compat wrapper: first matching operator, or null when none exist. */
export async function findKioskDefaultOperator(): Promise<KioskOperatorRow | null> {
  const rows = await findKioskDefaultOperators();
  return rows[0] ?? null;
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

/**
 * Resolve the gate for a kiosk session, validating the requested gateId as a
 * HINT (never trust the body/query):
 *   - requested gateId is allowed only if it equals the operator's
 *     users.gate_id OR is contained in their supervised_gates array;
 *   - no hint (or an invalid hint) → fall back to operator.gate_id;
 *   - the resolved gate must exist in gates and be is_active.
 * Returns null when no active gate can be determined.
 */
export async function resolveKioskGateIdForOperator(
  operator: KioskOperatorRow,
  requestedGateId: string | null
): Promise<{ gateId: string; gateName: string } | null> {
  let candidate: string | null = null;

  if (requestedGateId) {
    const supervised = Array.isArray(operator.supervised_gates)
      ? operator.supervised_gates
      : [];
    if (
      (operator.gate_id !== null && requestedGateId === operator.gate_id) ||
      supervised.includes(requestedGateId)
    ) {
      candidate = requestedGateId;
    }
  }
  if (!candidate && operator.gate_id) {
    candidate = operator.gate_id;
  }
  if (!candidate) return null;

  const res = await query<{ id: string; name: string; is_active: boolean }>(
    `SELECT id, name, is_active FROM public.gates WHERE id = $1`,
    [candidate]
  );
  const gate = res.rows[0];
  if (gate && gate.is_active) {
    return { gateId: gate.id, gateName: gate.name };
  }
  return null;
}

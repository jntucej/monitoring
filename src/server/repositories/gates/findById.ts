import { query } from "@/lib/postgres";

export interface GateRow {
  id: string;
  gate_code: string;
  name: string;
  location: string;
  is_active: boolean;
  latitude: number | null;
  longitude: number | null;
  allowed_radius_meters: number | null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolve a gate by either its UUID id or its gate_code.
 *
 * The operator UI navigates by gate code (e.g. /gate/1, /gate/MAIN); setGate
 * normalises bare-numeric codes to `gate-<n>` which is not a valid UUID. This
 * helper first tries an exact UUID match (cheap + unambiguous), then falls
 * back to a gate_code match, stripping a `gate-` prefix from the lookup value
 * so `gate-1` → gate_code `1` and `MAIN` → gate_code `MAIN` both resolve.
 */
export async function findGateById(id: string): Promise<GateRow | null> {
  const isUuid = UUID_RE.test(id);
  if (isUuid) {
    const { rows } = await query<GateRow>(
      `SELECT id, gate_code, name, location, is_active,
              latitude, longitude, allowed_radius_meters
         FROM gates WHERE id = $1`,
      [id],
    );
    if (rows[0]) return rows[0];
  }

  // Fallback: match on gate_code. Strip a leading "gate-" token so the
  // normalised operator-store form ("gate-1") still resolves to code "1".
  const codeCandidates = [id, id.replace(/^gate-/i, "")].filter(
    (c) => c.length > 0 && c !== id,
  );
  if (codeCandidates.length === 0) return null;

  const { rows } = await query<GateRow>(
    `SELECT id, gate_code, name, location, is_active,
            latitude, longitude, allowed_radius_meters
       FROM gates WHERE upper(gate_code) = upper($1) OR upper(gate_code) = upper($2)
       LIMIT 1`,
    [id, codeCandidates[0]],
  );
  return rows[0] ?? null;
}

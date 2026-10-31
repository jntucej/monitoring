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
export interface FindGateOpts {
  /**
   * RLS GUCs to set for this read. The `gates` table has row-level security
   * for the `gate_app` role; when the app connects as gate_app, a SELECT that
   * carries no GUC context sees zero rows. Operator surfaces (gate-scan / entry-type)
   * pass the caller's identity so the `gates_gate_app_select` policy can match.
   */
  currentUserId?: string;
  currentRole?: string;
}

export async function findGateById(id: string, opts: FindGateOpts = {}): Promise<GateRow | null> {
  const isUuid = UUID_RE.test(id);
  if (isUuid) {
    const { rows } = await query<GateRow>(
      `SELECT id, gate_code, name, location, is_active,
              latitude, longitude, allowed_radius_meters
         FROM gates WHERE id = $1`,
      [id],
      opts,
    );
    if (rows[0]) return rows[0];
  }

  // Fallback: match on gate_code. Strip a leading "gate-" token so the
  // normalised operator-store form ("gate-1") still resolves to code "1".
  //
  // The original `id` is ALWAYS a valid candidate (covers bare codes like
  // "MAIN" that have no gate- prefix, where the stripped form equals id and
  // the old filter would have emptied the list). We only de-dupe; the SELECT
  // below matches on upper($1) OR upper($2) with $1 = id.
  const stripped = id.replace(/^gate-/i, "");
  const codeCandidates = stripped !== id && stripped.length > 0
    ? [id, stripped]
    : [id];

  const { rows } = await query<GateRow>(
    `SELECT id, gate_code, name, location, is_active,
            latitude, longitude, allowed_radius_meters
       FROM gates WHERE upper(gate_code) = upper($1) OR upper(gate_code) = upper($2)
       LIMIT 1`,
    [id, codeCandidates[1] ?? id],
    opts,
  );
  return rows[0] ?? null;
}

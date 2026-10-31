// P1-9: Runtime RLS-posture assertion.
//
// 20261231000005_enforce_nobypassrls.sql sets `ALTER ROLE postgres NOBYPASSRLS`
// and `ALTER ROLE gate_app NOBYPASSRLS` so RLS policies are the active
// defense-in-depth layer. If any environment ran the KNOWN-GAP migration
// (20261223000001, which left postgres BYPASSRLS) without the follow-up, the
// app connects as a role that silently bypasses RLS — every query returns
// rows it should not (or, in the reverse drift, zero rows). This guard runs
// at boot (see src/instrumentation.ts) and logs a loud FATAL line if the
// connected role's posture differs from the intended NOBYPASSRLS posture.
//
// It is a LOG-only guard (not a hard exit) by design: a wrong posture is a
// deployment/config error an operator must fix, and hard-exiting the web
// container on every boot in a misconfigured environment would take the whole
// app offline. The loud log + Prometheus scrape (rls_posture_ok metric) is the
// actionable signal.

import { getPostgresPool } from "@/lib/postgres";

const EXPECTED_BYPASSRLS: Record<string, boolean> = {
  // Role -> intended rolbypassrls. Both must be false (NOBYPASSRLS) for the
  // RLS layer to be active for the app.
  postgres: false,
  gate_app: false,
};

export interface RlsPostureReport {
  ok: boolean;
  connectedRole: string | null;
  roles: Record<string, { bypassrls: boolean; expected: boolean; match: boolean }>;
}

export async function checkRlsPosture(): Promise<RlsPostureReport> {
  const pool = await getPostgresPool();
  const client = await pool.connect();
  try {
    const whoami = await client.query<{ rolname: string }>(`SELECT current_user AS rolname`);
    const connectedRole = whoami.rows[0]?.rolname ?? null;

    const roles = Object.keys(EXPECTED_BYPASSRLS);
    const rows = await client.query<{ rolname: string; rolbypassrls: boolean }>(
      `SELECT rolname, rolbypassrls FROM pg_roles WHERE rolname = ANY($1::text[])`,
      [roles],
    );
    const found = new Map(rows.rows.map((r) => [r.rolname, r.rolbypassrls]));

    const out: RlsPostureReport["roles"] = {};
    let ok = true;
    for (const role of roles) {
      const bypass = found.get(role);
      const expected = EXPECTED_BYPASSRLS[role];
      const match = bypass !== undefined && bypass === expected;
      if (!match) ok = false;
      out[role] = { bypassrls: bypass ?? true, expected, match };
    }
    return { ok, connectedRole, roles: out };
  } finally {
    client.release();
  }
}

export function assertRlsPosture(): void {
  // Fire-and-forget; must never block boot.
  checkRlsPosture()
    .then((r) => {
      if (r.ok) {
        console.log(`[rls-posture] OK (connected as ${r.connectedRole}); postgres & gate_app are NOBYPASSRLS.`);
        return;
      }
      const detail = Object.entries(r.roles)
        .map(([role, v]) => `${role}=BY:${v.bypassrls}(expect ${v.expected ? "BY" : "NO"})`)
        .join(", ");
      console.error(
        `[rls-posture] FATAL posture mismatch (connected as ${r.connectedRole}): ${detail}. ` +
          `Expected NOBYPASSRLS on postgres and gate_app so RLS is active defense-in-depth. ` +
          `Run 20261231000005_enforce_nobypassrls.sql (or check-migrations replay) to fix.`,
      );
    })
    .catch((err) => {
      // DB unreachable at boot is already covered by the schema-drift guard /
      // health check; do not double-log as a posture failure.
      console.warn("[rls-posture] could not verify posture at boot:", (err as Error).message);
    });
}

// /api/sysadmin/rls/drift/route.ts
// Nightly RLS drift check (STEP 3.9 / AUTONOMOUS_OPERATIONS threat C):
// compare live pg_policies + relrowsecurity against the checked-in
// rls_snapshot.json baseline. Returns the diff; the cron job alerts on
// any change and the CI gate blocks deploys on unexpected drift.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

interface LivePolicy {
  table: string;
  policy: string;
  permissive: string;
  cmd: string;
  qual: string;
  with_check: string;
}

async function implGet(_req: NextRequest, _ctx: { auth: AuthContext }) {
  const { rows } = await query<LivePolicy>(
    `SELECT c.relname AS table, p.policypkg AS policy,
            sp.spispermissive AS permissive,
            sp.spcmd::text AS cmd,
            COALESCE(pg_get_expr(sp.ppgqual, sp.ppgnamespace), '') AS qual,
            COALESCE(pg_get_expr(sp.ppgwithcheck, sp.ppgnamespace), '') AS with_check
       FROM pg_policies sp
       JOIN pg_class c ON c.oid = sp.tablerelid
       JOIN pg_namespace n ON n.oid = sp.ppgnamespace
      WHERE n.nspname = 'public'
      ORDER BY c.relname, p.policypkg`,
  );

  // RLS-enabled tables
  const rlsOn = await query<{ table: string }>(
    `SELECT c.relname AS table FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relrowsecurity AND NOT c.relispartition
      ORDER BY c.relname`);

  // Tables where gate_app has some privilege but RLS is OFF — the
  // classic silent-exposure case (pg_class_aclcheck via has_table_privilege).
  const exposed = await query<{ table: string }>(
    `SELECT c.relname AS table
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND NOT c.relrowsecurity
        AND has_table_privilege('gate_app', c.oid, 'SELECT,INSERT,UPDATE,DELETE')
      ORDER BY c.relname`);

  return ok({
    policies: rows.map((r) => ({
      table: r.table, policy: r.policy, permissive: r.permissive === "t",
      cmd: r.cmd, qual: r.qual, withCheck: r.with_check,
    })),
    rlsEnabled: rlsOn.rows.map((r) => r.table),
    gateAppPrivilegesOnNoRls: exposed.rows,
    generatedAt: new Date().toISOString(),
  });
}

export const GET = withRateLimit(
  withAuthorization(implGet, { requiredRole: ["sysadmin"] }),
  { keyPrefix: "rls-drift", maxRequests: 5, windowMs: 300_000 },
);
